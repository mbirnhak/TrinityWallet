import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import bcrypt from 'bcryptjs'
// var bcrypt = require('bcryptjs');

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

function fallback(bytesAmount: number) {
    const typedArray = new Uint8Array(bytesAmount);
    Crypto.getRandomValues(typedArray);
    return Array.from(typedArray);
};
// Define the random fallback using Expo Crypto API (since Node Crypto and Web Crypto API are not available)
bcrypt.setRandomFallback(fallback);

/**
 * Hashes a given value using bcrypt with a defined number of salt rounds.
 *
 * @param value The plain text value to be hashed.
 * @returns A Promise that resolves to the hashed value as a string or `null` if an error occurs.
 */
export async function bcryptHash(value: string): Promise<string | null> {    
    try {
        const saltRounds = 1;
        const salt = await bcrypt.genSalt(saltRounds);
        console.log("Crypto salt: ", salt);
        const hashedVal = await bcrypt.hash(value, salt);
        console.log("Hash val: ", hashedVal);
        return hashedVal;
    } catch (error) {
        console.error("Error hashing value: ", error);
        return null;
    }
}

/**
 * Verifies if a plain text value matches a previously stored bcrypt hash.
 *
 * @param value The plain text value to verify.
 * @param storedHash The bcrypt hash to compare against.
 * @returns A Promise that resolves to `true` if the value matches the hash, otherwise `false`.
 */
export async function bcryptVerifyHash(value: string, storedHash: string): Promise<boolean> {
    try {
        const result = await bcrypt.compare(value, storedHash);
        console.log("Result: ", result)
        if (result) {
            console.log('PIN matches!');
        } else {
            console.log('PIN does NOT match!');
        }
        return result;
    } catch (error) {
        console.error('Error verifying PIN:', error);
        return false;
    }
}