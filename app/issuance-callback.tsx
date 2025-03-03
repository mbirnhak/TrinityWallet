// app/issuance-callback.tsx
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { exchangeCodeForToken } from '../services/Transactions/credentialIssuance';
import { storedValueKeys } from '@/services/Utils/enums';

export default function IssuanceCallback() {
    const params = useLocalSearchParams();
    const router = useRouter();

    useEffect(() => {
        async function handleCallback() {
            try {
                console.log('[Issuance Callback] Received params:', params);

                if (params.code && params.state) {
                    // Verify state
                    const storedState = await SecureStore.getItemAsync(storedValueKeys.STATE_KEY);
                    if (storedState !== params.state) {
                        console.error('[Deep Link] State mismatch');
                        Alert.alert('Error', 'Invalid state parameter');
                        return;
                    }
                    const metadata = await SecureStore.getItemAsync('issuer_metadata');
                    if (metadata) {
                        const oidcMetadata = JSON.parse(metadata);
                        await exchangeCodeForToken(params.code as string, oidcMetadata);
                        router.replace('/(app)/home');
                    }
                } else {
                    console.log('[Issuance Callback] Missing required parameters');
                    router.replace('/(app)/home');
                }
            } catch (error) {
                console.error('[Issuance Callback] Error:', error);
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