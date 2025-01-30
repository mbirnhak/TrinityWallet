import { SDJwtVcInstance, SdJwtVcPayload } from '@sd-jwt/sd-jwt-vc';
import type { DisclosureFrame, KBOptions, SDJWTCompact } from '@sd-jwt/types';
import { createSignerVerifier, digest, ES256, generateSalt, } from './utils';

// Function to create an SDJwt instance and provide utility methods for SDJwt operations
export const createSdJwt = async () => {
    // Create a signer and verifier for issuing and verifying SDJwt credentials
    const { signer, verifier } = await createSignerVerifier();

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


// Test functions of sdjwt
// (async () => {
//     const sdJwt = await createSdJwt();

//     const claims = {
//         firstname: 'John',
//         lastname: 'Doe',
//         ssn: '123-45-6789',
//         id: '1234',
//     };

//     const credentialPayload = {
//         iss: 'Issuer',
//         iat: new Date().getTime(),
//         vct: 'ExampleCredentials',
//         ...claims,
//     };

//     const disclosureFrame: DisclosureFrame<typeof claims> = {
//         _sd: ['firstname', 'lastname', 'ssn'],
//     };

//     // Issue a credential
//     const credential = await sdJwt.issueCredential(credentialPayload, disclosureFrame);
//     console.log('Issued Credential:', credential);

//     // Validate the credential
//     const valid = await sdJwt.validateCredential(credential);
//     console.log('Validation Result:', valid);

//     // Create a presentation
//     const presentationFrame = { firstname: true, id: true };
//     const presentation = await sdJwt.presentCredential(credential, presentationFrame);
//     console.log('Presentation:', presentation);

//     // Verify the presentation
//     const requiredClaims = ['firstname', 'id'];
//     const verified = await sdJwt.verifyPresentation(presentation, requiredClaims);
//     console.log('Verified:', verified);
// })();  