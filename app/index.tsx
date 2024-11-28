// app/index.tsx

import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import AuthenticationService from "./Back-end/Authentication";

export default function Index() {
    useEffect(() => {
        checkAuthAndRedirect();
    }, []);

    const checkAuthAndRedirect = async () => {
        const auth = AuthenticationService.getInstance();
        const isAuthenticated = await auth.checkAuthStatus();
        
        if (isAuthenticated) {
            router.replace('./Front-end/home');
        } else {
            router.replace('./Front-end/login');
        }
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" />
        </View>
    );
}