// services/Transaction/credentialIssuance.ts
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import base64url from 'base64url';
import { CredentialStorage } from '../credentialStorageTemp';
import { createSdJwt, SdJwt } from '../Credentials/SdJwtVc';
import { JWK } from 'react-native-quick-crypto/lib/typescript/src/keys';
import { storedValueKeys, constants } from '@/services/Utils/enums'

// Constants
const REDIRECT_URI = `${constants.DEEP_LINK_PREFIX}${constants.ISS_PATH}`;

interface CredentialRequest {
    credential_identifier: string;
    format?: string;
    vct?: string;
    proof: {
        proof_type: string;
        jwt: string;
    };
}

interface BatchRequest {
    credential_requests: CredentialRequest[];
}

interface CredentialResponse {
    c_nonce: string;
    c_nonce_expires_in: number;
    credential?: any;
    notification_id?: string;
    transaction_id?: string;
}



/**
 * Generate PKCE challenge pair
 */
async function generatePKCE() {
    console.log('[PKCE] Generating PKCE parameters...');

    // Generate code verifier
    const randomBytes = Crypto.getRandomValues(new Uint8Array(32));
    const verifier = base64url.encode(Buffer.from(randomBytes));

    // Generate code challenge
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data);
    const challenge = base64url.encode(Buffer.from(hash));

    console.log('[PKCE] Code verifier generated:', verifier.slice(0, 10) + '...');
    console.log('[PKCE] Code challenge generated:', challenge.slice(0, 10) + '...');

    await SecureStore.setItemAsync(storedValueKeys.CODE_VERIFIER_KEY, verifier);

    return { verifier, challenge };
}

/**
 * Generate random state
 */
async function generateState() {
    const state = base64url.encode(Buffer.from(Crypto.getRandomValues(new Uint8Array(16))));
    await SecureStore.setItemAsync(storedValueKeys.STATE_KEY, state);
    return state;
}

/**
 * Step 1: Fetch metadata from issuer
 */
async function fetchMetadata() {
    try {
        console.log('[Step 1.a] Fetching OpenID Configuration...');
        const oidcResponse = await fetch(`${constants.ISSUER_URL}/.well-known/openid-configuration`);
        const oidcMetadata = await oidcResponse.json();

        console.log('[Step 1.b] Fetching Credential Issuer metadata...');
        const credResponse = await fetch(`${constants.ISSUER_URL}/.well-known/openid-credential-issuer`);
        const credMetadata = await credResponse.json();

        await SecureStore.setItemAsync(storedValueKeys.METADATA_STORAGE_KEY, JSON.stringify(oidcMetadata));
        return { oidcMetadata, credMetadata };
    } catch (error) {
        console.error('[Metadata] Error:', error);
        throw new Error('Failed to fetch metadata');
    }
}

/**
 * Step 2: Push Authorization Request with PKCE
 */
async function pushAuthorizationRequest(oidcMetadata: any, pkce: { challenge: string }) {
    try {
        console.log('[Step 2] Initiating Push Authorization Request...');

        const state = await generateState();

        // Updated to request both credential types
        const authDetails = [
            {
                type: "openid_credential",
                format: "vc+sd-jwt",
                vct: "eu.europa.ec.eudi.pid_jwt_vc_json"
            },
            {
                type: "openid_credential",
                credential_configuration_id: "eu.europa.ec.eudi.pid_mdoc"
            }
        ];

        const parEndpoint = oidcMetadata.pushed_authorization_request_endpoint;
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: constants.EU_ISSUER_CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            code_challenge: pkce.challenge,
            code_challenge_method: 'S256',
            state: state,
            scope: 'eu.europa.ec.eudi.pid.1 openid',
            authorization_details: JSON.stringify(authDetails)
        });

        const response = await fetch(parEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });

        const parResponse = await response.json();

        return parResponse;
    } catch (error) {
        console.error('[PAR] Error:', error);
        throw new Error('Failed to push authorization request');
    }
}

/**
 * Step 3: Create and open authorization URL
 */
async function initiateAuthorization(oidcMetadata: any, requestUri: string) {
    try {
        console.log('[Step 3] Creating authorization URL...');
        const authUrl = `${oidcMetadata.authorization_endpoint}?client_id=${constants.EU_ISSUER_CLIENT_ID}&request_uri=${requestUri}`;
        await Linking.openURL(authUrl);
    } catch (error) {
        console.error('[Authorization] Error:', error);
        throw new Error('Failed to open authorization URL');
    }
}

