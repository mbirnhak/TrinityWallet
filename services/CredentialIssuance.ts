import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

/**
 * Your base URL for the Issuer's environment.
 * In a proper OpenID4VCI scenario, you'd discover endpoints from the .well-known metadata
 * and store them. For now, we keep it simple.
 */
const BASE_URL = 'https://issuer.eudiw.dev';

/**
 * Fetch the stored access token for authenticated API requests.
 */
async function getAccessToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync('access_token');
    return token || null;
  } catch (error) {
    console.error('Error fetching access token:', error);
    return null;
  }
}

/**
 * Example shape for well-known metadata.
 * Adjust based on actual .well-known/openid-configuration from your Issuer.
 */
interface WellKnownConfig {
  issuer: string;
  authorization_endpoint?: string;
  token_endpoint?: string;
  credential_endpoint?: string;
  batch_credential_endpoint?: string;
  // ... add any other fields your .well-known might expose
}

/**
 * Encapsulates the logic for credential issuance.
 */
const CredentialIssuanceService = {
  /**
   * Fetch metadata from the Credential Issuer's `.well-known/openid-configuration` endpoint.
   * Returns an object representing the configuration.
   */
  async fetchMetadata(): Promise<WellKnownConfig> {
    try {
      const response = await axios.get<WellKnownConfig>(
        `${BASE_URL}/.well-known/openid-configuration`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching issuer metadata:', error);
      throw new Error('Failed to fetch issuer metadata.');
    }
  },

  /**
   * Request an OAuth2 token from the issuer.
   * 
   * Example usage: 
   *   await requestToken({ grant_type: 'client_credentials', client_id: 'XYZ', ... })
   *
   * @param payload - The payload for the token request (e.g. grant_type, client_id).
   * @returns The token response, including access_token, refresh_token, etc.
   */
  async requestToken(payload: Record<string, string>) {
    try {
      // Convert the payload to x-www-form-urlencoded format
      const formParams = new URLSearchParams(payload).toString();

      const response = await axios.post(`${BASE_URL}/token`, formParams, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      return response.data; // e.g. { access_token, token_type, expires_in, ... }
    } catch (error) {
      console.error('Error requesting token:', error);
      throw new Error('Failed to request token.');
    }
  },

  /**
   * Request a batch of credentials from the issuer.
   * 
   * @param credentials - Array of credential requests, e.g. 
   *   [{ type: 'mdoc', format: 'sd_jwt', claims: {...} }, ...]
   */
  async requestBatchCredentials(credentials: Record<string, any>[]) {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('Access token is missing. Please authenticate first.');
    }

    try {
      const response = await axios.post(
        `${BASE_URL}/batch_credential`,
        { credential_requests: credentials },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      // Expecting response.data to be an array or object of issued credentials
      return response.data;
    } catch (error) {
      console.error('Error requesting batch credentials:', error);
      throw new Error('Failed to request batch credentials.');
    }
  },

  /**
   * Retrieve a specific credential from the issuer.
   * 
   * @param payload - The payload for the credential request.
   *   e.g. { format: 'w3cvc', doctype: 'eu.europa.ec.eudi.mdl_jwt_vc_json', ... }
   */
  async requestCredential(payload: Record<string, any>) {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('Access token is missing. Please authenticate first.');
    }

    try {
      const response = await axios.post(`${BASE_URL}/credential`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      // Expecting response.data to be the issued credential object
      return response.data;
    } catch (error) {
      console.error('Error requesting credential:', error);
      throw new Error('Failed to request credential.');
    }
  },

  /**
   * Save a credential securely in the device's storage.
   * 
   * @param credential - The credential object to save. Usually includes an "id" or unique identifier.
   */
  async saveCredential(credential: Record<string, any>) {
    try {
      // Fallback to "default_credential" if no .id is present
      const credentialId = credential?.id || 'default_credential';
      await SecureStore.setItemAsync(credentialId, JSON.stringify(credential));
      console.log('Credential saved successfully:', credentialId);
    } catch (error) {
      console.error('Error saving credential:', error);
      throw new Error('Failed to save credential.');
    }
  },

  /**
   * Load a credential securely from the device's storage.
   * 
   * @param credentialId - The ID of the credential to load.
   * @returns The credential object, or null if not found.
   */
  async loadCredential(credentialId: string) {
    try {
      const credentialStr = await SecureStore.getItemAsync(credentialId);
      return credentialStr ? JSON.parse(credentialStr) : null;
    } catch (error) {
      console.error('Error loading credential:', error);
      throw new Error('Failed to load credential.');
    }
  },

  /**
   * Delete a saved credential from the device's storage.
   * 
   * @param credentialId - The ID of the credential to delete.
   */
  async deleteCredential(credentialId: string) {
    try {
      await SecureStore.deleteItemAsync(credentialId);
      console.log('Credential deleted successfully:', credentialId);
    } catch (error) {
      console.error('Error deleting credential:', error);
      throw new Error('Failed to delete credential.');
    }
  },
};

export default CredentialIssuanceService;
