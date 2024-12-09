import { useContext, createContext, type PropsWithChildren } from 'react';
import AuthenticationService, { AuthState } from '@/services/Authentication'
import { useStorageState } from '@/hooks/useStorageState';

interface AuthProps {
    authState: AuthState;
    isFirstTimeUser: () => Promise<boolean | null>;
    signIn: (forcePin: boolean) => Promise<boolean>;
    signOut: () => void;
    unRegister: () => void;
    register: (firstTimeUser: boolean) => Promise<boolean>;
    setForcePin: (forcePin: boolean) => Promise<void>;
    isLoading: boolean;
}

const initialAuthState: AuthState = {
    isAuthenticated: false,
    idToken: null,
    wte: null,
    wia: null,
    error: null,
    isRegistered: false,
    forcePin: false,
}

const AuthContext = createContext<AuthProps>({
    authState: initialAuthState,
    isFirstTimeUser: async () => false,
    signIn: async (forcePin: boolean) => false,
    signOut: () => { },
    unRegister: () => { },
    register: async (firstTimeUser: boolean) => { console.log("Using Temp"); return false; },
    setForcePin: async (forcePin: boolean) => { },
    isLoading: false,
})

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: PropsWithChildren) {
    const [authState, setAuthState] = useStorageState<AuthState>('authState', initialAuthState);
    const [isLoading, setIsLoading] = useStorageState<boolean>('isLoading', false);
    const auth = AuthenticationService.getInstance();

    /**
     * Checks if user is a first time user.
     */
    const isFirstTimeUser = async () => {
        setIsLoading(true);
        try {
            const firstTime = await auth.isFirstTimeUser();
            return firstTime;
        } catch (error) {
            console.error('Logout failed with error: ', error);
            return null;
        } finally {
            setIsLoading(false);
        }
    }

    /**
     * Signs the user in using biometrics or return false and 
     * defers to the front end for pin entry
     * 
     * @param forcePin 
     * @returns 
     */
    const signIn = async (forcePin: boolean) => {
        setIsLoading(true);
        try {
            const success = await auth.authenticate(forcePin);
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
     * Signs the user out. Leaves them registered.
     */
    const signOut = async () => {
        setIsLoading(true);
        try {
            await auth.logout();
            setAuthState({
                ...initialAuthState,
                isRegistered: true,
            });
        } catch (error) {
            console.error('Logout failed with error: ', error);
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
            setAuthState(initialAuthState);
            console.log(authState);
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
    const register = async (firstTimeUser: boolean) => {
        setIsLoading(true);
        try {
            const success = await auth.performOpenIDAuthentication(true);
            return success;
        } catch (error) {
            console.error('Error Registering with OpenIDC: ', error);
            return false;
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

    return (
        <AuthContext.Provider
            value={{
                isFirstTimeUser,
                authState,
                signIn,
                signOut,
                unRegister,
                register,
                setForcePin,
                isLoading,
            }}>
            {children}
        </AuthContext.Provider>
    )
}