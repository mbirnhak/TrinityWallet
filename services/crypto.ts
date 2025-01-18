import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import bcrypt from 'bcryptjs';

/**
 * Generate a random salt (16 random bytes, hex-encoded).
 */
export async function generateSalt() {
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  return Buffer.from(randomBytes).toString('hex');
}

/**
 * Hash a value with SHA-256, including a salt.
 * 
 * @param value The plain text string to hash.
 * @param salt  The salt to append.
 * @returns A JSON string with { hash, salt }.
 */
export async function shaHash(value: string, salt: string) {
  try {
    const valueSalt = `${value}:${salt}`;
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      valueSalt
    );
    const storedData = JSON.stringify({ hash, salt });
    return storedData;
  } catch (error) {
    console.error('Error hashing your value:', error);
    return null;
  }
}

/**
 * Check whether the provided `value` matches the hash stored in SecureStore under `key`.
 * 
 * @param key   The SecureStore key where { hash, salt } is stored.
 * @param value The user-supplied plain text to verify.
 * @returns True if the hash matches, otherwise false.
 */
export async function verifyAgainstShaHash(key: string, value: string | null): Promise<boolean> {
  if (value === null) {
    console.log('Value entered is null.');
    return false;
  }

  try {
    const storedData = await SecureStore.getItemAsync(key);
    if (!storedData) return false;

    const { hash: storedHash, salt: storedSalt } = JSON.parse(storedData);
    const inputHashAndSalt = await shaHash(value, storedSalt);

    if (!inputHashAndSalt) {
      console.error('Issue hashing input value');
      return false;
    }

    const { hash: inputHash } = JSON.parse(inputHashAndSalt);
    return storedHash === inputHash;
  } catch (error) {
    console.error('Hash Verification Error:', error);
    return false;
  }
}

/**
 * Bcrypt requires a random fallback on some platforms. 
 * We define a fallback using expo-crypto's `getRandomValues`.
 */
function fallback(bytesAmount: number) {
  const typedArray = new Uint8Array(bytesAmount);
  Crypto.getRandomValues(typedArray);
  return Array.from(typedArray);
}

// Let bcrypt know how to generate random bytes in React Native/Expo environment
bcrypt.setRandomFallback(fallback);

/**
 * Hashes a given value using bcrypt with a defined number of salt rounds.
 *
 * @param value The plain text value to be hashed.
 * @returns A hashed value as a string or `null` if an error occurs.
 */
export async function bcryptHash(value: string): Promise<string | null> {
  try {
    const saltRounds = 1; // Adjust as needed
    const salt = await bcrypt.genSalt(saltRounds);
    console.log('Crypto salt:', salt);

    const hashedVal = await bcrypt.hash(value, salt);
    console.log('Hashed value:', hashedVal);

    return hashedVal;
  } catch (error) {
    console.error('Error hashing value:', error);
    return null;
  }
}

/**
 * Verifies if a plain text value matches a previously stored bcrypt hash.
 *
 * @param value The plain text value to verify.
 * @param storedHash The bcrypt hash to compare against.
 * @returns `true` if the value matches the hash, otherwise `false`.
 */
export async function bcryptVerifyHash(value: string, storedHash: string): Promise<boolean> {
  try {
    const result = await bcrypt.compare(value, storedHash);
    console.log('Bcrypt compare result:', result);

    if (result) {
      console.log('Value matches the stored hash!');
    } else {
      console.log('Value does NOT match the stored hash!');
    }
    return result;
  } catch (error) {
    console.error('Error verifying value with bcrypt:', error);
    return false;
  }
}
