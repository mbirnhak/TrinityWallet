// app/_rootLayout.tsx

import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { AuthProvider } from "../context/AuthContext";
import * as SecureStore from 'expo-secure-store';

const StackLayout = () => {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen 
                name="index"
                options={{ 
                    title: "Trinity Wallet"
                }}
            />
            <Stack.Screen 
                name="frontend/registration/registration"
                options={{ 
                    gestureEnabled: false
                }}
            />
            <Stack.Screen 
                name="frontend/auth/login"
                options={{ 
                    gestureEnabled: false
                }}
            />
            <Stack.Screen 
                name="frontend/registration/pin-setup"
                options={{ 
                    gestureEnabled: false
                }}
            />
            <Stack.Screen 
                name="frontend/registration/biometric-setup"
                options={{ 
                    gestureEnabled: false
                }}
            />
        </Stack>
    );
}

export default function RootLayout() {
    // const [isInitialized, setIsInitialized] = useState(false);

    // useEffect(() => {
    //     checkInitialRoute();
    // }, []);

    // const checkInitialRoute = async () => {
    //     const auth = AuthenticationService.getInstance();
    //     const isFirstTime = await auth.isFirstTimeUser();
    //     const isAuthenticated = await auth.checkAuthStatus();
    //     const lastRestartTime = await SecureStore.getItemAsync('lastRestartTime');
    //     const currentTime = Date.now().toString();

    //     // Store new restart time if needed
    //     if (!lastRestartTime) {
    //         await SecureStore.setItemAsync('lastRestartTime', currentTime);
    //     }

    //     setIsInitialized(true);
    // };

    // if (!isInitialized) {
    //     return null;
    // }
    return (
        <AuthProvider>
            <StackLayout />
        </AuthProvider>
    )
}