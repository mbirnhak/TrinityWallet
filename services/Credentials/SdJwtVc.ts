import { SDJwtVcInstance, SdJwtVcPayload } from '@sd-jwt/sd-jwt-vc';
import type { DisclosureFrame, KBOptions, SDJWTCompact } from '@sd-jwt/types';
import { createSignerVerifier, digest, ES256, generateSalt, } from './utils';
import { JWK } from 'react-native-quick-crypto/lib/typescript/src/keys';

// Function to create an SDJwt instance and provide utility methods for SDJwt operations
export const createSdJwt = async (privateKey?: object, publicKey?: object) => {
    // Create a signer and verifier for issuing and verifying SDJwt credentials
    const { signer, verifier } = await createSignerVerifier(
        (privateKey ? privateKey : undefined),
        (publicKey ? publicKey : undefined)
    );

    // Initialize the SDJwt instance with the required configuration
    const sdjwt = new SDJwtVcInstance({
        signer,
        verifier,
        signAlg: ES256.alg,
        hasher: digest,
        hashAlg: 'sha-256',
        saltGenerator: generateSalt,
    });

    // Return an object containing utility methods to interact with SDJwt
    return {
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
                console.error("Error retrieving claims: ", error);
                return "";
            }
        },
        async decodeCredential(endcodedSDJwt: SDJWTCompact) {
            try {
                return await sdjwt.decode(endcodedSDJwt);
            } catch (error) {
                console.error("Error decoding credential: ", error);
                return "";
            }
        }
    };
};