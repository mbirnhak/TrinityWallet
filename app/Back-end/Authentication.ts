// app/backend/Authentication.ts
import * as AuthSession from 'expo-auth-session'
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const config = {
    issuer: 'https://login.microsoftonline.com/4ba15b4b-7d11-4be1-a2fb-df28939a3e0c/v2.0',
    // issuer: 'https://login.microsoftonline.com/common', //use common (common/v2.0 only allows work/school) for multi-tenant sign in, use tenant id for tenant specific sign in
    clientId: 'a4bde670-76fa-4bcf-8592-3c378e086e23',
    redirectUrl: 'trinwallet://auth/',
    scopes: ['openid','email'],
    additionalParameters: {
        prompt: 'login'
    },
    usePKCE: true,
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

    private constructor() { }

    public static getInstance(): AuthenticationService {
        if (!AuthenticationService.instance) {
            AuthenticationService.instance = new AuthenticationService();
        }
        return AuthenticationService.instance;
    }

    async performOpenIDAuthentication(): Promise<boolean> {
        try {
            console.log('Starting OpenID authentication...');

            const discovery = await AuthSession.fetchDiscoveryAsync(config.issuer);
            const authRequest = new AuthSession.AuthRequest({
                clientId: config.clientId,
                scopes: config.scopes,
                redirectUri: config.redirectUrl,
                extraParams: config.additionalParameters,
                usePKCE: config.usePKCE,
            });

            const authResult = await authRequest.promptAsync(discovery);
            
            // Ensure authorizaiton code is recieved, then exchange for tokens
            if (authResult.type === 'success' && authResult.params.code) {
                console.log('Auth Code Received:', authResult.params.code);

                const accessTokenConfig: AuthSession.AccessTokenRequestConfig = {
                    code: authResult.params.code,
                    clientId: config.clientId,
                    redirectUri: config.redirectUrl,
                    scopes: config.scopes,
                    extraParams: authRequest.codeVerifier ? { code_verifier: authRequest.codeVerifier } : undefined,
                };

                const tokenResponse = await AuthSession.exchangeCodeAsync(accessTokenConfig, discovery);
                console.log('Token Response:', tokenResponse)

                if(tokenResponse.idToken){
                    console.log('Authentication Successfull!')
                    await SecureStore.setItemAsync('idToken', tokenResponse.idToken);
                    this.authState.idToken = tokenResponse.idToken;
                    return true;
                } else {
                    console.error('ID Token Missing:', tokenResponse);
                    this.authState.error = 'ID Token not found in response';
                    return false;
                }
            } else {
                console.error('Authentication Failed or Cancelled:', authResult);
                this.authState.error = 'Authentication cancelled or failed';
                return false;
            }

        } catch (error) {
            console.error('OpenID Authentication Error:', error);
            this.authState.error = error instanceof Error ? error.message : 'Authentication failed';
            return false;
        }
    }

    // async performBiometricAuthentication(): Promise<boolean> {
    //     try {
    //         const hasHardware = await LocalAuthentication.hasHardwareAsync();
    //         const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    //         if (!hasHardware || !isEnrolled) {
    //             console.log('Biometric authentication not available');
    //             return true; // For development, return true if biometrics aren't available
    //         }

    //         const result = await LocalAuthentication.authenticateAsync({
    //             promptMessage: "Verify your identity",
    //             fallbackLabel: "Use passcode"
    //         });

    //         return result.success;
    //     } catch (error) {
    //         console.error('Biometric Authentication Error:', error);
    //         return false;
    //     }
    // }

    async authenticate(): Promise<boolean> {
        try {
            const openIdSuccess = await this.performOpenIDAuthentication();
            if (!openIdSuccess) {
                throw new Error('OpenID authentication failed');
            }

            // const biometricSuccess = await this.performBiometricAuthentication();
            // if (!biometricSuccess) {
            //     throw new Error('Biometric authentication failed');
            // }

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
        // this.authState.isAuthenticated = !!token;
        this.authState.isAuthenticated = false;
        this.authState.idToken = token;
        return this.authState.isAuthenticated;
    }

    getAuthState() {
        return { ...this.authState };
    }
}

export default AuthenticationService;