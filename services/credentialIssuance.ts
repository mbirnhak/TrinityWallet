// services/credentialIssuance.ts
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

interface OIDCMetadata {
    authorization_endpoint: string;
    token_endpoint: string;
    pushed_authorization_request_endpoint: string;
    credential_endpoint: string;
    issuer: string;
}

interface CredentialMetadata {
    credential_issuer: string;
    credential_endpoint: string;
    credentials_supported: any[];
}

const ISSUER_URL = 'https://issuer.eudiw.dev';
const METADATA_URL = `${ISSUER_URL}/.well-known/openid-configuration`;
const CREDENTIAL_METADATA_URL = `${ISSUER_URL}/.well-known/openid-credential-issuer`;
const REDIRECT_URI = 'trinwallet://callback';
const CLIENT_ID = 'ID';

// Storage keys
const METADATA_STORAGE_KEY = 'issuer_metadata';
const CRED_METADATA_STORAGE_KEY = 'credential_metadata';
const REQUEST_URI_STORAGE_KEY = 'request_uri';

/**
 * Step 1.a: Fetch OpenID Configuration metadata
 */
async function fetchOIDCMetadata(): Promise<OIDCMetadata | null> {
    try {
        console.log('[Step 1.a] Fetching OpenID Configuration...');
        console.log(`[Step 1.a] URL: ${METADATA_URL}`);
        
        const response = await fetch(METADATA_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const metadata = await response.json();
        console.log('[Step 1.a] Successfully fetched OpenID Configuration:');
        console.log(JSON.stringify(metadata, null, 2));
        
        await SecureStore.setItemAsync(METADATA_STORAGE_KEY, JSON.stringify(metadata));
        return metadata;
    } catch (error) {
        console.error('[Step 1.a] Error fetching OpenID Configuration:', error);
        return null;
    }
}

/**
 * Step 1.b: Fetch Credential Issuer metadata
 */
async function fetchCredentialMetadata(): Promise<CredentialMetadata | null> {
    try {
        console.log('[Step 1.b] Fetching Credential Issuer metadata...');
        console.log(`[Step 1.b] URL: ${CREDENTIAL_METADATA_URL}`);
        
        const response = await fetch(CREDENTIAL_METADATA_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const metadata = await response.json();
        console.log('[Step 1.b] Successfully fetched Credential Issuer metadata:');
        console.log(JSON.stringify(metadata, null, 2));
        
        await SecureStore.setItemAsync(CRED_METADATA_STORAGE_KEY, JSON.stringify(metadata));
        return metadata;
    } catch (error) {
        console.error('[Step 1.b] Error fetching Credential Issuer metadata:', error);
        return null;
    }
}

/**
 * Step 2: Push Authorization Request
 */
async function pushAuthorizationRequest(oidcMetadata: OIDCMetadata): Promise<string | null> {
    try {
        console.log('[Step 2] Initiating Push Authorization Request...');
        
        const parEndpoint = oidcMetadata.pushed_authorization_request_endpoint;
        console.log(`[Step 2] PAR Endpoint: ${parEndpoint}`);

        const authRequest = {
            response_type: 'code',
            client_id: CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            scope: 'eu.europa.ec.eudi.pid.1 openid'
        };

        console.log('[Step 2] Authorization Request payload:', authRequest);

        const formData = new URLSearchParams();
        Object.entries(authRequest).forEach(([key, value]) => {
            formData.append(key, value);
        });

        const response = await fetch(parEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString()
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const parResponse = await response.json();
        console.log('[Step 2] Push Authorization Response:', parResponse);

        // Store the request_uri for later use
        if (parResponse.request_uri) {
            await SecureStore.setItemAsync(REQUEST_URI_STORAGE_KEY, parResponse.request_uri);
            return parResponse.request_uri;
        }

        return null;
    } catch (error) {
        console.error('[Step 2] Error in Push Authorization Request:', error);
        return null;
    }
}

/**
 * Main function to request credential
 */
export async function requestCredential() {
    try {
        // Step 1.a: Fetch OpenID Configuration
        const oidcMetadata = await fetchOIDCMetadata();
        if (!oidcMetadata) {
            throw new Error('Failed to fetch OpenID Configuration');
        }

        // Step 1.b: Fetch Credential Issuer metadata
        const credentialMetadata = await fetchCredentialMetadata();
        if (!credentialMetadata) {
            throw new Error('Failed to fetch Credential Issuer metadata');
        }

        // Step 2: Push Authorization Request
        const requestUri = await pushAuthorizationRequest(oidcMetadata);
        if (!requestUri) {
            throw new Error('Failed to push authorization request');
        }

        // Construct authorization URL
        const authUrl = `${oidcMetadata.authorization_endpoint}?client_id=${CLIENT_ID}&request_uri=${requestUri}`;
        console.log('[Auth] Opening authorization URL:', authUrl);

        // Open the authorization URL
        await Linking.openURL(authUrl);

    } catch (error) {
        console.error('[Credential Request] Error:', error);
        Alert.alert('Error', 'Failed to initiate credential request');
    }
}

/**
 * Hook to handle deep linking for credential issuance
 */
export function useCredentialDeepLinkHandler() {
    const router = useRouter();

    useEffect(() => {
        // Handle incoming links
        const subscription = Linking.addEventListener('url', ({ url }) => {
            console.log('[Deep Link] Received URL:', url);
            // Handle the callback URL here
            // You'll implement this in the next steps
        });

        return () => {
            subscription.remove();
        };
    }, [router]);
}

/**
 * Hook to fetch and maintain metadata state
 */
export function useFetchMetadata() {
    const [metadata, setMetadata] = useState<{
        oidcMetadata: OIDCMetadata | null;
        credentialMetadata: CredentialMetadata | null;
    }>({
        oidcMetadata: null,
        credentialMetadata: null
    });

    useEffect(() => {
        async function fetchData() {
            const oidcMetadata = await fetchOIDCMetadata();
            const credentialMetadata = await fetchCredentialMetadata();
            setMetadata({ oidcMetadata, credentialMetadata });
        }
        fetchData();
    }, []);

    return metadata;
}