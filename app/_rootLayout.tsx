// app/_rootLayout.tsx

import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import AuthenticationService from "./backend/Authentication";
import * as SecureStore from 'expo-secure-store';

export default function RootLayout() {
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        checkInitialRoute();
    }, []);

    const checkInitialRoute = async () => {
        const auth = AuthenticationService.getInstance();
        const isFirstTime = await auth.isFirstTimeUser();
        const isAuthenticated = await auth.checkAuthStatus();
        const lastRestartTime = await SecureStore.getItemAsync('lastRestartTime');
        const currentTime = Date.now().toString();

        // Store new restart time if needed
        if (!lastRestartTime) {
            await SecureStore.setItemAsync('lastRestartTime', currentTime);
        }

        setIsInitialized(true);
    };

    if (!isInitialized) {
        return null;
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen 
                name="index"
                options={{ 
                    title: "Trinity Wallet"
                }}
            />
            <Stack.Screen 
                name="frontend/login"
                options={{ 
                    gestureEnabled: false
                }}
            />
            <Stack.Screen 
                name="frontend/auth/pin-login"
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
            <Stack.Screen 
                name="frontend/home"
                options={{ 
                    gestureEnabled: false,
                    headerShown: true,
                    title: "Trinity Wallet"
                }}
            />
        </Stack>
    );
}