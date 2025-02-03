// services/credentialIssuance.ts
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import base64url from 'base64url';
import { CredentialStorage } from './credentialStorage';

// Constants
const ISSUER_URL = 'https://issuer.eudiw.dev';
const CLIENT_ID = 'ID';

const DEEP_LINK_PREFIX = 'trinwallet://';
const AUTH_PATH = 'callback';

const REDIRECT_URI = `${DEEP_LINK_PREFIX}${AUTH_PATH}`;
// Storage Keys
const METADATA_STORAGE_KEY = 'issuer_metadata';
const CODE_VERIFIER_KEY = 'code_verifier';
const STATE_KEY = 'auth_state';

interface AuthorizationDetails {
    type: string;
    format: string;
    vct: string;
}

interface CredentialRequest {
    format: string;
    vct: string;
    proof: {
        proof_type: string;
        jwt: string;
    };
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
    const randomBytes = await Crypto.getRandomValues(new Uint8Array(32));
    const verifier = base64url.encode(Buffer.from(randomBytes));
    
    // Generate code challenge
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data);
    const challenge = base64url.encode(Buffer.from(hash));
    
    console.log('[PKCE] Code verifier generated:', verifier.slice(0, 10) + '...');
    console.log('[PKCE] Code challenge generated:', challenge.slice(0, 10) + '...');
    
    await SecureStore.setItemAsync(CODE_VERIFIER_KEY, verifier);
    
    return { verifier, challenge };
}

/**
 * Generate random state
 */
async function generateState() {
    const state = base64url.encode(Buffer.from(await Crypto.getRandomValues(new Uint8Array(16))));
    await SecureStore.setItemAsync(STATE_KEY, state);
    console.log('[Auth] Generated state:', state);
    return state;
}

/**
 * Generate a random UUID using Expo's Crypto
 */
async function generateUUID(): Promise<string> {
    const bytes = await Crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Step 1: Fetch metadata from issuer
 */
async function fetchMetadata() {
    try {
        console.log('[Step 1.a] Fetching OpenID Configuration...');
        const oidcResponse = await fetch(`${ISSUER_URL}/.well-known/openid-configuration`);
        const oidcMetadata = await oidcResponse.json();
        console.log('[Step 1.a] OIDC Metadata:', JSON.stringify(oidcMetadata, null, 2));
        
        console.log('[Step 1.b] Fetching Credential Issuer metadata...');
        const credResponse = await fetch(`${ISSUER_URL}/.well-known/openid-credential-issuer`);
        const credMetadata = await credResponse.json();
        console.log('[Step 1.b] Credential Metadata:', JSON.stringify(credMetadata, null, 2));
        
        await SecureStore.setItemAsync(METADATA_STORAGE_KEY, JSON.stringify(oidcMetadata));
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

        console.log('[Step 2] Authorization Details:', JSON.stringify(authDetails, null, 2));

        const parEndpoint = oidcMetadata.pushed_authorization_request_endpoint;
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            code_challenge: pkce.challenge,
            code_challenge_method: 'S256',
            state: state,
            scope: 'eu.europa.ec.eudi.pid.1 openid',
            authorization_details: JSON.stringify(authDetails)
        });

        console.log('[Step 2] PAR Request Payload:', params.toString());

        const response = await fetch(parEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });

        const parResponse = await response.json();
        console.log('[Step 2] PAR Response:', JSON.stringify(parResponse, null, 2));
        
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
        
        const authUrl = `${oidcMetadata.authorization_endpoint}?client_id=${CLIENT_ID}&request_uri=${requestUri}`;
        console.log('[Step 3] Authorization URL:', authUrl);
        
        await Linking.openURL(authUrl);
    } catch (error) {
        console.error('[Authorization] Error:', error);
        throw new Error('Failed to open authorization URL');
    }
}

/**
 * Step 4: Handle token exchange
 */
