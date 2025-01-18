// services/CredentialIssuance.ts

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { v4 as uuidv4 } from 'uuid';

// Types from your openid4VCI.ts
import {
  PreAuthTokenResponse,
  IssuerMetadata,
  TokenResponse,
} from '@/types/OpenID4VCI';

/**
 * Retrieve the Access Token from SecureStore, if any.
 */
async function getAccessToken(): Promise<string | null> {
  try {
    return (await SecureStore.getItemAsync('access_token')) || null;
  } catch (error) {
    console.error('Error fetching access token:', error);
    return null;
  }
}

const CredentialIssuanceService = {
  /**
   * Fetch the Issuer metadata (from .well-known or metadata_config.json).
   * Return an object with issuer, token_endpoint, credential_endpoint, etc.
   */
  async fetchMetadata(): Promise<IssuerMetadata | any> {
    try {
      // Option 1: The standard .well-known 
      const url = 'https://issuer.eudiw.dev/.well-known/openid-configuration';
      // Option 2: Custom metadata_config.json
      // const url = 'https://issuer.eudiw.dev/metadata_config.json';

      const response = await axios.get(url);
      return response.data; // we assume this matches IssuerMetadata shape
    } catch (error) {
      console.error('Error fetching metadata:', error);
      throw new Error('Failed to fetch issuer metadata.');
    }
  },

  /**
   * Exchange a "pre-authorized_code" for an Access Token.
   * If the server requires a user PIN, pass it in.
   */
  async requestTokenPreAuthorized(
    preAuthorizedCode: string,
    userPin?: string
  ): Promise<string> {
    try {
      const formBody = new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
        pre_authorized_code: preAuthorizedCode,
      });
      if (userPin) {
        formBody.set('user_pin', userPin);
      }

      // Typically from metadata, but we can do the direct endpoint
      // e.g. 'https://issuer.eudiw.dev/token'
      const tokenEndpoint = 'https://issuer.eudiw.dev/token';

      const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
      const { data } = await axios.post<PreAuthTokenResponse>(
        tokenEndpoint,
        formBody.toString(),
        { headers }
      );

      if (!data.access_token) {
        throw new Error('No access_token in pre-authorized token response.');
      }

      // Save the token locally
      await SecureStore.setItemAsync('access_token', data.access_token);

      return data.access_token;
    } catch (error) {
      console.error('Error requesting pre-authorized token:', error);
      throw new Error('Failed to request pre-authorized token.');
    }
  },

  /**
   * If you do a standard Authorization Code flow, implement it here.
   */
  async requestTokenAuthorizationCode(
    code: string,
    redirectUri: string,
    codeVerifier?: string
  ): Promise<string> {
    try {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: 'YOUR_CLIENT_ID', // or from your config
      });
      if (codeVerifier) {
        body.set('code_verifier', codeVerifier);
      }

      const tokenEndpoint = 'https://issuer.eudiw.dev/token';
      const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
      const { data } = await axios.post<TokenResponse>(
        tokenEndpoint,
        body.toString(),
        { headers }
      );

      if (!data.access_token) {
        throw new Error('No access_token in authorization_code response.');
      }

      // Store token
      await SecureStore.setItemAsync('access_token', data.access_token);
      return data.access_token;
    } catch (error) {
      console.error('Error requesting token with authorization_code:', error);
      throw new Error('Failed to request token (authorization_code).');
    }
  },

  /**
   * Creates a JWT-based proof for "proof_type: 'jwt'".
   * A real eIDAS wallet must do ES256 with an ECDSA private key.
   * Below is a minimal HMAC-SHA256 approach to produce a "JWT."
   */
  async createProofJwt(audience: string): Promise<string> {
    try {
      // 1. Header: ES256 in production, but we'll do a placeholder
      const header = {
        alg: 'HS256', // or 'ES256' in real usage
        typ: 'openid4vci-proof+jwt',
      };

      // 2. Payload: typical fields: { aud, iat, jti, ... }
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        aud: audience,
        iat: now,
        jti: uuidv4(),
      };

      // 3. Encode to base64url
      function base64url(str: string): string {
        return Buffer.from(str).toString('base64')
          .replace(/=/g, '')
          .replace(/\+/g, '-')
          .replace(/\//g, '_');
      }
      const encodedHeader = base64url(JSON.stringify(header));
      const encodedPayload = base64url(JSON.stringify(payload));

      // 4. In production, sign (header.payload) with ECDSA (ES256).
      //    For demonstration, we do a naive HMAC with a static secret:
      const secret = 'REPLACE_WITH_STRONG_SECRET';
      const toSign = `${encodedHeader}.${encodedPayload}.${secret}`;

      const signature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        toSign
      );
      const encodedSig = base64url(signature);

      // 5. Combine
      const jwt = `${encodedHeader}.${encodedPayload}.${encodedSig}`;
      return jwt;
    } catch (error) {
      console.error('Error creating JWT proof:', error);
      throw new Error('Failed to create proof JWT.');
    }
  },

  /**
   * Request a *batch* of credentials (POST /batch_credential).
   * The payload includes { credential_requests: [ { format, doctype, proof, ... } ] }
   */
  async requestBatchCredentials(
    credentials: Array<Record<string, any>>
  ): Promise<any> {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Access token is missing. Please authenticate first.');
    }

    try {
      // Typically from metadata, but can be directly:
      const endpoint = 'https://issuer.eudiw.dev/batch_credential';

      const { data } = await axios.post(
        endpoint,
        { credential_requests: credentials },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return data; // e.g. { credential_responses: [...], c_nonce, etc. }
    } catch (error) {
      console.error('Error requesting batch credentials:', error);
      throw new Error('Failed to request batch credentials.');
    }
  },

  /**
   * Request a single credential from the issuer (POST /credential).
   * 
   * Payload example:
   *  {
   *    format: 'mso_mdoc' or 'vc+sd-jwt',
   *    doctype: 'eu.europa.ec.eudi.loyalty.1',
   *    proof: { proof_type: 'jwt', jwt: '...' },
   *    claims: { ... }
   *  }
   */
  async requestCredential(payload: Record<string, any>): Promise<any> {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('Access token is missing. Please authenticate first.');
    }
    try {
      const endpoint = 'https://issuer.eudiw.dev/credential';
      const { data } = await axios.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      return data; // e.g. { credential, c_nonce, notification_id, ... }
    } catch (error) {
      console.error('Error requesting credential:', error);
      throw new Error('Failed to request credential.');
    }
  },

  /**
   * Save a credential in SecureStore.
   */
  async saveCredential(credential: Record<string, any>) {
    try {
      const credentialId = credential.id || `credential_${Date.now()}`;
      await SecureStore.setItemAsync(credentialId, JSON.stringify(credential));
      console.log('Credential saved successfully:', credentialId);
    } catch (error) {
      console.error('Error saving credential:', error);
      throw new Error('Failed to save credential.');
    }
  },

  /**
   * Load a credential from SecureStore.
   */
  async loadCredential(credentialId: string) {
    try {
      const val = await SecureStore.getItemAsync(credentialId);
      return val ? JSON.parse(val) : null;
    } catch (error) {
      console.error('Error loading credential:', error);
      throw new Error('Failed to load credential.');
    }
  },

  /**
   * Delete a credential from SecureStore.
   */
  async deleteCredential(credentialId: string) {
    try {
      await SecureStore.deleteItemAsync(credentialId);
      console.log('Credential deleted:', credentialId);
    } catch (error) {
      console.error('Error deleting credential:', error);
      throw new Error('Failed to delete credential.');
    }
  },
};

export default CredentialIssuanceService;
