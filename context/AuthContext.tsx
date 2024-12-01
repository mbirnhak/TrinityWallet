import { useContext, createContext, type PropsWithChildren } from 'react';
import AuthenticationService, { AuthState } from '../app/backend/Authentication'
import { useStorageState } from '@/hooks/useStorageState';

interface AuthProps {
    authState: AuthState;
    signIn: (forcePin: boolean) => Promise<boolean>;
    signOut: () => void;
    register: () => Promise<boolean>;
    isLoading: boolean;
}

const initialAuthState: AuthState = {
    isAuthenticated: false,
    idToken: null,
    wte: null,
    wia: null,
    error: null,
    isRegistered: false,
}

const AuthContext = createContext<AuthProps>({
    authState: initialAuthState,
    signIn: async (forcePin: boolean) => false,
    signOut: () => null,
    register: async () => false,
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
            if (success) {
                setAuthState((prevState) => ({
                    ...prevState,
                    isAuthenticated: true,
                }));                    
            } else {
                setAuthState({
                    ...authState,
                    isAuthenticated: false
                });   
            }
            return success
        } catch (error) {
            console.error('Authentication failed with error: ', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }

    /**
     * Fully signs the user out.
     */
    const signOut = async () => {
        setIsLoading(true);
        try {
            await auth.logout();
            setAuthState(initialAuthState);
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
    const register = async () => {
        setIsLoading(true);
        try {
            const success = await auth.performOpenIDAuthentication();
            return success;
        } catch (error) {
            console.error('Error Registering with OpenIDC: ', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <AuthContext.Provider value={{ authState, signIn, signOut, register, isLoading }}>
            {children}
        </AuthContext.Provider>
    )
}