import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';

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
                const oidcRegistered = authState?.oidcRegistered;
                const pinRegistered = authState?.pinRegistered;
                const biometricsRegistered = authState?.biometricsRegistered;
                console.log("AuthState: ", authState);
                if (oidcRegistered && pinRegistered && biometricsRegistered) {
                    router.replace('/login');
                } else {
                    router.replace('/openId');
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