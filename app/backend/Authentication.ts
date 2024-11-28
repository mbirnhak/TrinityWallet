// app/backend/Authentication.ts

import * as AuthSession from 'expo-auth-session';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

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

interface AuthState {
    isAuthenticated: boolean;
    idToken: string | null;
    error: string | null;
    isRegistered: boolean;
}

class AuthenticationService {
    private static instance: AuthenticationService;
    private authState: AuthState = {
        isAuthenticated: false,
        idToken: null,
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

    async isFirstTimeUser(): Promise<boolean> {
        const isRegistered = await SecureStore.getItemAsync('isRegistered');
        return isRegistered !== 'true';
    }

    async verifyPin(inputPin: string): Promise<boolean> {
        try {
            const storedPinData = await SecureStore.getItemAsync('walletPIN');
            if (!storedPinData) return false;

            const { hash: storedHash, salt } = JSON.parse(storedPinData);
            const pinWithSalt = inputPin + salt;
            const inputHash = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                pinWithSalt
            );

            return storedHash === inputHash;
        } catch (error) {
            console.error('PIN verification error:', error);
            return false;
        }
    }

    async performOpenIDAuthentication(): Promise<boolean> {
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
                    await SecureStore.setItemAsync('idToken', tokenResponse.idToken);
                    this.authState.idToken = tokenResponse.idToken;
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('OpenID Authentication Error:', error);
            return false;
        }
    }

    async authenticateWithBiometrics(): Promise<boolean> {
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

    async authenticate(forcePIN: boolean = false): Promise<boolean> {
        try {
            // First-time user flow
            const isFirstTime = await this.isFirstTimeUser();
            if (isFirstTime) {
                const openIdSuccess = await this.performOpenIDAuthentication();
                if (!openIdSuccess) {
                    throw new Error('OpenID authentication failed');
                }
                return true;
            }

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

    async logout(): Promise<void> {
        await SecureStore.deleteItemAsync('idToken');
        this.lastAuthMethod = null;
        this.authState = {
            isAuthenticated: false,
            idToken: null,
            error: null,
            isRegistered: true
        };
    }

    async checkAuthStatus(): Promise<boolean> {
        const token = await SecureStore.getItemAsync('idToken');
        this.authState.isAuthenticated = !!token;
        this.authState.idToken = token;
        const isRegistered = await SecureStore.getItemAsync('isRegistered');
        this.authState.isRegistered = isRegistered === 'true';
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