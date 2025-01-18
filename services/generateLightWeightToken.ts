import * as Crypto from 'expo-crypto';

/**
 * Generate a lightweight token for credential issuance proof.
 * This mimics the purpose of a JWT without requiring the full jwt library.
 * 
 * NOTE: Real eIDAS 2.0 or OpenID4VCI solutions typically require a proper JWT with 
 *       an ES256 (or similar) signature. This is a simplified placeholder.
 *
 * @returns A pseudo-signed token as a string.
 */
async function generateLightweightToken(): Promise<string> {
  try {
    const payload = {
      sub: 'user@example.com', // User identifier
      aud: 'https://issuer.eudiw.dev', // Audience (issuer URL)
      exp: Math.floor(Date.now() / 1000) + 60 * 10, // 10 min from now
      iat: Math.floor(Date.now() / 1000),
      iss: 'your-client-id', // "Issuer" (your client ID)
      claims: {
        credential_request: {
          format: 'vc+sd-jwt',
          doctype: 'eu.europa.ec.eudi.mdl_jwt_vc_json',
        },
      },
    };

    // 1. Serialize payload to JSON, then to base64
    //    (In a real JWT, you'd do base64url encoding. This is a minimal example.)
    const payloadJson = JSON.stringify(payload);
    const payloadBase64 = Buffer.from(payloadJson).toString('base64');

    // 2. Generate a signature using HMAC-SHA256 (DEMO ONLY)
    //    In a real environment, you'd want a private key + public key signature 
    //    or DPoP, not just a shared secret.
    const secret = 'your-shared-secret'; // Replace with your real shared secret in production
    const signature = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${payloadBase64}.${secret}`
    );

    // 3. Combine payload and signature to form a "lightweight" token
    const token = `${payloadBase64}.${signature}`;

    return token;
  } catch (error) {
    console.error('Error generating lightweight token:', error);
    throw new Error('Failed to generate token.');
  }
}

export default generateLightweightToken;
