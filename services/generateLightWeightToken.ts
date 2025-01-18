import * as Crypto from 'expo-crypto';

/**
 * Generate a lightweight token for credential issuance proof.
 * This mimics the purpose of a JWT without requiring the jwt library.
 * 
 * @returns A signed token as a string.
 */
async function generateLightweightToken(): Promise<string> {
  try {
    const payload = {
      sub: 'user@example.com', // User identifier
      aud: 'https://issuer.eudiw.dev', // Audience (issuer URL)
      exp: Math.floor(Date.now() / 1000) + 60 * 10, // Expiration time (10 minutes from now)
      iat: Math.floor(Date.now() / 1000), // Issued at
      iss: 'your-client-id', // Issuer (your client ID)
      claims: {
        credential_request: {
          format: 'vc+sd-jwt',
          doctype: 'eu.europa.ec.eudi.mdl_jwt_vc_json',
        },
      },
    };

    // Serialize payload to a base64 string
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');

    // Generate a signature using HMAC-SHA256
    const secret = 'your-shared-secret'; // Replace with your secure shared secret
    const signature = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${payloadBase64}.${secret}`
    );

    // Combine payload and signature to form the token
    const token = `${payloadBase64}.${signature}`;
    return token;
  } catch (error) {
    console.error('Error generating lightweight token:', error);
    throw new Error('Failed to generate token.');
  }
}

export default generateLightweightToken;
