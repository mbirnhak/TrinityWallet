import { SDJWTVCConfig, SDJwtVcInstance, SdJwtVcPayload } from '@sd-jwt/sd-jwt-vc';
import type { DisclosureFrame, kbHeader, KBOptions, kbPayload, SDJWTCompact } from '@sd-jwt/types';
import { createSignerVerifier, digest, ES256, generateSalt } from './utils';

export interface SdJwt {
    getKeyPair: () => { privateKey: object | undefined; publicKey: object | undefined };
    signJwt: (data: string) => Promise<string | undefined>;
    issueCredential: <T extends SdJwtVcPayload>(claims: T, disclosureFrame: DisclosureFrame<T>, options?: { header?: object; }) => Promise<SDJWTCompact>;
    validateCredential: (encodedSDJwt: string) => Promise<false | { payload: unknown; header: Record<string, unknown> | undefined; }>;
    presentCredential: (encodedSDJwt: string, presentationFrame?: { [x: string]: boolean | undefined }, options?: { kb?: KBOptions }) => Promise<string>;
    verifyPresentation: (encodedSDJwt: string, requiredClaimKeys?: string[], requireKeyBindings?: boolean) => Promise<"" | Record<string, any>>;
    getClaims: (endcodedSDJwt: string) => Promise<unknown>;
    decodeCredential: (endcodedSDJwt: SDJWTCompact) => Promise<"" | any>;
}

// Function to create an SDJwt instance and provide utility methods for SDJwt operations
export const createSdJwt = async (privateKeyInput?: object, publicKeyInput?: object, kb: boolean = false) => {
    // Create a signer and verifier for issuing and verifying SDJwt credentials
    const { signer, verifier, privateKey, publicKey } = await createSignerVerifier(
        (privateKeyInput ? privateKeyInput : undefined),
        (publicKeyInput ? publicKeyInput : undefined)
    );

    const config: SDJWTVCConfig = {
        signer,
        verifier,
        signAlg: ES256.alg,
        hasher: digest,
        hashAlg: 'sha-256',
        saltGenerator: generateSalt,
    }
    if (kb === true) {
        config.kbSignAlg = ES256.alg;
        config.kbSigner = signer;
        config.kbVerifier = verifier;
    }
    // Initialize the SDJwt instance with the required configuration
    const sdjwt = new SDJwtVcInstance(config);


    // Return an object containing utility methods to interact with SDJwt
    return {
        // Return the key pair
        getKeyPair() {
            return { privateKey, publicKey };
        },
        // 
        async signJwt(data: string) {
            try {
                return await signer?.(data);
            } catch (error) {
                console.error("Error signing data: ", error);
            }
        },
        // Method to issue a signed SDJwt credential
        async issueCredential<T extends SdJwtVcPayload>(claims: T, disclosureFrame: DisclosureFrame<T>,
            options?: { header?: object }): Promise<SDJWTCompact> {
            try {
                return await sdjwt.issue(claims, disclosureFrame, options);
            } catch (error) {
                console.error("Error issuing credential: ", error);
                return "";
            }
        },
        // Method to validate a given SDJwt credential
        async validateCredential(encodedSDJwt: string) {
            try {
                return await sdjwt.validate(encodedSDJwt);
            } catch (error) {
                console.error("Error validating: ", error);
                return false;
            }
        },
        // Method to create a presentation for the SDJwt credential
        async presentCredential(encodedSDJwt: string, presentationFrame?: { [x: string]: boolean | undefined; } | undefined,
            options?: { kb?: KBOptions; }) {
            try {
                return await sdjwt.present(encodedSDJwt, presentationFrame, options);
            } catch (error) {
                console.error("Error presenting credential: ", error);
                return "";
            }
        },
        // Method to verify a presented SDJwt credential
        async verifyPresentation(encodedSDJwt: string, requiredClaimKeys?: string[], requireKeyBindings?: boolean) {
            try {
                return await sdjwt.verify(encodedSDJwt, requiredClaimKeys, requireKeyBindings);
            } catch (error) {
                console.error("Error verifying presentation: ", error);
                return "";
            }
        },
        async getClaims(endcodedSDJwt: string) {
            try {
                return await sdjwt.getClaims(endcodedSDJwt)
            } catch (error) {
                console.log("Error retrieving claims: ", error);
                return "";
            }
        },
        async decodeCredential(endcodedSDJwt: SDJWTCompact) {
            try {
                return await sdjwt.decode(endcodedSDJwt);
            } catch (error) {
                console.log("Error decoding credential: ", error);
                return "";
            }
        }
    };
};