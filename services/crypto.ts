import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

export async function generateSalt() {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    return Buffer.from(randomBytes).toString('hex')
}

// Simplified function for hashing a value with SHA-256
export async function shaHash(value: string, salt: string) {
    try {
        const valueSalt = `${value}:${salt}`;
        const hash = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            valueSalt
        );
        const storedData = JSON.stringify({ hash: hash, salt: salt });
        return storedData;
    } catch (error) {
        console.error('Error hashing your value: ', error);
        return null;
    }
}

/**
 * Checks whether the value entered matches the hash stored
 * 
 * @param key The string used to store the value in the key store
 * @param value The string that is being checked for correctness
 * @returns True if the value is correct, otherwise false
 */
export async function verifyAgainstShaHash(key: string, value: string | null): Promise<boolean> {
    if (value === null) {
        console.log('Value enter is null: ', value);
        return false;
    }

    try {
        const storedData = await SecureStore.getItemAsync(key);
        if (!storedData) return false;
        const { hash: storedHash, salt: storedSalt } = JSON.parse(storedData);
        const inputHashAndSalt = await shaHash(value, storedSalt);
        if (inputHashAndSalt === null) {
            console.error('Issue hashing input value');
            return false;
        } else {
            const { hash: inputHash } = JSON.parse(inputHashAndSalt);
            return storedHash === inputHash;
        }
    } catch (error) {
        console.error('Hash Verification Error:', error);
        return false;
    }
}

export default {
    generateSalt,
    shaHash,
    verifyAgainstShaHash
};