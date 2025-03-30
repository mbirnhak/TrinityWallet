import { StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { biometricAvailability } from '../../services/authentication';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as Animatable from 'react-native-animatable';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const theme = {
    dark: '#000000',
    darker: '#1C1C1E',
    background: '#121214',
    surface: '#18181B',
    primary: '#0A84FF',
    primaryDark: '#0066CC',
    accent: '#5E5CE6',
    text: '#FFFFFF',
    textSecondary: '#98989F',
    border: '#2C2C2E',
};

export default function BiometricSetup() {
    const [biometricType, setBiometricType] = useState<'face' | 'fingerprint' | null>(null);
    const { signIn, biometricSetup, isLoading, setIsLoading } = useAuth();
    useEffect(() => {
        setIsLoading(false);
    }, [])

    const checkBiometricSupport = async () => {
        const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricType('face');
        } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            setBiometricType('fingerprint');
        }
    };

    useEffect(() => {
        checkBiometricSupport();
    }, []);

    const handleEnableBiometrics = async () => {
        const biometricStatus = await biometricAvailability();
        if (biometricStatus.isAvailable) {
            try {
                const success = await signIn(null);
                console.log("Executed past sign in")
                if (success) {
                    await biometricSetup();
                    router.replace('/login');
                }
            } catch (error) {
                console.error("Error allowing biometrics: ", error)
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
    };

    return (
        <LinearGradient
            colors={[theme.dark, theme.background]}
            style={styles.container}
        >
            <Animatable.View
                animation="fadeIn"
                duration={1000}
                useNativeDriver={true}
                style={styles.content}
            >
                <Animatable.Text
                    animation="fadeInDown"
                    delay={500}
                    useNativeDriver={true}
                    style={styles.title}
                >
                    Enable {biometricType === 'face' ? 'Face ID' : 'Touch ID'}
                </Animatable.Text>

                <Animatable.Text
                    animation="fadeInDown"
                    delay={700}
                    useNativeDriver={true}
                    style={styles.subtitle}
                >
                    Use Biometrics for quick and secure access to your wallet
                </Animatable.Text>

                {isLoading ? (
                    <ActivityIndicator size="large" color={theme.primary} style={styles.loader} />
                ) : (
                    <Animatable.View
                        animation="fadeInUp"
                        delay={1000}
                        useNativeDriver={true}
                    >
                        <TouchableOpacity
                            onPress={handleEnableBiometrics}
                        >
                            <LinearGradient
                                colors={[theme.primary, theme.primaryDark]}
                                style={styles.button}
                            >
                                <Text style={styles.buttonText}>
                                    Enable {biometricType === 'face' ? 'Face ID' : 'Touch ID'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animatable.View>
                )}
            </Animatable.View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontFamily: 'Poppins-Bold',
        fontSize: 28,
        color: theme.text,
        marginBottom: 15,
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: 'Poppins-Regular',
        fontSize: 16,
        color: theme.textSecondary,
        marginBottom: 40,
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 24,
    },
    loader: {
        marginVertical: 30,
    },
    button: {
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
        width: 300,
        alignItems: 'center',
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    buttonText: {
        fontFamily: 'Poppins-Bold',
        color: theme.text,
        fontSize: 16,
    }
});