/**
 * Extract the issuers public key of a specific algorthim type (AES, RSA, EC, oct)
 * @param issuer_pub_keys Array containing all public keys
 * @param targetKty Key type requested
 * @returns Key matching type requested or undefined
 */
export function findIssuerKeyByType(issuer_pub_keys: { keys: JWK[] }, targetKty: string) {
    const keys = issuer_pub_keys.keys;
    return keys.find(key => key.kty === targetKty);
}

/**
 * Step 4: Handle token exchange
 */
export async function exchangeCodeForToken(code: string, oidcMetadata: any) {
    try {
        console.log('[Step 4] Exchanging code for token...');

        const codeVerifier = await SecureStore.getItemAsync(storedValueKeys.CODE_VERIFIER_KEY);
        const state = await SecureStore.getItemAsync(storedValueKeys.STATE_KEY);

        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI,
            client_id: constants.EU_ISSUER_CLIENT_ID,
            code_verifier: codeVerifier!,
            state: state!
        });

        const response = await fetch(oidcMetadata.token_endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Step 4] Token request failed:', errorText);
            throw new Error(`Token request failed with status: ${response.status}`);
        }
        const tokenResponse = await response.json();

        // Store tokens
        await SecureStore.setItemAsync('access_token', tokenResponse.access_token);
        await SecureStore.setItemAsync('refresh_token', tokenResponse.refresh_token);

        // Request credential with the access token if we have authorization details
        if (tokenResponse.access_token && tokenResponse.authorization_details) {
            try {
                const credentialResponse = await requestCredentialWithToken(
                    tokenResponse.access_token,
                    tokenResponse.authorization_details
                );
                console.log('[Flow] Credential request completed successfully');
                return { tokenResponse, credentialResponse };
            } catch (error) {
                console.error('[Flow] Error during credential request:', error);
                throw error;
            }
        }

        return tokenResponse;
    } catch (error) {
        console.error('[Token] Error:', error);
        throw new Error('Failed to exchange code for token');
    }
}

/**
 * Step 5: Generate JWT proof for credential request
 */
async function generateJWTProof(nonce?: string): Promise<{ jwt: string, sdJwt: SdJwt }> {
    try {
        console.log('[Step 5] Generating JWT proof with nonce:', nonce);
        const sdJwt = await createSdJwt();
        // Generate a key pair for signing
        const { privateKey, publicKey } = sdJwt.getKeyPair();
        SecureStore.setItemAsync("pub-key", JSON.stringify(publicKey));
        SecureStore.setItemAsync("priv-key", JSON.stringify(privateKey));
        console.log("Public Key Generated: ", publicKey)
        console.log("Private Key Generated: ", privateKey)
        // const kid = await jose.calculateJwkThumbprint(publicKey as JWK);  // Use kid instead of embedding key
        const header = {
            typ: "openid4vci-proof+jwt",
            alg: "ES256",
            // kid: kid,  // Use kid instead of embedding key
            jwk: publicKey  // Include the public key in the header
        };
        const payload = {
            iss: constants.EU_ISSUER_CLIENT_ID,
            aud: constants.ISSUER_URL,
            iat: Math.floor(Date.now() / 1000),
            ...(nonce && { nonce }), // Add nonce only if it's defined
            jti: Crypto.randomUUID() // Using our Expo Crypto UUID generator
        };
        const encodedHeader = base64url(JSON.stringify(header));
        const encodedPayload = base64url(JSON.stringify(payload));
        const signingInput = `${encodedHeader}.${encodedPayload}`;

        // Sign payload (sdJwt instance already has the private key)
        const signature = await sdJwt.signJwt(signingInput);
        if (!signature) {
            throw new Error("JWT signature could not be generated");
        }
        const encodedSignature = base64url(signature);
        const jwt = `${signingInput}.${encodedSignature}`;
        console.log('[Step 5] Generated JWT:', jwt);

        return { jwt, sdJwt };
    } catch (error) {
        console.error('[Step 5] Error generating JWT proof:', error);
        throw error;
    }
}

/**
 * Step 6: Request credential using access token
 */