export async function exchangeCodeForToken(code: string, oidcMetadata: any) {
    try {
        console.log('[Step 4] Exchanging code for token...');
        
        const codeVerifier = await SecureStore.getItemAsync(CODE_VERIFIER_KEY);
        const state = await SecureStore.getItemAsync(STATE_KEY);
        
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI,
            client_id: CLIENT_ID,
            code_verifier: codeVerifier!,
            state: state!
        });

        console.log('[Step 4] Token Request Payload:', params.toString());

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
        console.log('[Step 4] Token Response:', JSON.stringify(tokenResponse, null, 2));
        
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
async function generateJWTProof(nonce: string, accessToken: string): Promise<string> {
    try {
        console.log('[Step 5] Generating JWT proof with nonce:', nonce);
        
        // Generate a key pair for signing
        const { publicKey, privateKey } = await generateKeyPair();
        
        const header = {
            typ: "openid4vci-proof+jwt",
            alg: "ES256",
            jwk: publicKey  // Include the public key in the header
        };

        const payload = {
            iss: CLIENT_ID,
            aud: ISSUER_URL,
            iat: Math.floor(Date.now() / 1000),
            nonce: nonce,
            jti: await generateUUID() // Using our custom UUID generator
        };

        console.log('[Step 5] JWT Header:', header);
        console.log('[Step 5] JWT Payload:', payload);

        // Create the JWT
        const jwt = await new jose.SignJWT(payload)
            .setProtectedHeader(header)
            .setIssuedAt()
            .setAudience(ISSUER_URL)
            .sign(privateKey);

        console.log('[Step 5] Generated JWT:', jwt);
        
        return jwt;
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
        console.log('[Step 6] Authorization Details:', JSON.stringify(authDetails, null, 2));

        // Step 6.1: Create Initial JWT proof without nonce
        console.log('[Step 6.1] Generating initial JWT proof...');
        const initialHeader = {
            typ: "openid4vci-proof+jwt",
            alg: "ES256",
            jwk: {
                kty: "EC",
                crv: "P-256",
                x: "wUuP2OlwHefeE-Y16Wj7PHAzZ0JAQyevqWMfd5-KmKY",
                y: "YW-b8O3Uk3NUrk9oZpAT1laPeAgiNQwDcotWiwBFQ6E"
            }
        };

        const initialPayload = {
            aud: ISSUER_URL,
            iat: Math.floor(Date.now() / 1000),
            jti: await generateUUID()
        };

        console.log('[Step 6.1] Initial JWT components:', {
            header: JSON.stringify(initialHeader),
            payload: JSON.stringify(initialPayload)
        });

        const initialEncodedHeader = base64url(JSON.stringify(initialHeader));
        const initialEncodedPayload = base64url(JSON.stringify(initialPayload));
        const initialSignature = "IdmxwbfJIKwcaqvADp6bzV2u-o0UwKIVmo_kQkc1rZHQ9MtBDNbO21NoVr99ZEgumTX8UYNFJcr_R95xfO1NiA";
        const initialJwt = `${initialEncodedHeader}.${initialEncodedPayload}.${initialSignature}`;

        // Step 6.2: Initial batch request with proof
        const initialBatchRequest = {
            credential_requests: [
                {
                    credential_identifier: "eu.europa.ec.eudi.pid_jwt_vc_json",
                    format: "vc+sd-jwt",
                    proof: {
                        proof_type: "jwt",
                        jwt: initialJwt
                    }
                },
                {
                    credential_identifier: "eu.europa.ec.eudi.pid_mdoc",
                    proof: {
                        proof_type: "jwt",
                        jwt: initialJwt
                    }
                }
            ]
        };

        console.log('[Step 6.2] Sending initial batch request:', JSON.stringify(initialBatchRequest, null, 2));

        const initialResponse = await fetch(`${ISSUER_URL}/batch_credential`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(initialBatchRequest)
        });

        if (!initialResponse.ok) {
            const errorText = await initialResponse.text();
            console.error('[Step 6.2] Initial batch request failed:', errorText);
            throw new Error(`Initial batch request failed with status: ${initialResponse.status}`);
        }

        const nonceData = await initialResponse.json();
        console.log('[Step 6.2] Received c_nonce response:', JSON.stringify(nonceData, null, 2));

        if (!nonceData.c_nonce) {
            console.error('[Step 6.2] Error: No c_nonce in response');
            throw new Error('No c_nonce received in initial response');
        }

        // Step 6.3: Generate final JWT proof with nonce
        console.log('[Step 6.3] Generating final JWT proof with nonce:', nonceData.c_nonce);
        
        const finalHeader = {
            typ: "openid4vci-proof+jwt",
            alg: "ES256",
            jwk: {
                kty: "EC",
                crv: "P-256",
                x: "wUuP2OlwHefeE-Y16Wj7PHAzZ0JAQyevqWMfd5-KmKY",
                y: "YW-b8O3Uk3NUrk9oZpAT1laPeAgiNQwDcotWiwBFQ6E"
            }
        };

        const finalPayload = {
            aud: ISSUER_URL,
            iat: Math.floor(Date.now() / 1000),
            nonce: nonceData.c_nonce,
            jti: await generateUUID()
        };

        console.log('[Step 6.3] Final JWT components:', {
            header: JSON.stringify(finalHeader),
            payload: JSON.stringify(finalPayload)
        });

        const finalEncodedHeader = base64url(JSON.stringify(finalHeader));
        const finalEncodedPayload = base64url(JSON.stringify(finalPayload));
        const finalJwt = `${finalEncodedHeader}.${finalEncodedPayload}.${initialSignature}`;

        // Step 6.4: Send final batch credential request
        const finalBatchRequest = {
            credential_requests: [
                {
                    credential_identifier: "eu.europa.ec.eudi.pid_jwt_vc_json",
                    format: "vc+sd-jwt",
                    proof: {
                        proof_type: "jwt",
                        jwt: finalJwt
                    }
                },
                {
                    credential_identifier: "eu.europa.ec.eudi.pid_mdoc",
                    proof: {
                        proof_type: "jwt",
                        jwt: finalJwt
                    }
                }
            ]
        };

        console.log('[Step 6.4] Sending final batch request:', JSON.stringify(finalBatchRequest, null, 2));

        const batchResponse = await fetch(`${ISSUER_URL}/batch_credential`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(finalBatchRequest)
        });

        if (!batchResponse.ok) {
            const errorText = await batchResponse.text();
            console.error('[Step 6.4] Batch credential request failed:', errorText);
            throw new Error(`Batch credential request failed with status: ${batchResponse.status}`);
        }

        const responseData = await batchResponse.json();
        console.log('[Step 6.4] Received batch credential response:', JSON.stringify(responseData, null, 2));

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
                        
                        await CredentialStorage.storeCredential(
                            format,
                            credential
                        );
                        console.log(`[Step 6.5] Successfully stored ${format} credential`);
                        storedCredentials.push(format);
                    } catch (storageError) {
                        const errorMessage = `Error storing ${i === 0 ? 'jwt_vc' : 'mdoc'} credential: ${storageError.message}`;
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
/**
 * Hook to handle deep linking
 */
export function useCredentialDeepLinkHandler() {
    const router = useRouter();

    useEffect(() => {
        const subscription = Linking.addEventListener('url', async ({ url }) => {
            console.log('[Deep Link] Received URL:', url);
            
            try {
                if (!isValidCallbackUrl(url)) {
                    console.log('[Deep Link] Invalid callback URL');
                    return;
                }

                const { queryParams } = Linking.parse(url);
                console.log('[Deep Link] Parsed params:', queryParams);

                // Verify state
                const storedState = await SecureStore.getItemAsync(STATE_KEY);
                if (!queryParams || storedState !== queryParams.state) {
                    console.error('[Deep Link] State mismatch');
                    Alert.alert('Error', 'Invalid state parameter');
                    return;
                }

                if (queryParams.code) {
                    const metadata = await SecureStore.getItemAsync(METADATA_STORAGE_KEY);
                    const oidcMetadata = JSON.parse(metadata!);
                    
                    // Exchange code for token
                    const tokenResponse = await exchangeCodeForToken(
                        queryParams.code as string,
                        oidcMetadata
                    );
                    
                    // Update auth state and navigate directly to home
                    await SecureStore.setItemAsync('isAuthenticated', 'true');
                    console.log('[Deep Link] Token exchange successful, navigating to home');
                    router.replace('/(app)/home');
                }
            } catch (error) {
                console.error('[Deep Link] Error handling callback:', error);
                Alert.alert('Error', 'Failed to process credential');
                router.replace('/login');
            }
        });

        return () => {
            subscription.remove();
        };
    }, [router]);
}