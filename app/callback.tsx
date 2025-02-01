// app/callback.tsx
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { exchangeCodeForToken } from '../services/credentialIssuance';

export default function Callback() {
    const params = useLocalSearchParams();
    const router = useRouter();

    useEffect(() => {
        async function handleCallback() {
            try {
                console.log('[Callback] Received params:', params);
                
                if (params.code && params.state) {
                    const metadata = await SecureStore.getItemAsync('issuer_metadata');
                    if (metadata) {
                        const oidcMetadata = JSON.parse(metadata);
                        await exchangeCodeForToken(params.code as string, oidcMetadata);
                        router.replace('/(app)/home');
                    }
                } else {
                    console.log('[Callback] Missing required parameters');
                    router.replace('/(app)/home');
                }
            } catch (error) {
                console.error('[Callback] Error:', error);
                router.replace('/(app)/home');
            }
        }

        handleCallback();
    }, [params, router]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#0078D4" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff',
    },
});