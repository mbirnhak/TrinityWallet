// app/backend/Authentication.ts

import * as AuthSession from 'expo-auth-session';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import decode from 'expo-jwt'

const OPENID_CONFIG = {
    issuer: 'https://login.microsoftonline.com/4ba15b4b-7d11-4be1-a2fb-df28939a3e0c/v2.0',
    clientId: 'a4bde670-76fa-4bcf-8592-3c378e086e23',
    redirectUrl: 'trinwallet://auth/',
    scopes: ['openid'],
    additionalParameters: {
        prompt: 'login'
    },
    usePKCE: true
};

export interface AuthState {
    isAuthenticated: boolean;
    idToken: string | null;
    wte: {} | null;
    wia: {} | null;
    error: string | null;
    isRegistered: boolean;
}

// List of all keys used to store values in Secure Store
export enum storedValueKeys {
    PIN = 'walletPIN',
    EMAIL = 'hashedEmail',
}

class AuthenticationService {
    private static instance: AuthenticationService;
    private authState: AuthState = {
        isAuthenticated: false,
        idToken: null,
        wte: null,
        wia: null,
        error: null,
        isRegistered: false
    };
    private lastAuthMethod: 'PIN' | 'BIOMETRIC' | null = null;

    private constructor() {}

    public static getInstance(): AuthenticationService {
        if (!AuthenticationService.instance) {
            AuthenticationService.instance = new AuthenticationService();
        }
        return AuthenticationService.instance;
    }

    // returns true if the the user is not registered with OpenIDC and does not have a PIN already saved
    async isFirstTimeUser(): Promise<boolean> {
        const isRegistered = await SecureStore.getItemAsync('isRegistered');
        const hasPin = await SecureStore.getItemAsync('walletPIN')
        return (isRegistered !== 'true' && !!hasPin);
    }

    const decodeAzureIdToken = (token) => {
        try {
            const decoded = decode(token)
        }
    }

    /**
     * Perform OpenID Connect Authentication to Microsoft Azure. Only done during registration
     * or after a specified time period.
     * 
     * @returns True if successfully authenticated, or false if not
     */
    async performOpenIDAuthentication(reRegistering: boolean = false): Promise<boolean> {
        try {
            const discovery = await AuthSession.fetchDiscoveryAsync(OPENID_CONFIG.issuer);
            const authRequest = new AuthSession.AuthRequest({
                clientId: OPENID_CONFIG.clientId,
                scopes: OPENID_CONFIG.scopes,
                redirectUri: OPENID_CONFIG.redirectUrl,
                extraParams: OPENID_CONFIG.additionalParameters,
                usePKCE: OPENID_CONFIG.usePKCE,
            });

            const authResult = await authRequest.promptAsync(discovery);
            
            if (authResult.type === 'success' && authResult.params.code) {
                const accessTokenConfig: AuthSession.AccessTokenRequestConfig = {
                    code: authResult.params.code,
                    clientId: OPENID_CONFIG.clientId,
                    redirectUri: OPENID_CONFIG.redirectUrl,
                    scopes: OPENID_CONFIG.scopes,
                    extraParams: authRequest.codeVerifier ? { code_verifier: authRequest.codeVerifier } : undefined,
                };

                const tokenResponse = await AuthSession.exchangeCodeAsync(
                    accessTokenConfig,
                    discovery
                );

                if (tokenResponse.idToken) {

                    if (reRegistering === true) {
                        const emailMatches = await this.verify(storedValueKeys.EMAIL, authenticatedEmail)

                        if (emailMatches) {
                            await SecureStore.setItemAsync('idToken', tokenResponse.idToken);
                            this.authState.idToken = tokenResponse.idToken;
                            return true;
                        } else {
                            console.log('Email does not matched the one you registered with')
                            return false;
                        }

                    }

                } else {
                    console.log("ID Token was empty: ", tokenResponse.idToken);
                    return false;
                }
            }
            console.log("OpenIDC Authentication Failed");
            return false;
        } catch (error) {
            console.error('OpenID Authentication Error:', error);
            return false;
        }
    }

