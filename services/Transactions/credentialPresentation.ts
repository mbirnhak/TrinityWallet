// services/Transaction/credentialPresentation.ts
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import base64url from 'base64url';
import { createSdJwt, SdJwt } from '../Credentials/SdJwtVc';
import { CredentialStorage } from '../credentialStorage';
import { storedValueKeys } from '../Utils/enums';
import { getDbEncryptionKey } from '../Utils/crypto';
import LogService from '../LogService';
import { Validator } from 'jsonschema';

const TRIN_LIB_SERVER_ID = 'lib-verification-service-123';

// Initialize LogService
const logService = LogService.getInstance();
logService.initialize().catch(error => {
  console.error("Failed to initialize LogService in credential presentation:", error);
});

type DescriptorMap = {
    id: string;
    format: string;
    path: string;
}

type PresentationSubmission = {
    id: string;
    definition_id: string;
    descriptor_map: DescriptorMap[];
}

export async function retrieve_authorization_request(request_uri: string) {
    console.log('[Auth Request] Retrieving authorization request');
    try {
        await logService.createLog({
            transaction_type: 'credential_presentation',
            status: 'pending',
            details: 'Retrieving authorization request',
        });

        const response = await fetch(request_uri);
        if (!response.ok) {
            const errorMsg = `Failed to fetch authorization request: ${response.status}`;
            await logService.createLog({
                transaction_type: 'credential_presentation',
                status: 'failed',
                details: errorMsg
            });
            throw new Error(errorMsg);
        }
        
        const client_id = await SecureStore.getItemAsync(storedValueKeys.VERIFIER_CLIENT_ID_KEY);
        if (client_id == TRIN_LIB_SERVER_ID) {
            await logService.createLog({
                transaction_type: 'credential_presentation',
                status: 'pending',
                details: 'Processing internal library server request',
                relying_party: TRIN_LIB_SERVER_ID
            });
            trin_send_presentation(await response.json());
        }
        
        const encoded_jwt = await response.text();
        const decoded_jwt = await decode_jwt(encoded_jwt);
        
        // Extract verifier info for logging
        const verifier = decoded_jwt.client_id || 'Unknown Verifier';
        
        await logService.createLog({
            transaction_type: 'credential_presentation',
            status: 'pending',
            details: 'Authorization request decoded, preparing presentation',
            relying_party: verifier
        });
        
        await send_presentation(decoded_jwt);
    } catch (error) {
        console.error('[Auth Request] Error:', error);
        await logService.createLog({
            transaction_type: 'credential_presentation',
            status: 'failed',
            details: `Authorization request retrieval failed: ${error instanceof Error ? error.message : String(error)}`
        });
    }
}

async function trin_send_presentation(presentation_definition: JSON) {
    try {
        await logService.createLog({
            transaction_type: 'credential_presentation',
            status: 'pending',
            details: 'Processing internal presentation',
            relying_party: TRIN_LIB_SERVER_ID
        });
        
        // Implementation to be added
        
        await logService.createLog({
            transaction_type: 'credential_presentation',
            status: 'success',
            details: 'Internal presentation completed',
            relying_party: TRIN_LIB_SERVER_ID
        });
    } catch (error) {
        console.error('[Presentation] Error with internal presentation:', error);
        await logService.createLog({
            transaction_type: 'credential_presentation',
            status: 'failed',
            details: `Internal presentation failed: ${error instanceof Error ? error.message : String(error)}`,
            relying_party: TRIN_LIB_SERVER_ID
        });
    }
}

