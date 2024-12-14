import { StyleSheet, Alert, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import { Buffer } from 'buffer';
import React from 'react';

// Polyfill for Buffer (to handle error its encountering)
global.Buffer = Buffer;

export default function OpenId() {
    const { authState, oidcRegister, unRegister, hasEmailHash, isLoading } = useAuth();
    console.log(authState);

    const handleRegistration = async () => {
        if (authState.oidcRegistered) {
            if (authState.pinRegistered) {
                router.replace('/biometric-setup');
            } else {
                router.replace('/pin-setup');
            }
        } else {
            const hasEmail = await hasEmailHash();
            if (hasEmail === null) { return; } // error retrieving email hash
            const firstTimeUser = !hasEmail;
            const success = await oidcRegister(firstTimeUser);
            if (success) {
                if (authState.pinRegistered) {
                    router.replace('/biometric-setup');
                } else {
                    router.replace('/pin-setup')
                }
            } else {
                Alert.alert('Error with registration');
                console.log(success)
            }
        }
    }

    const handleDeRegistration = async () => {
        unRegister();
    }

    return (
        <ThemedView style={styles.container}>
            <ThemedText type="title" style={styles.title}>
                Trinity Wallet
            </ThemedText>

            <ThemedText type="subtitle" style={styles.subtitle}>
                Secure Digital Identity Wallet
            </ThemedText>

            {isLoading ? (
                <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
            ) : (
                <>
                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={handleRegistration}
                        disabled={isLoading}
                    >
                        <ThemedText style={styles.loginButtonText}>
                            Register with Microsoft
                        </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.unregisterButton} // Add a new style for the unregister button if needed
                        onPress={handleDeRegistration}
                    >
                        <ThemedText style={styles.unregisterButtonText}>
                            UnRegister(Testing)
                        </ThemedText>
                    </TouchableOpacity>
                </>
            )}

            <ThemedText type="default" style={styles.securityNote}>
                This wallet uses multi-factor authentication to ensure your digital identity's security
            </ThemedText>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        marginBottom: 40,
        textAlign: 'center',
    },
    loader: {
        marginVertical: 20,
    },
    loginButton: {
        backgroundColor: '#0078D4', // Microsoft blue
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 8,
        width: '80%',
        alignItems: 'center',
        marginBottom: 20,
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    securityNote: {
        textAlign: 'center',
        marginTop: 20,
        paddingHorizontal: 40,
        opacity: 0.7,
    },
    unregisterButton: {
        marginTop: 10, // Space between the buttons
        padding: 15,
        backgroundColor: '#f8d7da', // Light red background
        borderRadius: 8,
        alignItems: 'center',
    },
    unregisterButtonText: {
        fontSize: 16,
        color: '#721c24', // Dark red text
    },    
});