// app/_rootLayout.tsx

import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import AuthenticationService from "./Back-end/Authentication";

export default function RootLayout() {
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const auth = AuthenticationService.getInstance();
        await auth.checkAuthStatus();
        setIsInitialized(true);
    };

    if (!isInitialized) {
        return null;
    }

    return (
        <Stack>
            <Stack.Screen 
                name="index" 
                options={{ 
                    title: "Trinity Wallet",
                    headerShown: false 
                }} 
            />
            <Stack.Screen 
                name="frontend/login" 
                options={{ 
                    title: "Login",
                    headerShown: false,
                    gestureEnabled: false,
                }} 
            />
            <Stack.Screen 
                name="frontend/home" 
                options={{ 
                    title: "Home",
                    headerShown: true,
                    gestureEnabled: false,
                }} 
            />
        </Stack>
    );
}