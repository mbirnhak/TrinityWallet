// app/frontend/login.tsx

import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import AuthenticationService from '../backend/Authentication';

export default function Login() {
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        checkExistingAuth();
    }, []);

    const checkExistingAuth = async () => {
        const auth = AuthenticationService.getInstance();
        const isAuthenticated = await auth.checkAuthStatus();
        if (isAuthenticated) {
            router.replace('./Front-end/home');
        }
    };

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            const auth = AuthenticationService.getInstance();
            const success = await auth.authenticate();

            if (success) {
                router.replace('./Front-end/home');
            } else {
                const { error } = auth.getAuthState();
                Alert.alert(
                    'Authentication Failed',
                    error || 'Please try again',
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            Alert.alert(
                'Error',
                'An unexpected error occurred',
                [{ text: 'OK' }]
            );
        } finally {
            setIsLoading(false);
        }
    };

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
                <TouchableOpacity
                    style={styles.loginButton}
                    onPress={handleLogin}
                    disabled={isLoading}
                >
                    <ThemedText style={styles.loginButtonText}>
                        Login with Microsoft
                    </ThemedText>
                </TouchableOpacity>
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
});