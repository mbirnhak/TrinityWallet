import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'https://issuer.eudiw.dev'; // Update this URL based on your environment

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

const CredentialIssuanceService = {
  /**
   * Fetch metadata from the Credential Issuer's `.well-known/openid-configuration` endpoint.
   */
  async fetchMetadata(): Promise<any[]> {
    try {
      const response = await axios.get(`${BASE_URL}/.well-known/openid-configuration`);
      return response.data as any[]; // Metadata for the credential issuance process
    } catch (error) {
      console.error('Error fetching metadata:', error);
      throw new Error('Failed to fetch issuer metadata.');
    }
  },

  /**
   * Request an OAuth2 token from the issuer.
   * @param payload - The payload for the token request.
   */
  async requestToken(payload: Record<string, string>) {
    try {
      const response = await axios.post(`${BASE_URL}/token`, payload, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      return response.data; // Contains tokens like access_token, refresh_token, etc.
    } catch (error) {
      console.error('Error requesting token:', error);
      throw new Error('Failed to request token.');
    }
  },

  /**
   * Request a batch of credentials from the issuer.
   * @param credentials - Array of credential requests.
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
      return response.data; // Contains issued credentials and related information
    } catch (error) {
      console.error('Error requesting batch credentials:', error);
      throw new Error('Failed to request batch credentials.');
    }
  },

  /**
   * Retrieve a specific credential from the issuer.
   * @param payload - The payload for the credential request.
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
      return response.data; // Contains the issued credential
    } catch (error) {
      console.error('Error requesting credential:', error);
      throw new Error('Failed to request credential.');
    }
  },

  /**
   * Save a credential securely in the device's storage.
   * @param credential - The credential object to save.
   */
  async saveCredential(credential: Record<string, any>) {
    try {
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
   * @param credentialId - The ID of the credential to load.
   */
  async loadCredential(credentialId: string) {
    try {
      const credential = await SecureStore.getItemAsync(credentialId);
      return credential ? JSON.parse(credential) : null;
    } catch (error) {
      console.error('Error loading credential:', error);
      throw new Error('Failed to load credential.');
    }
  },

  /**
   * Delete a saved credential from the device's storage.
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