    /**
     * Checks whether the value entered matches the hash stored
     * 
     * @param key The string used to store the value in the key store
     * @param value The string that is being checked for correctness
     * @returns True if the value is correct, otherwise false
     */
    async verify(key: string, value: string | null): Promise<boolean> {
        if (value === null) {
            console.log('Value enter is null: ', value);
            return false;
        }

        try {
            const storedData = await SecureStore.getItemAsync(key);
            if (!storedData) return false;

            const { hash: storedHash, salt } = JSON.parse(storedData);
            const valueSalt = value + salt;
            const inputHash = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                valueSalt
            );

            return storedHash === inputHash;
        } catch (error) {
            console.error('Hash Verification Error:', error);
            return false;
        }
    }

    /**
     * Authenticates the user using biometrics if it is available.
     * 
     * @returns True if successful, false if unsuccesfull or not available
     */
    private async authenticateWithBiometrics(): Promise<boolean> {
        try {
            const biometricsEnabled = await SecureStore.getItemAsync('biometricsEnabled');
            if (biometricsEnabled !== 'true') return false;

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Verify your identity',
                fallbackLabel: 'Use PIN instead',
                disableDeviceFallback: false
            });

            if (result.success) {
                this.lastAuthMethod = 'BIOMETRIC';
                return true;
            }
            return false;
        } catch (error) {
            console.error('Biometric authentication error:', error);
            return false;
        }
    }

    /**
     * Register the user with OpenIDC and create a PIN
     * 
     * @returns true if successful
     */
    async registerAndCreatePin(): Promise<boolean> {
        try {
            const openIdSuccess = await this.performOpenIDAuthentication();
            if (!openIdSuccess) {
                throw new Error('OpenID authentication failed');
            }
            return true;
        } catch (error) {
            this.authState.error = error instanceof Error ? error.message : 'Authentication failed';
            return false;
        }
    }

    /**
     * Register the user with OpenIDC and verify that they still know their PIN
     * 
     * @returns true if successful
     */
    async registerAndVerifyPin(): Promise<boolean> {
        try {
            const openIdSuccess = await this.performOpenIDAuthentication();
            if (!openIdSuccess) {
                throw new Error('OpenID authentication failed');
            }
            return true;
        } catch (error) {
            this.authState.error = error instanceof Error ? error.message : 'Authentication failed';
            return false;
        }
    }

    /**
     * Authenticate the user with either PIN or Biometrics
     * 
     * @param forcePIN Forces the user to sign in using PIN if set True, else it uses Biometrics for login
     * @returns True if the user is successfully authenticated, false if unsuccessful or if PIN is required
     */
    async authenticate(forcePIN: boolean = false): Promise<boolean> {
        try {
            // Regular authentication flow
            if (!forcePIN) {
                const biometricSuccess = await this.authenticateWithBiometrics();
                if (biometricSuccess) {
                    this.authState.isAuthenticated = true;
                    return true;
                }
            }
            // PIN is required or biometric failed
            return false; // Let the UI handle PIN input
        } catch (error) {
            this.authState.error = error instanceof Error ? error.message : 'Authentication failed';
            return false;
        }
    }

    // Logout but remain authenticate with OpenIDC (just need to enter PIN or Biometrics to log back in)
    async logout(): Promise<void> {
        this.authState = {
            isAuthenticated: false,
            idToken: null,
            wte: null,
            wia: null,
            error: null,
            isRegistered: true,
        };
    }

    // Logout and rest Authenticate with OpenIDC (need to re-auth with OpenIDC and confirm PIN)
    async deAuthorize(): Promise<void> {
        await SecureStore.deleteItemAsync('idToken');
        this.lastAuthMethod = null;
        this.authState = {
            isAuthenticated: false,
            idToken: null,
            wte: null,
            wia: null,
            error: null,
            isRegistered: false,
        };
    }

    async checkRegistrationStatus(): Promise<boolean> {
        const token = await SecureStore.getItemAsync('idToken');
        const wte = await SecureStore.getItemAsync('wte');
        const wia = await SecureStore.getItemAsync('wia');
        this.authState.idToken = token;
        this.authState.wte = wte;
        this.authState.wia = wia;
        const isRegistered = await SecureStore.getItemAsync('isRegistered');
        this.authState.isRegistered = isRegistered === 'true';
        return this.authState.isRegistered;
    }

    async checkLoginStatus(): Promise<boolean> {
        const isAuthenticated = await SecureStore.getItemAsync('isAuthenticated');
        this.authState.isAuthenticated = isAuthenticated === 'true';
        return this.authState.isAuthenticated;
    }

    getAuthState(): AuthState {
        return { ...this.authState };
    }

    getLastAuthMethod(): string | null {
        return this.lastAuthMethod;
    }
}

export default AuthenticationService;