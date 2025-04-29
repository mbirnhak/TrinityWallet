function convertToHexString(jwk, keyField) {
    const keyValue = jwk[keyField];
    const cleanBase64 = keyValue.replace(/\.$/, '').replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (cleanBase64.length % 4)) % 4);
    const base64 = cleanBase64 + padding;
    const keyHexString = atob(base64).split('').map((c) => {
        const hex = c.charCodeAt(0).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
    return keyHexString;
}

// Need to specify for JOSE library to work. Certain methods are not implemented yet by QuickCrypto
function setupCrypto() {
    console.log('SETUP: Starting crypto setup');
    try {
        const QuickCryptoModule = require('react-native-quick-crypto');
        const QuickCrypto = QuickCryptoModule.default;
        const Crypto = require('expo-crypto');
        const p256Module = require('@noble/curves/p256');
        const p256 = p256Module.p256;

        subtleImplementation = QuickCrypto.subtle;
        // Then override only the specific methods needed

        /** 
         * @param {object} algorithm Contains the public key and algorithm name
         * @param {CryptoKey} privateKey The private key
         * @param {number} length The length of the derived key in bits. It is 256 since we are using P-256
         * @returns {Promise<ArrayBuffer>} The derived key as an ArrayBuffer
         * @throws {Error} If there is an error in the derivation process
         * @description Custom implementation of deriveBits, because QuickCrypto does not support it for ECDH yet.
        */
        subtleImplementation.deriveBits = async (algorithm, privateKey, length) => {
            try {
                const exportedPublicKey = await QuickCrypto.subtle.exportKey('jwk', algorithm.public);
                const exportedPrivatKey = await QuickCrypto.subtle.exportKey('jwk', privateKey);

                const privateKeyHex = convertToHexString(exportedPrivatKey, 'd');
                const publicKeyHexX = convertToHexString(exportedPublicKey, 'x');
                const publicKeyHexY = convertToHexString(exportedPublicKey, 'y');
                const publicKeyHex = "04" + publicKeyHexX + publicKeyHexY;
                const sharedSecret = p256.getSharedSecret(privateKeyHex, publicKeyHex, false);
                const xCoordinateOnly = new Uint8Array(sharedSecret.subarray(1, 1 + 32));
                // Convert uint8Array to ArrayBuffer
                const sharedSecretBuffer = xCoordinateOnly.buffer.slice(
                    xCoordinateOnly.byteOffset,
                    xCoordinateOnly.byteOffset + xCoordinateOnly.byteLength
                );
                return sharedSecretBuffer;
            } catch (error) {
                console.error('SETUP: Error in deriveBits', error);
                throw error;
            }
        }

        subtleImplementation.deriveKey = async (...args) => {
            throw new Error("deriveKey not implemented");
        };

        subtleImplementation.unwrapKey = async (...args) => {
            throw new Error("unwrapKey not implemented");
        };

        subtleImplementation.wrapKey = async (...args) => {
            throw new Error("wrapKey not implemented");
        };

        global.crypto = {
            ...QuickCrypto,
            subtle: subtleImplementation,
            getRandomValues: ((array) => QuickCrypto.getRandomValues(array)),
            randomUUID: () => Crypto.randomUUID(),
            createHmac: QuickCrypto.createHmac
        };

        console.log('SETUP: Crypto setup complete');
    } catch (error) {
        console.error('SETUP: Error setting up crypto', error);
    }
}

setupCrypto()
require('expo-router/entry')