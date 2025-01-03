import { StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { biometricAvailability } from '@/services/Authentication';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as Animatable from 'react-native-animatable';
import { Text, View } from 'react-native';

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
        const biometricStatus = await biometricAvailability();
        if (biometricStatus.isAvailable) {
            const success = await signIn(null);
            if (success) {
                await biometricSetup();
                router.replace('/login');
            }
        } else {
            Alert.alert(
                'Biometrics Unavailable',
                'Please enable biometrics in your device settings.',
                [
                    {
                        text: 'Open Settings',
                        onPress: Linking.openSettings
                    },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        }
    }

    return (
        <Animatable.View 
            animation="fadeIn" 
            duration={1000} 
            style={styles.container}
        >
            <Animatable.Text 
                animation="fadeInDown"
                delay={500}
                style={styles.title}
            >
                Enable {biometricType === 'face' ? 'Face ID' : 'Touch ID'}
            </Animatable.Text>

            <Animatable.Text 
                animation="fadeInDown"
                delay={700}
                style={styles.subtitle}
            >
                Use Biometrics for quick and secure access to your wallet
            </Animatable.Text>

            <Animatable.View
                animation="fadeInUp"
                delay={1000}
            >
                <TouchableOpacity
                    style={styles.button}
                    onPress={handleEnableBiometrics}
                >
                    <Text style={styles.buttonText}>
                        Enable {biometricType === 'face' ? 'Face ID' : 'Touch ID'}
                    </Text>
                </TouchableOpacity>
            </Animatable.View>
        </Animatable.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#ffffff',
    },
    title: {
        fontFamily: 'Poppins-Bold',
        fontSize: 28,
        color: '#0078D4',
        marginBottom: 15,
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: 'Poppins-Regular',
        fontSize: 16,
        color: '#666',
        marginBottom: 40,
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 24,
    },
    button: {
        backgroundColor: '#0078D4',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
        width: 300,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    buttonText: {
        fontFamily: 'Poppins-Regular',
        color: '#FFFFFF',
        fontSize: 16,
    }
});