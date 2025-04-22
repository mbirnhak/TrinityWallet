import { useContext, createContext, type PropsWithChildren, useEffect } from 'react';
import AuthenticationService, { AuthState } from '../services/Authentication';
import { useStorageState } from '@/hooks/useStorageState';

interface AuthProps {
    authState: AuthState;
    pinSetup: () => Promise<void>;
    biometricSetup: () => Promise<void>;
    signIn: (pin: string | null) => Promise<boolean>;
    signOut: () => Promise<void>;
    unRegister: () => Promise<void>;
    oidcRegister: (firstTimeUser: boolean) => Promise<boolean>;
    setForcePin: (forcePin: boolean) => Promise<void>;
    hasEmailHash: () => Promise<boolean | null>;
    isLoading: boolean;
    setIsLoading: (value: boolean) => void;
    verifyPin: (pin: string) => Promise<boolean>; // Added new function
}

const initialAuthState: AuthState = {
    isAuthenticated: false,
    idToken: null,
    wte: null,
    wia: null,
    error: null,
    oidcRegistered: false,
    pinRegistered: false,
    biometricsRegistered: false,
    forcePin: false,
}

const AuthContext = createContext<AuthProps>({
    authState: initialAuthState,
    pinSetup: async () => { },
    biometricSetup: async () => { },
    signIn: async (pin: string | null) => false,
    signOut: async () => { },
    unRegister: async () => { },
    oidcRegister: async (firstTimeUser: boolean) => false,
    setForcePin: async (forcePin: boolean) => { },
    hasEmailHash: async () => false,
    isLoading: false,
    setIsLoading: (value: boolean) => { },
    verifyPin: async (pin: string) => false, // Added new function default
})

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: PropsWithChildren) {
    const [authState, setAuthState] = useStorageState<AuthState>('authState', initialAuthState);
    const [isLoading, setIsLoading] = useStorageState<boolean>('isLoading', false);
    const auth = AuthenticationService.getInstance();

    useEffect(() => {
        // No setup needed on mount

        // Cleanup function that runs when component unmounts
        return () => {
            // Only sign out if they were authenticated
            if (authState.isAuthenticated) {
                // We can't use async directly in the cleanup function
                const performCleanup = async () => {
                    try {
                        console.log("Executing")
                        await signOut();
                    } catch (error) {
                        console.error('Logout during cleanup failed:', error);
                    }
                };

                performCleanup();
            }
        };
    }, []);

    /**
     * Sets pinRegistered value to true, indiciating PIN is setup
     */
    const pinSetup = async () => {
        setIsLoading(true);
        setAuthState({
            ...authState,
            pinRegistered: true,
        });
        setIsLoading(false);
    }

    // Sets biometricsRegistered value to true, indiciating biometrics are setup
    const biometricSetup = async () => {
        setIsLoading(true);
        setAuthState({
            ...authState,
            biometricsRegistered: true,
        });
        setIsLoading(false);
    }

    /**
     * Signs the user in using biometrics or return false and 
     * defers to the front end for pin entry
     * 
     * @param forcePin 
     * @returns 
     */
    const signIn = async (pin: string | null) => {
        setIsLoading(true);
        try {
            const success = await auth.authenticate(pin);
            setAuthState({
                ...authState,
                isAuthenticated: success,
            });
            return success
        } catch (error) {
            console.error('Authentication failed with error: ', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }

    /**
     * Verifies PIN without changing authentication state
     * Used for operations like credential requests that need PIN verification
     * but shouldn't log out the user on failure
     */
    const verifyPin = async (pin: string): Promise<boolean> => {
        try {
            const success = await auth.verifyPin(pin);
            return success;
        } catch (error) {
            console.error('PIN verification failed with error:', error);
            return false;
        }
    }

    /**
     * Signs the user out. Leaves them registered.
     */
    const signOut = async () => {
        setIsLoading(true);
        try {
            await auth.logout();
            setAuthState({
                ...authState,
                isAuthenticated: false,
            });
        } catch (error) {
            console.error('Logout failed with error: ', error);
        } finally {
            setIsLoading(false);
        }
    }

    /**
     * Have the user Register with their Microsoft email. The front 
     * end will deal with the rest of registration --- determines whether
     * the user is registering as a first time user or they are re-registering
     * but they have an existing account.
     *  
     * */
    const oidcRegister = async (firstTimeUser: boolean) => {
        setIsLoading(true);
        try {
            const success = await auth.performOpenIDAuthentication(true);
            setAuthState({
                ...authState,
                oidcRegistered: success,
            });
            return success;
        } catch (error) {
            console.error('Error Registering with OpenIDC: ', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }

    /**
     * Fully signs the user out and unregisters them with Microsoft.
    */
    const unRegister = async () => {
        setIsLoading(true);
        try {
            await auth.deAuthorize();
            setAuthState({
                ...authState,
                isAuthenticated: false,
                oidcRegistered: false,
                idToken: null,
            });
            console.log(authState);
        } catch (error) {
            console.error('Logout failed with error: ', error);
        } finally {
            setIsLoading(false);
        }
    }

    const setForcePin = async (forcePin: boolean) => {
        setAuthState({
            ...authState,
            forcePin,
        })
    }

    const hasEmailHash = async () => {
        const hasEmail = await auth.hasEmailHash();
        return hasEmail;
    }

    return (
        <AuthContext.Provider
            value={{
                authState,
                pinSetup,
                biometricSetup,
                signIn,
                signOut,
                unRegister,
                oidcRegister,
                setForcePin,
                hasEmailHash,
                isLoading,
                setIsLoading,
                verifyPin, // Added new function to context
            }}>
            {children}
        </AuthContext.Provider>
    )
}