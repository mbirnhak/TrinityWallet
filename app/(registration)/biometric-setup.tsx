import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '@/context/AuthContext';

export default function BiometricSetup() {
    const [biometricType, setBiometricType] = useState<'face' | 'fingerprint' | null>(null);
    const { signIn, biometricSetup, isLoading } = useAuth();

    const checkBiometricSupport = async () => {
        const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricType('face');
        } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            setBiometricType('fingerprint');
        }
    }

    useEffect(() => {
        checkBiometricSupport();
    }, []);

    const handleEnableBiometrics = async () => {
        const success = await signIn(null);
        if (success) {
            await biometricSetup();
            router.replace('/home');
        } else {
            Alert.alert('Error with Biometrics');
            console.log(success)
        }
    }

    return (
        <ThemedView style={styles.container}>
            <ThemedText type="title" style={styles.title}>
                Enable {biometricType === 'face' ? 'Face ID' : 'Touch ID'}
            </ThemedText>

            <ThemedText type="subtitle" style={styles.subtitle}>
                {'Use Biometrics for quick and secure access to your wallet'}
            </ThemedText>

            <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleEnableBiometrics}
            >
                <ThemedText style={styles.buttonText}>
                    Enable {biometricType === 'face' ? 'Face ID' : 'Touch ID'}
                </ThemedText>
            </TouchableOpacity>
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
        paddingHorizontal: 20,
    },
    primaryButton: {
        backgroundColor: '#0078D4',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 8,
        width: '80%',
        alignItems: 'center',
        marginBottom: 20,
    },
    secondaryButton: {
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 8,
        width: '80%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButtonText: {
        fontSize: 16,
        opacity: 0.7,
    },
});
