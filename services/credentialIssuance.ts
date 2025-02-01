// services/credentialIssuance.ts
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import base64url from 'base64url';

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
        const authDetails: AuthorizationDetails[] = [{
            type: "openid_credential",
            format: "vc+sd-jwt",
            vct: "eu.europa.ec.eudi.pid_jwt_vc_json"
        }];

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

        const tokenResponse = await response.json();
        console.log('[Step 4] Token Response:', JSON.stringify(tokenResponse, null, 2));
        
        // Store tokens
        await SecureStore.setItemAsync('access_token', tokenResponse.access_token);
        await SecureStore.setItemAsync('refresh_token', tokenResponse.refresh_token);
        
        return tokenResponse;
    } catch (error) {
        console.error('[Token] Error:', error);
        throw new Error('Failed to exchange code for token');
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
                    
                    // Handle successful token exchange
                    console.log('[Deep Link] Token exchange successful');
                    router.replace('/home');
                }
            } catch (error) {
                console.error('[Deep Link] Error handling callback:', error);
                Alert.alert('Error', 'Failed to process credential');
            }
        });

        return () => {
            subscription.remove();
        };
    }, [router]);
}