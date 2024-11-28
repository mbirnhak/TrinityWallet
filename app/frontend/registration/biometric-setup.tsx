// app/frontend/registration/biometric-setup.tsx

import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '../../../components/ThemedText';
import { ThemedView } from '../../../components/ThemedView';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export default function BiometricSetup() {
    const [biometricType, setBiometricType] = useState<'face' | 'fingerprint' | null>(null);

    useEffect(() => {
        checkBiometricSupport();
    }, []);

    const checkBiometricSupport = async () => {
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            
            if (!hasHardware || !isEnrolled) {
                // Skip biometric setup if not available
                router.replace('../frontend/home');
                return;
            }

            const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
            if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
                setBiometricType('face');
            } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
                setBiometricType('fingerprint');
            }
        } catch (error) {
            console.error('Biometric support check failed:', error);
            router.replace('../frontend/home');
        }
    };

    const handleEnableBiometrics = async () => {
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Verify to enable biometric login',
                disableDeviceFallback: false,
                fallbackLabel: 'Use PIN instead'
            });

            if (result.success) {
                await SecureStore.setItemAsync('biometricsEnabled', 'true');
                router.replace('../frontend/home');
            } else {
                router.replace('../frontend/home');
            }
        } catch (error) {
            console.error('Biometric setup failed:', error);
            router.replace('../frontend/home');
        }
    };

    const handleSkip = async () => {
        await SecureStore.setItemAsync('biometricsEnabled', 'false');
        router.replace('../frontend/home');
    };

    return (
        <ThemedView style={styles.container}>
            <ThemedText type="title" style={styles.title}>
                Enable {biometricType === 'face' ? 'Face ID' : 'Touch ID'}
            </ThemedText>

            <ThemedText type="subtitle" style={styles.subtitle}>
                {biometricType === 'face' 
                    ? 'Use Face ID for quick and secure access to your wallet'
                    : 'Use Touch ID for quick and secure access to your wallet'}
            </ThemedText>

            <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleEnableBiometrics}
            >
                <ThemedText style={styles.buttonText}>
                    Enable {biometricType === 'face' ? 'Face ID' : 'Touch ID'}
                </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleSkip}
            >
                <ThemedText style={styles.secondaryButtonText}>
                    Skip for now
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