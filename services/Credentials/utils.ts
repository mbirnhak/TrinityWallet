import QuickCrypto from 'react-native-quick-crypto';
import { HashAlgorithm, CryptoKeyPair, CryptoKey, JWK } from 'react-native-quick-crypto/lib/typescript/src/keys';

export const generateSalt = (length: number): string => {
    if (length <= 0) {
        return '';
    }
    const saltBytes = QuickCrypto.randomBytes(length);
    const salt = saltBytes.toString('hex');
    return salt.substring(0, length);
};

export const digest = (
    data: string | ArrayBuffer,
    algorithm = 'sha-256',
): Uint8Array => {
    const nodeAlg = toNodeCryptoAlg(algorithm);
    const hash = QuickCrypto.createHash(nodeAlg);
    hash.update(data);
    const hashBuffer = hash.digest();
    return new Uint8Array(hashBuffer);
};

const toNodeCryptoAlg = (hashAlg: string): string =>
    hashAlg.replace('-', '').toLowerCase();

export const ES256 = {
    alg: 'ES256',

    async generateKeyPair() {
        const keyPair = await QuickCrypto.subtle.generateKey(
            {
                name: 'ECDSA',
                namedCurve: 'P-256', // ES256
            },
            true, // whether the key is extractable (i.e., can be used in exportKey)
            ['sign', 'verify'], // can be used to sign and verify signatures
        );
        const { publicKey, privateKey } = keyPair as CryptoKeyPair;

        // Export the public and private keys in JWK format
        const publicKeyJWK: any = await QuickCrypto.subtle.exportKey('jwk', publicKey as CryptoKey);
        const privateKeyJWK: any = await QuickCrypto.subtle.exportKey('jwk', privateKey as CryptoKey);
        // Remove trailing periods from base64url values
        publicKeyJWK.x = publicKeyJWK.x.replace(/\.$/, ''); // replaces only a trailing period with an empty string
        publicKeyJWK.y = publicKeyJWK.y.replace(/\.$/, '');
        privateKeyJWK.x = privateKeyJWK.x.replace(/\.$/, ''); // replaces only a trailing period with an empty string
        privateKeyJWK.y = privateKeyJWK.y.replace(/\.$/, '');
        privateKeyJWK.d = privateKeyJWK.d.replace(/\.$/, '');

        return { publicKey: publicKeyJWK as JWK, privateKey: privateKeyJWK as JWK };
    },

    async getSigner(privateKeyJWK: object) {
        try {
            const privateKey = await QuickCrypto.subtle.importKey(
                'jwk',
                privateKeyJWK,
                {
                    name: 'ECDSA',
                    namedCurve: 'P-256', // Must match the curve used to generate the key
                },
                true, // whether the key is extractable (i.e., can be used in exportKey)
                ['sign'],
            );

            return async (data: string) => {
                const encoder = new TextEncoder();
                const signature = await QuickCrypto.subtle.sign(
                    {
                        name: 'ECDSA',
                        hash: { name: 'sha-256' as HashAlgorithm }, // Required for ES256
                    },
                    privateKey as CryptoKey,
                    encoder.encode(data),
                );

                return btoa(String.fromCharCode(...new Uint8Array(signature)))
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=+$/, ''); // Convert to base64url format
            };
        } catch (error) {
            console.error("Error: ", error);
            return;
        }
    },

    async getVerifier(publicKeyJWK: JWK) {
        try {
            const publicKey = await QuickCrypto.subtle.importKey(
                'jwk',
                publicKeyJWK,
                {
                    name: 'ECDSA',
                    namedCurve: 'P-256', // Must match the curve used to generate the key
                },
                true, // whether the key is extractable (i.e., can be used in exportKey)
                ['verify'],
            );
            return async (data: string, signatureBase64url: string) => {
                const encoder = new TextEncoder();
                const signature = Uint8Array.from(
                    atob(signatureBase64url.replace(/-/g, '+').replace(/_/g, '/')),
                    (c) => c.charCodeAt(0),
                );
                const isValid = await QuickCrypto.subtle.verify(
                    {
                        name: 'ECDSA',
                        hash: { name: 'sha-256' as HashAlgorithm }, // Required for ES256
                    },
                    publicKey,
                    signature,
                    encoder.encode(data),
                );
                return isValid as unknown as boolean;
            };
        } catch (error) {
            console.error("Error: ", error);
            return;
        }
    },
};

// Generate a signer and verifier based on either given keys, or newly generated keys
export const createSignerVerifier = async (privateKeyInput?: object, publicKeyInput?: object) => {
    try {
        const { publicKey, privateKey } = publicKeyInput && privateKeyInput ?
            { publicKey: publicKeyInput, privateKey: privateKeyInput } :
            await ES256.generateKeyPair();
        return {
            signer: await ES256.getSigner(privateKey),
            verifier: await ES256.getVerifier(publicKey),
            privateKey,
            publicKey
        };
    } catch (error) {
        console.log("Error: ", error);
        return {}
    }
};