async function requestCredentialWithToken(accessToken: string, authDetails: any): Promise<CredentialResponse> {
    try {
        console.log('[Step 6] ====== Starting Batch Credential Request Flow ======');

        // Step 6.1: Create Initial JWT proof without nonce
        console.log('[Step 6.1] Generating initial JWT proof...');
        const { jwt, sdJwt } = await generateJWTProof();

        // Step 6.2: Initial batch request with proof
        const initialBatchRequest: BatchRequest = {
            credential_requests: [
                {
                    credential_identifier: "eu.europa.ec.eudi.pid_jwt_vc_json",
                    format: "vc+sd-jwt",
                    proof: {
                        proof_type: "jwt",
                        jwt: jwt
                    }
                },
                {
                    credential_identifier: "eu.europa.ec.eudi.pid_mdoc",
                    proof: {
                        proof_type: "jwt",
                        jwt: jwt
                    }
                }
            ]
        };

        const batchResponse = await fetch(`${constants.ISSUER_URL}/batch_credential`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(initialBatchRequest)
        });

        if (!batchResponse.ok) {
            const errorText = await batchResponse.text();
            console.error('[Step 6.2] Initial batch request failed:', errorText);
            throw new Error(`Initial batch request failed with status: ${batchResponse.status}`);
        }

        const responseData = await batchResponse.json();

        // Step 6.5: Store received credentials
        if (responseData.credential_responses?.length > 0) {
            console.log('[Step 6.5] Starting credential storage process...');
            const storageErrors = [];
            const storedCredentials = [];

            for (let i = 0; i < responseData.credential_responses.length; i++) {
                const credential = responseData.credential_responses[i].credential;
                if (credential) {
                    try {
                        const format = i === 0 ? 'jwt_vc' : 'mdoc';
                        console.log(`[Step 6.5] Storing ${format} credential...`);
                        if (i === 0) {
                            const claims = await sdJwt.getClaims(credential);
                            console.log('Credential Claims:', claims);
                        }

                        await CredentialStorage.storeCredential(
                            format,
                            credential
                        );
                        console.log(`[Step 6.5] Successfully stored ${format} credential`);
                        storedCredentials.push(format);
                    } catch (storageError) {
                        const errorMessage = `Error storing credential ${i}: ${storageError instanceof Error ? storageError.message : String(storageError)}`;
                        console.error('[Step 6.5]', errorMessage);
                        storageErrors.push(errorMessage);
                    }
                } else {
                    console.warn(`[Step 6.5] No credential data received for index ${i}`);
                }
            }

            if (storageErrors.length > 0) {
                console.warn('[Step 6.5] Completed with storage warnings:', storageErrors);
                console.log('[Step 6.5] Successfully stored credentials:', storedCredentials);
            } else if (storedCredentials.length > 0) {
                console.log('[Step 6.5] All credentials stored successfully:', storedCredentials);
            } else {
                console.warn('[Step 6.5] No credentials were stored');
            }
        } else {
            console.warn('[Step 6.5] No credentials received in response');
        }

        console.log('[Step 6] ====== Batch Credential Request Flow Completed Successfully ======');
        return responseData;
    } catch (error) {
        console.error('[Step 6] ====== Error in Batch Credential Request Flow ======');
        console.error('[Step 6] Error details:', error);
        throw error;
    }
}

/**
 * Main function to initiate credential request
 */
export async function requestCredential() {
    try {
        // Step 1: Fetch metadata
        const { oidcMetadata } = await fetchMetadata();

        // Generate PKCE parameters
        const pkce = await generatePKCE();

        // Step 2: Push Authorization Request
        const parResponse = await pushAuthorizationRequest(oidcMetadata, pkce);

        // Step 3: Initiate authorization
        await initiateAuthorization(oidcMetadata, parResponse.request_uri);
    } catch (error) {
        console.error('[Credential Request] Error:', error);
        Alert.alert('Error', 'Failed to initiate credential request');
    }
}

/**
 * This function validates the callback URL received from the deep link handler
 *
 * @param url The URL received from the deep link handler
 * @returns True if the URL is valid, otherwise false
 */
function isValidCallbackUrl(url: string): boolean {
    try {
        console.log('[Deep Link] Validating URL:', url);

        // Parse the URL
        const { scheme, hostname, path, queryParams } = Linking.parse(url);

        console.log('[Deep Link] Parsed URL:', { scheme, hostname, path, queryParams });

        // Check if it's our scheme
        if (scheme !== 'trinwallet') {
            console.log('[Deep Link] Invalid scheme:', scheme);
            return false;
        }

        // Check for required parameters
        if (!queryParams || !queryParams.code || !queryParams.state) {
            console.log('[Deep Link] Missing required parameters');
            return false;
        }

        return true;
    } catch (error) {
        console.error('[Deep Link] Error validating URL:', error);
        return false;
    }
}