async function send_presentation(decoded_jwt: Record<string, unknown>) {
    try {
        const response_uri = decoded_jwt.response_uri as string;
        const client_id = decoded_jwt.client_id;
        const state = decoded_jwt.state;
        const presentation_definition = decoded_jwt.presentation_definition as Record<string, unknown>;
        const presentation_definition_id = presentation_definition.id as string;
        const input_descriptors = presentation_definition.input_descriptors as Record<string, unknown>[]

        const response_mode = decoded_jwt.response_mode;
        const client_metadata = decoded_jwt.client_metadata;
        const nonce = decoded_jwt.nonce;

        /**
         * Not required to be included in presentation definition.
         * If present, show these to user.
         */
        const presentation_name = presentation_definition?.name;
        const presentation_purpose = presentation_definition?.purpose;

        /**
         * Not required to be included in presentation definition .
         * This field specifies the algorithms/proof type supported for the specified
         * credential format. We will not use it and assume for our formats (SD-JWT) 
         * the algorithms we use are supported as they are common.
         * */
        const presentation_format = presentation_definition?.format;

        const presentation_submission: PresentationSubmission = {
            "id": Crypto.randomUUID(),
            "definition_id": presentation_definition_id,
            "descriptor_map": []
        }

        await logService.createLog({
            transaction_type: 'credential_presentation',
            status: 'pending',
            details: `Processing presentation request: ${presentation_name || presentation_purpose || 'Unnamed request'}`,
            relying_party: client_id as string
        });

        type info_requested = {
            name: string;
            purpose: string;
        };
        // Information to be shown to user
        const all_info_requested: info_requested[] = [];
        /**
         * Each descriptor represents a different credential requested.
         * Each descriptor contains "constratins" and constraints contains fields[].
         * Each value in fields[] represents an attribute requested from that credential type.
         * Each attribute is described by a path[] and filter. Filter.constant defines the ID of the cred requested.
         * path[0] represents the location of that attribute (and the attriubte name) on the credential.
         * 
         * Search credentials based on JSONPath (to see if any match), then use filter property if its there (its optional) to filter results.
         * 
         */
        for (const descriptor of input_descriptors as Record<string, any>[]) {
            console.log("Descriptor: ", descriptor);
            const descriptor_name = descriptor.name as string;
            const descriptor_purpose = descriptor.purpose as string;
            all_info_requested.push({
                name: descriptor_name,
                purpose: descriptor_purpose
            });
            const matches = await findMatchingCredentials(descriptor);

            if (matches === null) {
                console.log("No fields found in descriptor: ", descriptor);
                await logService.createLog({
                    transaction_type: 'credential_presentation',
                    status: 'failed',
                    details: `No fields found in descriptor: ${descriptor_name || 'unnamed'}`,
                    relying_party: client_id as string
                });
                
                let formats = Object.keys(descriptor?.format);
                if (!formats) {
                    formats = presentation_definition?.format as string[];
                }

                // TODO: Search for credentials based on format in presentation definition.
            }
            else if (matches.credential_string.length === 0) {
                console.log("No matching credentials found for descriptor: ", descriptor);
                await logService.createLog({
                    transaction_type: 'credential_presentation',
                    status: 'failed',
                    details: `No matching credentials found for: ${descriptor_name || 'unnamed'}`,
                    relying_party: client_id as string
                });
                return;
            }
            const input_descriptor_id = descriptor.id;
            const descriptor_map_format = descriptor.format as string;
            const descriptor_map_path = descriptor.path as string;
            presentation_submission.descriptor_map.push({
                "id": input_descriptor_id as string,
                "format": descriptor_map_format,
                "path": descriptor_map_path
            })
            // const sd_jwt_presentation = generatePresentation();
        }

        await logService.createLog({
            transaction_type: 'credential_presentation',
            status: 'success',
            details: `Presentation prepared with ${presentation_submission.descriptor_map.length} descriptor(s)`,
            relying_party: client_id as string
        });

        // const params = new URLSearchParams({
        //     response_type: 'code'
        // });

        // const response = fetch(response_uri, {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/x-www-form-urlencoded'
        //     },
        //     body: params.toString()
        // })
    } catch (error) {
        console.error('[Presentation] Error:', error);
        await logService.createLog({
            transaction_type: 'credential_presentation',
            status: 'failed',
            details: `Presentation failed: ${error instanceof Error ? error.message : String(error)}`
        });
    }
}

async function decode_jwt(encoded_jwt: string) {
    // Split the JWT parts
    const parts = encoded_jwt.split('.');
    if (parts.length !== 3) {
        const error = 'Invalid JWT format';
        await logService.createLog({
            transaction_type: 'credential_presentation',
            status: 'failed',
            details: error
        });
        throw new Error(error);
    }

    // Decode the payload part (second part)
    const payloadBase64 = parts[1];
    const payloadJson = base64url.decode(payloadBase64);
    const payload = JSON.parse(payloadJson);

    console.log('[Auth Request] Decoded payload:', payload);
    return payload;
}

async function createKbJwt(aud: string, sdHash: string, nonce: string): Promise<string> {
    try {
        console.log('[KB-JWT] Creating Key Binding JWT');

        // Get stored key pair or generate a new one if needed
        const privateKeyJson = await SecureStore.getItemAsync("priv-key");
        const publicKeyJson = await SecureStore.getItemAsync("pub-key");

        if (!privateKeyJson || !publicKeyJson) {
            const error = "Keys not found in secure storage";
            await logService.createLog({
                transaction_type: 'credential_presentation',
                status: 'failed',
                details: error
            });
            throw new Error(error);
        }

        const privateKey = JSON.parse(privateKeyJson);
        const publicKey = JSON.parse(publicKeyJson);

        // Create JWT header
        const header = {
            "typ": "kb+jwt",
            "alg": "ES256"
        };

        // Create payload with required claims
        const payload = {
            "iat": Math.floor(Date.now() / 1000), // The time at which the KB JWT was issued
            "aud": aud, // The intended receiver of the KB JWT
            "nonce": nonce, // Ensures the freshness of the signature
            "sd_hash": sdHash // The base64url-encoded hash value over the SD-JWT
        };

        // Create the signing input (header.payload)
        const encodedHeader = base64url(JSON.stringify(header));
        const encodedPayload = base64url(JSON.stringify(payload));
        const signingInput = `${encodedHeader}.${encodedPayload}`;

        // Create an SdJwt instance to use for signing
        const sdJwt = await createSdJwt(privateKey, publicKey);

        // Sign the input
        const signature = await sdJwt.signJwt(signingInput);
        if (!signature) {
            const error = "JWT signature could not be generated";
            await logService.createLog({
                transaction_type: 'credential_presentation',
                status: 'failed',
                details: error
            });
            throw new Error(error);
        }

        // Encode the signature and create the full JWT
        const encodedSignature = base64url(signature);
        const jwt = `${signingInput}.${encodedSignature}`;

        console.log('[KB-JWT] Generated JWT:', jwt.substring(0, 50) + '...');
        return jwt;
    } catch (error) {
        console.error('[KB-JWT] Error creating Key Binding JWT:', error);
        await logService.createLog({
            transaction_type: 'credential_presentation',
            status: 'failed',
            details: `Error creating Key Binding JWT: ${error instanceof Error ? error.message : String(error)}`
        });
        throw error;
    }
}

