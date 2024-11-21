// app/backend/Authentication.ts

import { authorize, AuthConfiguration } from 'react-native-app-auth';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const config: AuthConfiguration = {
    issuer: 'https://login.microsoftonline.com/4ba15b4b-7d11-4be1-a2fb-df28939a3e0c/v2.0',
    clientId: 'a4bde670-76fa-4bcf-8592-3c378e086e23',
    redirectUrl: 'trinwallet://auth',
    scopes: ['openid', 'profile', 'email'], // Remove the profile and email scopes
    additionalParameters: {
        prompt: 'login'
    },
    warmAndPrefetchChrome: true,
    usePKCE: true
};

class AuthenticationService {
    private static instance: AuthenticationService;
    private authState: {
        isAuthenticated: boolean;
        idToken: string | null;
        error: string | null;
    } = {
        isAuthenticated: false,
        idToken: null,
        error: null
    };

    private constructor() {}

    public static getInstance(): AuthenticationService {
        if (!AuthenticationService.instance) {
            AuthenticationService.instance = new AuthenticationService();
        }
        return AuthenticationService.instance;
    }

    async performOpenIDAuthentication(): Promise<boolean> {
        try {
            console.log('Starting OpenID authentication...');
            const authResult = await authorize(config);
            console.log('Auth Result:', authResult);

            if (authResult?.idToken) {
                await SecureStore.setItemAsync('idToken', authResult.idToken);
                this.authState.idToken = authResult.idToken;
                this.authState.isAuthenticated = true;
                return true;
            }
            return false;
        } catch (error) {
            console.error('OpenID Authentication Error:', error);
            this.authState.error = error instanceof Error ? error.message : 'Authentication failed';
            return false;
        }
    }

    async performBiometricAuthentication(): Promise<boolean> {
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (!hasHardware || !isEnrolled) {
                console.log('Biometric authentication not available');
                return true; // For development, return true if biometrics aren't available
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: "Verify your identity",
                fallbackLabel: "Use passcode"
            });

            return result.success;
        } catch (error) {
            console.error('Biometric Authentication Error:', error);
            return false;
        }
    }

    async authenticate(): Promise<boolean> {
        try {
            const openIdSuccess = await this.performOpenIDAuthentication();
            if (!openIdSuccess) {
                throw new Error('OpenID authentication failed');
            }

            const biometricSuccess = await this.performBiometricAuthentication();
            if (!biometricSuccess) {
                throw new Error('Biometric authentication failed');
            }

            this.authState.isAuthenticated = true;
            return true;
        } catch (error) {
            this.authState.error = error instanceof Error ? error.message : 'Authentication failed';
            this.authState.isAuthenticated = false;
            return false;
        }
    }

    async logout(): Promise<void> {
        await SecureStore.deleteItemAsync('idToken');
        this.authState = {
            isAuthenticated: false,
            idToken: null,
            error: null
        };
    }

    async checkAuthStatus(): Promise<boolean> {
        const token = await SecureStore.getItemAsync('idToken');
        this.authState.isAuthenticated = !!token;
        this.authState.idToken = token;
        return this.authState.isAuthenticated;
    }

    getAuthState() {
        return { ...this.authState };
    }
}

export default AuthenticationService;

// Now, we should use both the methods the first time and then later on it should just be Biometrics