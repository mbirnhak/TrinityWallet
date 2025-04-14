// app/callback.tsx
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { storedValueKeys } from '@/services/Utils/enums';
import { retrieve_authorization_request } from '@/services/Transactions/credentialPresentation';

export default function PresentationCallback() {
    const params = useLocalSearchParams();
    const router = useRouter();

    useEffect(() => {
        async function handleCallback() {
            try {
                console.log('[Presentation Callback] Received params:', params);
                const request_uri = params.request_uri as string;
                const client_id = params.client_id as string;

                if (request_uri && client_id) {
                    console.log("Request URI: ", request_uri);
                    console.log("Client ID: ", client_id);
                    await SecureStore.setItemAsync(storedValueKeys.VERIFIER_CLIENT_ID_KEY, client_id)
                    await retrieve_authorization_request(request_uri)
                    router.replace('/(app)/home');
                } else {
                    console.log('[Presentation Callback] Missing required parameters');
                    router.replace('/(app)/home');
                }
            } catch (error) {
                console.error('[Presentation Callback] Error:', error);
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