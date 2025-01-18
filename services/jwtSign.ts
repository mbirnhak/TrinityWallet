// services/jwtSign.ts
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import * as Crypto from 'expo-crypto';
// or react-native-quick-crypto, or react-native-jose, etc.

/**
 * Example function to sign a JWT with ES256 in React Native.
 * In a real wallet, you'd have a persistent ECDSA keypair in secure hardware.
 *
 * This uses a pseudo approach; see library usage for real ES256 on iOS/Android.
 */
export async function generateES256Jwt(
  payload: Record<string, any>
): Promise<string> {
  // 1. Hardcoded or load from SecureStore the private key
  //    For demonstration, we do NOT store a real key. Replace with your real key logic.
  const privateKey = '-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----';

  // 2. JWT header
  const header = {
    alg: 'ES256',
    typ: 'openid4vci-proof+jwt',
    kid: 'myKeyIdOptional', // optional key ID
  };

  // 3. Base64url encode
  function base64url(buffer: string): string {
    return Buffer.from(buffer)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));

  // 4. For real ES256, you must parse your private key and do an ECDSA-SHA256 signature of
  //    `encodedHeader + '.' + encodedPayload`. 
  //    The code snippet below is a simplified placeholder using HMAC-SHA256 
  //    (NOT real ECDSA - for demonstration only).

  const toSign = `${encodedHeader}.${encodedPayload}`;
  const signature = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    toSign + privateKey // naive
  );

  // 5. base64url-encode the signature
  const encodedSig = base64url(signature);

  // 6. Final JWT
  return `${encodedHeader}.${encodedPayload}.${encodedSig}`;
}