type credentialMatches = {
    credential_string: string[];
    requested_claims: string[];
}
/**
 * 
 * @param descriptor input descriptor object from input descriptors array in presentation definition.
 * @returns Array of matching credentials if any are found.
 *          Null if the fields array is empty or not present (DOES NOT MEAN NO MATCHING CREDENTIALS)
 *          Empty array if no matching credentials found or an error occurs.
 */
async function findMatchingCredentials(descriptor: Record<string, any>): Promise<credentialMatches | null> {
    // Initialize db connection
    const dbEncryptionKey = await getDbEncryptionKey();
    const storage = new CredentialStorage(dbEncryptionKey);
    try {
        const v = new Validator();
        const matches_and_req_claims: credentialMatches = {
            credential_string: [],
            requested_claims: []
        };
        const fields = descriptor?.constraints?.fields;
        if (!fields || fields?.length === 0) {
            console.log("No fields found in descriptor: ", descriptor);
            const formats = descriptor?.format;
            return null;
        }
        for (const field of fields) {
            // Returns array of credentials matching one of the paths in the field.
            const credentials = await storage.retrieveCredentialsByJsonPath(field.path as string[]);
            if (!credentials) {
                console.log("No credentials found for path: ", field.path);
                return {
                    credential_string: [],
                    requested_claims: []
                };
            }

            // Filter for credentials with the claim lowest indexed in the path array
            //      1. Extract unique paths that matched
            //      2. Find the first path that matched (evaluated from 0 index)
            //      3. Filter credentials based on the first path
            const matchingPaths = [...new Set(credentials.map(c => c.matching_path))];
            const firstMatchingPath = field.path.find((path: string) => matchingPaths.includes(path));
            const filteredByLowestIndex = credentials.filter((credential) => 
                credential.matching_path === firstMatchingPath
            );

            const filter = field?.filter;
            if (filter) {
                const filteredCredentials = credentials.filter((credential) => {
                    const result = v.validate(credential.credential_claims, filter);
                    return result.valid;
                });
                if (filteredCredentials.length === 0) {
                    console.log("No credentials found for filter: ", filter);
                    return {
                        credential_string: [],
                        requested_claims: []
                    };
                } else {
                    // Use the filtered credentials
                    matches_and_req_claims.credential_string.push(...filteredCredentials.map(c => c.credential_string));
                    matches_and_req_claims.requested_claims.push(firstMatchingPath);
                }
            } else {
                // No filter, so just use the filtered credentials
                matches_and_req_claims.credential_string.push(...filteredByLowestIndex.map(c => c.credential_string));
                matches_and_req_claims.requested_claims.push(firstMatchingPath);
            }
        }
        
        await logService.createLog({
            transaction_type: 'credential_presentation',
            status: 'success',
            details: `Found ${matches_and_req_claims.credential_string.length} matching credential(s) for presentation`
        });
        
        return matches_and_req_claims;
    } catch (error) {
        console.error("Error finding matching credentials: ", error);
        await logService.createLog({
            transaction_type: 'credential_presentation',
            status: 'failed',
            details: `Error finding matching credentials: ${error instanceof Error ? error.message : String(error)}`
        });
        return {
            credential_string: [],
            requested_claims: []
        };
    } finally {
        // Close the database connection if needed
        storage.close();
    }
}

async function generateDescriptorMap() {
    // To be implemented
}

async function generatePresentation(credential_type: string | string[], claims: string | string[]) {
    // const credential = await CredentialStorage.retrieveCredential('jwt_vc');
    // if (!credential) {
    //     return null;
    // }
    // console.log("Credential: ", credential)
    // const privateKey_string = await SecureStore.getItemAsync("priv-key");
    // const publicKey_string = await SecureStore.getItemAsync("pub-key");
    // if (!privateKey_string || !publicKey_string) {
    //     return null;
    // }
    // const privateKey = JSON.parse(privateKey_string);
    // console.log("Priv Key: ", privateKey)
    // const publicKey = JSON.parse(publicKey_string);
    // const sdjwt = await createSdJwt(privateKey, publicKey);

    // const disclosureFrame = {
    //     "given_name": true,
    //     "family_name": true
    // };

    // const sd_jwt_presentation = await sdjwt.presentCredential(credential, disclosureFrame);
    // console.log("Presentation: ", sd_jwt_presentation);
}