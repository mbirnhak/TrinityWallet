// services/Transaction/credentialPresentation.ts
import * as Crypto from 'expo-crypto';
import base64url from 'base64url';
import { createSdJwt, SdJwt } from '../Credentials/SdJwtVc';
import { CredentialStorage } from '../credentialStorage';
import { getDbEncryptionKey } from '../Utils/crypto';
import LogService from '../LogService';
import { Validator } from 'jsonschema';
import * as jose from 'jose'
import * as Linking from "expo-linking";
import { JWK, CryptoKey } from 'react-native-quick-crypto/lib/typescript/src/keys';
import { Alert } from 'react-native';

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

type credentialMatches = {
    credential_ids: number[];
    requested_claims: string[];
}

interface SelectedCredential {
    credential_ID: number;
    attributes: string[];
}

export async function retrieve_authorization_request(request_uri: string, client_id: string) {
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

        if (client_id == TRIN_LIB_SERVER_ID) {
            await logService.createLog({
                transaction_type: 'credential_presentation',
                status: 'pending',
                details: 'Processing internal library server request',
                relying_party: TRIN_LIB_SERVER_ID
            });
            const status = await trin_send_presentation(await response.json());
            return status;
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

        const status = await send_presentation(decoded_jwt);
        return status;
    } catch (error) {
        console.error('[Auth Request] Error:', error);
        await logService.createLog({
            transaction_type: 'credential_presentation',
            status: 'failed',
            details: `Authorization request retrieval failed: ${error instanceof Error ? error.message : String(error)}`
        });
    }
}

async function trin_send_presentation(presentation_definition: Record<string, any>) {
    console.log(presentation_definition);
    const dbEncryptionKey = await getDbEncryptionKey();
    const storage = new CredentialStorage(dbEncryptionKey);
    try {
        await logService.createLog({
            transaction_type: 'credential_presentation',
            status: 'pending',
            details: 'Processing internal presentation',
            relying_party: TRIN_LIB_SERVER_ID
        });
        const credential_string = await storage.retrieveCredentialByJsonPathValue('$.vct', 'trin.coll.student_id_sd_jwt_vc')
        if (credential_string == null) {
            console.log("No matching student credential");
            Alert.alert("No matching student credential", "Please make sure you have a student credential in your wallet.");
            return false;
        }
        const sdJwt = await createSdJwt();
        const disclosureFrame = {
            'studentId': true
        }
        const presentation = await sdJwt.presentCredential(credential_string, disclosureFrame);
        const presentation_body = JSON.stringify({
            credential: presentation
        })
        const response = await fetch(presentation_definition.callback_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: presentation_body
        })
        console.log("RESPONSE", response);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        let status;
        if (data.status === 'success') {
            await logService.createLog({
                transaction_type: 'credential_presentation',
                status: 'success',
                details: 'Internal presentation completed',
                relying_party: TRIN_LIB_SERVER_ID
            });
            status = true;
        } else {
            console.log('Verification failed:', data.message);
            await logService.createLog({
                transaction_type: 'credential_presentation',
                status: 'failed',
                details: 'Internal presentation comlpleted with error: ' + data.message,
                relying_party: TRIN_LIB_SERVER_ID
            });
            status = false;
        }
        const redirectUrl = data.redirect_url;
        await Linking.openURL(redirectUrl);
        return status;
    } catch (error) {
        console.error('[Presentation] Error with internal presentation:', error);
        await logService.createLog({
            transaction_type: 'credential_presentation',
            status: 'failed',
            details: `Internal presentation failed: ${error instanceof Error ? error.message : String(error)}`,
            relying_party: TRIN_LIB_SERVER_ID
        });
        return null;
    }
}

