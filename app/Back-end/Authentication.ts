/**
 * This file deals with authenticating a user, using OpenIDC, in order
 * to unlock the wallet
 */
import AzureAuth from 'react-native-azure-auth';
import * as LocalAuthentication from 'expo-local-authentication';

/**
 * This function authenticates the user by making a secure call
 * to Trinity's Microsoft admin account to authenticate the
 * user
 */

const azureAuth = new AzureAuth({
    clientId: 'a4bde670-76fa-4bcf-8592-3c378e086e23',
    redirectUri: 'trinwallet://auth',
});

export async function openIDC(): Promise<boolean> {
    try {
        // optional paramters to authorize func
        const authResult = await azureAuth.webAuth.authorize({})
        if(authResult?.accessToken) {
            console.log('OIDC Authentication Succeeded', authResult);
            return true;
        } else {
            console.log('OIDC Authentication Failed', authResult);
            return false;
        }
    } catch (error) {
        if(error instanceof Error) {
            console.log('OIDC Authentication Failed', error.message);
        } else{
            console.log('OIDC Authentication Failed', error);
        }
        return false;
    }
}

/**
 * Uses biometrics to generate a passkey
 */
export async function biometrics(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync()
    const isEnrolled = await LocalAuthentication.isEnrolledAsync() // faceID/fingerprint is set up
    if(hasHardware && isEnrolled) {
        const biometricResult = await LocalAuthentication.authenticateAsync({
            promptMessage: "Authenticate with biometrics"
        });
        return biometricResult.success
    }
    console.log('Biometrics authentication is not supported or not enrolled');
    return false;
}