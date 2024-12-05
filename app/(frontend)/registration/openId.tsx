// app/(frontend)/registration/openId.tsx

import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@//components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from "@/context/AuthContext";

export default function OpenIdRegistration() {
    const { isFirstTimeUser, register, setForcePin, isLoading } = useAuth();
    const [firstTimeUser, setFirstTimeUser] = useState<boolean | null>(false);

    useEffect(() => {
        const checkFirstTimeUser = async () => {
            setFirstTimeUser(await isFirstTimeUser());
            if (firstTimeUser === null) {
                router.replace('/error');
                return;
            }
            setFirstTimeUser(firstTimeUser)
        };

        checkFirstTimeUser();
    }, []);

    

    const handleRegistration = async () => {
        if (firstTimeUser === null) return;
        console.log('Made it to OpenID');
        const success = await register(firstTimeUser);
        if (success) {
            if (firstTimeUser) {
                router.replace('/registration/pin-setup');
            } else {
                // When re-registering, force user to use PIN when they get to the login page
                await setForcePin(true);
                router.replace('/auth/login');
            }
        } else {
            Alert.alert('Error', 'Registration failed. Please try again.');
        }
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
                <TouchableOpacity
                    style={styles.loginButton}
                        onPress={handleRegistration}
                    disabled={isLoading}
                >
                    <ThemedText style={styles.loginButtonText}>
                        Register with Microsoft
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