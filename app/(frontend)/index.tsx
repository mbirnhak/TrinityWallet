// app/(frontend)/index.tsx

import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";

export default function Index() {
    const { authState, isLoading } = useAuth();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Wait for Root Layout to fully mount and other app states to load
        const timer = setTimeout(() => setIsReady(true), 0); // Wait one tick
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (isReady && !isLoading) {
            const determineInitialRoute = async () => {
                const isRegistered = authState.isRegistered;
                if (isRegistered) {
                    router.replace('/auth/login');
                } else {
                    console.log("before");
                    router.replace('/registration/openId');
                    console.log("after");
                }
            };
            
            determineInitialRoute();
        }
    }, [isReady, authState, isLoading]);

    if (!isReady || isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }
    return null;
}