async function send_presentation(decoded_jwt: Record<string, unknown>) {
    const response_uri = decoded_jwt.response_uri as string;
    const client_id = decoded_jwt.client_id as string;
    const state = decoded_jwt.state as string;
    let presentation_definition = decoded_jwt.presentation_definition as Record<string, unknown>;
    if (presentation_definition === undefined) {
        const presentation_response = await fetch(decoded_jwt.presentation_definition_uri as string);
        presentation_definition = await presentation_response.json();
        if (!presentation_response.ok || presentation_definition === undefined) {
            console.error("Failed to fetch presentation definition: ", presentation_response.status);
            throw new Error(`Failed to fetch presentation definition: ${presentation_response.status}`);
            return false;
        }
        console.log("Presentation definition: ", presentation_definition);
    }
    const presentation_definition_id = presentation_definition.id as string;
    const input_descriptors = presentation_definition.input_descriptors as Record<string, unknown>[];
    const response_mode = decoded_jwt.response_mode as string;
    const client_metadata = decoded_jwt.client_metadata as Record<string, unknown>;
    const nonce = decoded_jwt.nonce as string;

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

    let vp_token: string | string[] = [];

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
    let descriptor_map_path: number = 0;
    /**
     * Each descriptor represents a different credential requested.
     * For each descriptor, find the matching credentials in the wallet.
     * The descriptor id is used to identify the credential in the presentation submission.
     */
    for (const descriptor of input_descriptors) {
        console.log("Descriptor: ", descriptor);
        const descriptor_name = descriptor.name as string;
        const descriptor_purpose = descriptor.purpose as string;
        all_info_requested.push({
            name: descriptor_name,
            purpose: descriptor_purpose
        });
        let matches = await findMatchingCredentials(descriptor);

        /**
         * findMatchingCredentials() only returns null if no fields are found in the descriptor.
         * If no fields are found we can return credentials based on the format in the presentation definition (or descriptor),
         * but we DO NOT provide any claims to the verifier. This is because they are not specified in the descriptor, and may
         * just want to see possesion of a credential of a certain type.
         *  */

        if (matches === null) {
            console.log("No fields found in descriptor: ", descriptor);
            let formats = descriptor?.format && typeof descriptor.format === 'object' ? Object.keys(descriptor.format) : [];
            if (formats.length === 0) {
                formats = presentation_definition?.format as string[];
            }
            // Initialize db connection
            const dbEncryptionKey = await getDbEncryptionKey();
            const storage = new CredentialStorage(dbEncryptionKey);
            // TODO: Loop through formats until we find a match
            // For now, just use the first format
            const match_by_format = await storage.retrieveCredentialByFormat(formats[0]);
            matches = {
                credential_ids: match_by_format === null ? [] : match_by_format.map((c) => c.credential_id),
                requested_claims: []
            }
        }

        if (matches.credential_ids.length === 0) {
            console.log("No matching credentials found for descriptor: ", descriptor);
            await logService.createLog({
                transaction_type: 'credential_presentation',
                status: 'failed',
                details: `No matching credentials found for: ${descriptor_name || 'unnamed'}`,
                relying_party: client_id as string
            });
            continue;
        }
        const input_descriptor_id = descriptor.id;
        presentation_submission.descriptor_map.push({
            "id": input_descriptor_id as string,
            "format": "vc+sd-jwt", // Temporary, we will use the format stored with the credential
            "path": `$[${descriptor_map_path}]` // Set path to the index of the descriptor
        })
        descriptor_map_path++;
        // For now, we will just use the first credential string that matched. Later we can have the user select which credential to use.
        vp_token.push(await generateVpToken(matches.credential_ids[0], matches.requested_claims, client_id, nonce));
    }

    if (vp_token.length === 0) {
        console.log("No matching credentials found");
        return;
    } else if (vp_token.length === 1) {
        vp_token = vp_token[0];
        presentation_submission.descriptor_map[0].path = "$"; // Set path to "$" if only one descriptor
    }


    const presentation_body = await generatePresentationBody(response_mode, state, presentation_submission, vp_token, client_metadata, nonce);
    if (presentation_body === "") {
        console.log("No presentation body generated");
        return;
    }

    console.log("Presentation body: ", presentation_body);
    console.log("RESPONSE URI: ", response_uri)
    const response = await fetch(response_uri, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: presentation_body
    })
    console.log("Response: ", response);

    try {
        // Check if response is JSON and parse it
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json") && response.ok) {
            const data = await response.json();
            console.log("Data:", data);

            // Check for redirect_uri
            if (data.redirect_uri) {
                console.log("Redirect URI:", data.redirect_uri);
                Linking.openURL(data.redirect_uri);
                return true;
            } else {
                console.log("No redirect_uri found in response JSON.");
                return true;
            }
        } else {
            console.log("Response is not JSON. Content-Type:", contentType);
            if (!response.ok) {
                const errorMsg = `Failed to create presentation: ${response.status}`;
                await logService.createLog({
                    transaction_type: 'credential_presentation',
                    status: 'failed',
                    details: errorMsg
                });
                return false;
            }
        }
    } catch (error) {
        console.error("Error parsing JSON from response:", error);
        return false;
    }
}

