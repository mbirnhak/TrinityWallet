// services/Transaction/credentialPresentation.ts
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import base64url from 'base64url';
import { createSdJwt, SdJwt } from '../Credentials/SdJwtVc';
import { CredentialStorage } from '../credentialStorageTemp';

export async function retrieve_authorization_request(request_uri: string) {
    console.log('[Auth Request] Retrieving authorization request');
    const response = await fetch(request_uri);
    if (!response.ok) {
        throw new Error(`Failed to fetch authorization request: ${response.status}`);
    }
    const encoded_jwt = await response.text();
    const decoded_jwt = await decode_jwt(encoded_jwt);
    await send_presentation(decoded_jwt);
}

async function send_presentation(decoded_jwt: Record<string, unknown>) {
    const response_uri = decoded_jwt.response_uri as string;
    const client_id = decoded_jwt.client_id;
    const state = decoded_jwt.state;
    const presentation_definition = decoded_jwt.presentation_definition as Record<string, unknown>;
    const presentation_definition_id = presentation_definition.id;
    const input_descriptors = presentation_definition.input_descriptors as Record<string, unknown>[]

    const input_descriptor_id = input_descriptors[0].id;

    const response_mode = decoded_jwt.response_mode;
    const client_metadata = decoded_jwt.client_metadata;
    const nonce = decoded_jwt.nonce;

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
    for (const descriptor of input_descriptors) {
        console.log("Descriptor: ", descriptor);
        const matches = findMatchingCredentials(descriptor);
        // const sd_jwt_presentation = generatePresentation();
    }

    const presentation_submission = {
        "id": Crypto.randomUUID(),
        "definition_id": presentation_definition_id,
        "descriptor_map": [
            {
                "id": input_descriptor_id,
                "format": "vc+sd-jwt",
                "path": "$"
            }
        ]
    }

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
}

async function decode_jwt(encoded_jwt: string) {
    // Split the JWT parts
    const parts = encoded_jwt.split('.');
    if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
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
            throw new Error("Keys not found in secure storage");
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
            throw new Error("JWT signature could not be generated");
        }

        // Encode the signature and create the full JWT
        const encodedSignature = base64url(signature);
        const jwt = `${signingInput}.${encodedSignature}`;

        console.log('[KB-JWT] Generated JWT:', jwt.substring(0, 50) + '...');
        return jwt;
    } catch (error) {
        console.error('[KB-JWT] Error creating Key Binding JWT:', error);
        throw error;
    }
}

async function findMatchingCredentials(descriptor: Record<string, unknown>) {
    
}

async function generateDescriptorMap() {

}

async function generatePresentation(credential_type: string | string[], claims: string | string[]) {
    const credential = await CredentialStorage.retrieveCredential('jwt_vc');
    if (!credential) {
        return null;
    }
    console.log("Credential: ", credential)
    const privateKey_string = await SecureStore.getItemAsync("priv-key");
    const publicKey_string = await SecureStore.getItemAsync("pub-key");
    if (!privateKey_string || !publicKey_string) {
        return null;
    }
    const privateKey = JSON.parse(privateKey_string);
    console.log("Priv Key: ", privateKey)
    const publicKey = JSON.parse(publicKey_string);
    const sdjwt = await createSdJwt(privateKey, publicKey);

    const disclosureFrame = {
        "given_name": true,
        "family_name": true
    };

    const sd_jwt_presentation = await sdjwt.presentCredential(credential, disclosureFrame);
    console.log("Presentation: ", sd_jwt_presentation);
}