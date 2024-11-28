// app/index.tsx

import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import AuthenticationService from "./backend/Authentication";
import * as SecureStore from 'expo-secure-store';

export default function Index() {
    useEffect(() => {
        determineInitialRoute();
    }, []);

    const determineInitialRoute = async () => {
        try {
            const auth = AuthenticationService.getInstance();
            const isFirstTime = await auth.isFirstTimeUser();
            const isAuthenticated = await auth.checkAuthStatus();
            const lastRestartTime = await SecureStore.getItemAsync('lastRestartTime');

            if (isFirstTime) {
                router.replace('./frontend/login');
            } else if (!isAuthenticated) {
                router.replace('./frontend/auth/pin-login');
            } else if (!lastRestartTime) {
                // Device was restarted, force PIN login
                router.replace('./frontend/auth/pin-login');
            } else {
                router.replace('./frontend/home');
            }
        } catch (error) {
            console.error('Error determining initial route:', error);
            router.replace('./frontend/login');
        }
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" />
        </View>
    );
}