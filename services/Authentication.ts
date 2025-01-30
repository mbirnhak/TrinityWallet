// app/backend/Authentication.ts

import * as AuthSession from 'expo-auth-session';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import { bcryptVerifyHash, generateSalt, shaHash, verifyAgainstShaHash } from './Utils/crypto';
import { storedValueKeys } from './Utils/enums';

interface CustomJwtPayload extends JwtPayload {
    email?: string;
}

interface BiometricCheckResult {
    isAvailable: boolean;
    hasHardware: boolean;
    isEnrolled: boolean;
    shouldConfigureSettings: boolean;
}

export interface AuthState {
    isAuthenticated: boolean;
    idToken: string | null;
    wte: {} | null;
    wia: {} | null;
    error: string | null;
    oidcRegistered: boolean;
    pinRegistered: boolean;
    biometricsRegistered: boolean;
    forcePin: boolean;
}

const OPENID_CONFIG = {
    issuer: 'https://login.microsoftonline.com/a6cda06a-52d9-4672-ae1f-f6f9c9f14e37/v2.0',
    clientId: '325c7a3b-15c1-4f6c-b0ec-c9c768da0816',
    redirectUrl: 'trinwallet://auth/',
    scopes: ['openid', 'email'],
    additionalParameters: {
        prompt: 'login'
    },
    usePKCE: true
};

/**
     * Checks availability to use biometrics.
     * 
     * @returns true if biomeitrc are enrolled, available, and user has consented to use them, 
     * otherwise it returns false.
     */
export async function biometricAvailability(): Promise<BiometricCheckResult> {
    try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        
        return {
            isAvailable: hasHardware && isEnrolled,
            hasHardware,
            isEnrolled,
            shouldConfigureSettings: !hasHardware || !isEnrolled
        };
    } catch (error) {
        console.error('Error checking biometric availability:', error);
        return {
            isAvailable: false,
            hasHardware: false,
            isEnrolled: false,
            shouldConfigureSettings: true
        };
    }
}

class AuthenticationService {
    private static instance: AuthenticationService;
    private authState: AuthState = {
        isAuthenticated: false,
        idToken: null,
        wte: null,
        wia: null,
        error: null,
        oidcRegistered: false,
        pinRegistered: false,
        biometricsRegistered: false,
        forcePin: false,
    };
    private lastAuthMethod: 'PIN' | 'BIOMETRIC' | null = null;

    private constructor() { }

    public static getInstance(): AuthenticationService {
        if (!AuthenticationService.instance) {
            AuthenticationService.instance = new AuthenticationService();
        }
        return AuthenticationService.instance;
    }

    // Returns true if the the user has an email hash already saved, otherwise false
    async hasEmailHash(): Promise<boolean | null> {
        try {
            const emailHash = await SecureStore.getItemAsync(storedValueKeys.EMAIL)
            // if null or empty, return false
            if (!emailHash) {
                return false;
            }
            return true; // email exists
        } catch (error) {
            console.error('Error retrieving value from storage: ', error);
            return null;
        }
    }

    // Decodes JWT Token and returns the decoded form or null
    decodeToken(token: string) {
        try {
            const decoded = jwtDecode(token);
            return decoded;
        } catch (error) {
            console.error('Error Decoding JWT Token: ', error);
            return null;
        }
    }

    /**
     * Perform OpenID Connect Authentication to Microsoft Azure. Only done during registration
     * or after a specified time period.
     * 
     * @returns True if successfully authenticated, or false if not
     */
    async performOpenIDAuthentication(firstTimeUser: boolean = false): Promise<boolean> {
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

            // check if the request was successful, if so exchange authorization code for tokens
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

                /**
                 * if token response contains an id token, try to extract the email and either check
                 * it against stored email hash, or store it if its a first time user
                 *  */
                if (tokenResponse.idToken) {
                    // extract email from JWT token
                    const decoded: CustomJwtPayload | null = this.decodeToken(tokenResponse.idToken);
                    const emailEntered = decoded?.email ?? null;

                    // return error if email is not shown
                    if (!emailEntered) {
                        console.error('Error Extracting Email from JWT: ', decoded);
                        return false;
                    }

                    // if a user is re-registering check their email against the stored one, else store their email
                    if (firstTimeUser !== true) {
                        const emailMatches = await verifyAgainstShaHash(storedValueKeys.EMAIL, emailEntered)

                        if (emailMatches) {
                            await SecureStore.setItemAsync(storedValueKeys.ID_TOKEN, tokenResponse.idToken);
                            this.authState.idToken = tokenResponse.idToken;
                            return true;
                        } else {
                            console.log('Email does not matched the one you registered with')
                            return false;
                        }
                    } else {
                        await SecureStore.setItemAsync(storedValueKeys.ID_TOKEN, tokenResponse.idToken);
                        const hashedEmail = await shaHash(emailEntered, await generateSalt());
                        if (!hashedEmail) {
                            console.error('Failed to hash the email, aborting registration.');
                            return false; // Abort the process if hashing fails
                        }
                        await SecureStore.setItemAsync(storedValueKeys.EMAIL, hashedEmail);
                        this.authState.idToken = tokenResponse.idToken;
                        return true;
                    }
                } else {
                    console.log("ID Token was empty: ", tokenResponse.idToken);
                    return false;
                }
            }
            console.log("OpenIDC Authentication Failed or was Canceled");
            return false;
        } catch (error) {
            console.error('OpenID Authentication Error:', error);
            return false;
        }
    }

    /**
     * Authenticates the user using biometrics.
     * 
     * @returns True if successful, false if biometrics are not available,
     * it was unsuccesful, or an error occurred.
     */
    private async authenticateWithBiometrics(): Promise<boolean> {
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Verify your identity',
                fallbackLabel: 'Use PIN instead',
                // handle fallback using app PIN rather than device passcode
                // disableDeviceFallback: true,
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
     * Authenticate the user with either PIN or Biometrics
     * 
     * @param pin If a value is provided the function attempts to authenticate using pin, otherwise it uses biometrics
     * @returns True if the user is successfully authenticated, false if unsuccessful
     */
    async authenticate(pin: string | null): Promise<boolean> {
        try {
            // Authenticates with biometrics if no pin provided
            if (!pin) {
                const biometricSuccess = await this.authenticateWithBiometrics();
                if (biometricSuccess) {
                    this.authState.isAuthenticated = true;
                    return true;
                } else {
                    this.authState.isAuthenticated = false;
                    return false;
                }
            } else {
                // check PIN against stored hash
                const storedHash = await SecureStore.getItemAsync(storedValueKeys.PIN);
                if (!storedHash) return false;
                const pinMatches = await bcryptVerifyHash(pin, storedHash);
                return pinMatches;
            }
        } catch (error) {
            this.authState.error = error instanceof Error ? error.message : 'Authentication failed';
            return false;
        }
    }

    // Logout but remain authenticate with OpenIDC (just need to enter PIN or Biometrics to log back in)
    async logout(): Promise<void> {
        this.authState = {
            isAuthenticated: false,
            idToken: this.authState.idToken,
            wte: null,
            wia: null,
            error: null,
            oidcRegistered: this.authState.oidcRegistered,
            pinRegistered: this.authState.pinRegistered,
            biometricsRegistered: this.authState.biometricsRegistered,
            forcePin: this.authState.forcePin,
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
            oidcRegistered: false,
            pinRegistered: this.authState.pinRegistered,
            biometricsRegistered: this.authState.biometricsRegistered,
            forcePin: true,
        };
    }

    getLastAuthMethod(): string | null {
        return this.lastAuthMethod;
    }
}

export default AuthenticationService;