export async function presentationQrCode(credentials: SelectedCredential[]) {
    let vp_token: string[] = [];
    const client_id = "None";
    const nonce = "None";
    for (const credential of credentials) {
        vp_token.push(await generateVpToken(credential.credential_ID, credential.attributes, client_id, nonce));
    }
    console.log("VP Token: ", vp_token);
    return vp_token;
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

/**
 * 
 * @param descriptor input descriptor object from input descriptors array in presentation definition.
 * @returns Array of matching credentials and requested claims.
 *          Null if the fields array is empty or not present (DOES NOT MEAN NO MATCHING CREDENTIALS)
 *          Empty array if no matching credentials found or an error occurs.
 */
async function findMatchingCredentials(descriptor: Record<string, any>): Promise<credentialMatches | null> {
    // Initialize db connection
    const dbEncryptionKey = await getDbEncryptionKey();
    const storage = new CredentialStorage(dbEncryptionKey);
    try {
        const v = new Validator();
        const matches_and_requested_claims: credentialMatches = {
            credential_ids: [],
            requested_claims: []
        };
        const fields = descriptor?.constraints?.fields;
        if (!fields || fields?.length === 0) {
            console.log("No fields found in descriptor: ", descriptor);
            const formats = descriptor?.format;
            return null;
        }

        let validCredentialIds: number[] | null = null;
        let allRequestedClaims: string[] = [];
        for (const field of fields) {
            // Returns array of credentials matching one of the paths in the field.
            const credentials = await storage.retrieveCredentialsByJsonPath(field.path as string[]);
            if (!credentials || credentials.length === 0) {
                console.log("No credentials found for path: ", field.path);
                return {
                    credential_ids: [],
                    requested_claims: []
                };
            }

            // Filter for credentials with the claim lowest indexed in the path array
            //      1. Extract unique paths that matched
            //      2. Find the first path that matched (evaluated from 0 index)
            //      3. Filter credentials based on the first path
            const matchingPaths = [...new Set(credentials.map(c => c.matching_path))];
            const firstMatchingPath: string = field.path.find((path: string) => matchingPaths.includes(path));
            const filteredByLowestIndex = credentials.filter((credential) =>
                credential.matching_path === firstMatchingPath
            );

            let currentFieldCredentials;
            const filter = field?.filter;
            if (filter) {
                currentFieldCredentials = filteredByLowestIndex.filter((credential) => {
                    const result = v.validate(credential.matching_value, filter);
                    return result.valid;
                });
                if (currentFieldCredentials.length === 0) {
                    console.log("No credentials found for filter: ", filter);
                    return {
                        credential_ids: [],
                        requested_claims: []
                    };
                }
            } else {
                // No filter, so just use the filtered credentials
                currentFieldCredentials = filteredByLowestIndex;
            }

            // Get credential strings for current field object
            const currentCredentialIds = new Set(currentFieldCredentials.map((c) => c.credential_id));

            // For the first field processed, initialize the validCredentialStrings
            if (validCredentialIds === null) {
                validCredentialIds = Array.from(currentCredentialIds);
            } else {
                // For subsequent fields, only keep the creedential strings that match every field
                validCredentialIds = validCredentialIds.filter((cred: number) => currentCredentialIds.has(cred));
                if (validCredentialIds.length === 0) {
                    console.log("No credentials match all fields, while evaluating: ", field);
                    return {
                        credential_ids: [],
                        requested_claims: []
                    };
                }
            }
            // Add the claims to the allRequestedClaims array
            allRequestedClaims.push(firstMatchingPath);
        }

        console.log("Valid Credential Ids: ", validCredentialIds);
        console.log("All Requested Claims: ", allRequestedClaims);
        return {
            credential_ids: validCredentialIds as number[],
            requested_claims: allRequestedClaims
        };
    } catch (error) {
        console.error("Error finding matching credentials: ", error);
        await logService.createLog({
            transaction_type: 'credential_presentation',
            status: 'failed',
            details: `Error finding matching credentials: ${error instanceof Error ? error.message : String(error)}`
        });
        return {
            credential_ids: [],
            requested_claims: []
        };
    }
}

type kb_payload = {
    iat: number;
    aud: string;
    nonce: string;
}
async function generateVpToken(credential_id: number, claims: string | string[], client_id: string, nonce: string) {
    const kb_payload: kb_payload = {
        "iat": Math.floor(Date.now() / 1000), // The time at which the KB JWT was issued
        "aud": client_id, // The intended receiver of the KB JWT
        "nonce": nonce, // Ensures the freshness of the signature
    };
    const presentation = await generatePresentation(credential_id, claims, kb_payload);
    if (presentation === "") {
        console.log("No presentation generated");
        return "";
    }
    return presentation;
}

async function generatePresentation(credential_id: number, claims: string | string[], kb_payload: kb_payload) {
    // Initialize db connection
    const dbEncryptionKey = await getDbEncryptionKey();
    const storage = new CredentialStorage(dbEncryptionKey);
    try {
        const credential = await storage.retrieveCredentialById(credential_id, ["credential_string", "public_key", "private_key"]);
        if (!credential) {
            return "";
        } else {
            const credential_string = credential[0].credential_string;
            console.log("Credential string: ", credential_string);
            const public_key = credential[0].public_key;
            const private_key = credential[0].private_key;

            // Create an SdJwt instance to use for signing
            const sdJwt = await createSdJwt(private_key, public_key, true);
            let disclosureFrame;
            if (typeof claims === "string") {
                const sanitizedClaim = claims.replace(/^\$\./, ""); // remove "$." prefix
                disclosureFrame = {
                    [sanitizedClaim]: true
                }
            } else {
                disclosureFrame = claims.reduce((acc: Record<string, boolean>, claim: string) => {
                    const sanitizedClaim = claim.replace(/^\$\./, ""); // remove "$." prefix
                    acc[sanitizedClaim] = true;
                    return acc;
                }, {} as Record<string, boolean>);
            }

            console.log("Disclosure frame: ", disclosureFrame);
            const sd_jwt_kb_presentation = await sdJwt.presentCredential(credential_string, disclosureFrame, {
                kb: {
                    payload: kb_payload,
                }
            });
            console.log("Presentation: ", sd_jwt_kb_presentation);
            return sd_jwt_kb_presentation;
        }
    } catch (error) {
        console.error("Error retrieving credential: ", error);
        return "";
    }
}

async function generatePresentationBody(response_mode: string, state: string, presentation_submission: PresentationSubmission, vp_token: string | string[], client_metadata: Record<string, unknown>, nonce: string) {
    const presentation_data = {
        state: state,
        vp_token: vp_token,
        presentation_submission: presentation_submission
    }
    console.log("Presentation data: ", presentation_data);
    console.log("Response mode: ", response_mode);
    if (response_mode === "direct_post") {
        const presentation_data_direct = new URLSearchParams({
            state: state,
            vp_token: Array.isArray(vp_token) ? JSON.stringify(vp_token) : vp_token,
            presentation_submission: JSON.stringify(presentation_submission)
        });
        return presentation_data_direct.toString();
    } else if (response_mode === "direct_post.jwt") {
        try {
            const alg = client_metadata.authorization_encrypted_response_alg as string;
            const enc = client_metadata.authorization_encrypted_response_enc as string;
            let jwks = client_metadata.jwks as Record<"keys", any>;
            if (jwks === undefined) {
                const jwks_uri = client_metadata.jwks_uri as string;
                const jwks_response = await fetch(jwks_uri);
                jwks = await jwks_response.json();
            }
            const key = jwks.keys[0] as JWK;
            const importedKey = await jose.importJWK(key, alg) as CryptoKey;

            const nonce_bytes = new TextEncoder().encode(nonce);
            const presentationDataUint8Array = new TextEncoder().encode(JSON.stringify(presentation_data));
            // Create a JWE with the presentation data as the payload
            const jwe = await new jose.CompactEncrypt(presentationDataUint8Array)
                .setKeyManagementParameters({ apv: nonce_bytes })
                .setProtectedHeader({ alg: alg, enc: enc })
                .encrypt(importedKey)

            console.log("JWE: ", jwe);
            const jwe_encoded_presentation = new URLSearchParams({
                state: state,
                response: jwe
            })
            return jwe_encoded_presentation.toString();
        } catch (error) {
            console.error("Error generating encrypted presentation: ", error);
            return "";
        }
    } else {
        console.log("Response mode not supported: ", response_mode);
        return "";
    }
}