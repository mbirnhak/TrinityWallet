import { StyleSheet, TouchableOpacity, Alert, AppState } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { biometricAvailability } from '@/services/Authentication';

export default function PinLogin() {
    const { signIn, unRegister, authState } = useAuth()
    const [pin, setPin] = useState('');
    const [useBiometrics, setuseBiometrics] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const MAX_ATTEMPTS = 5;

    useEffect(() => {
        const checkForcePin = async () => {
            try {
                setuseBiometrics(!authState.forcePin);
            } catch (error) {
                console.error('Error checking biometric availability:', error);
            }
        };

        checkForcePin();
    }, [authState]);


    const handleBiometricAuth = async () => {
        const biometricStatus = await biometricAvailability();

        if (biometricStatus.isAvailable) {
            // Biometrics are available, proceed with authentication
            const success = await signIn(null);
            if (success) {
                router.replace('/home');
            }
        } else {
            // Show alert to guide user to settings
            Alert.alert(
                'Biometrics Unavailable',
                'Please enable biometrics in your device settings.',
                [
                    {
                        text: 'Open Settings',
                        onPress: () => {
                            Linking.openSettings();
                        }
                    },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        }
    }

    const handlePinInput = (number: string) => {
        if (pin.length < 6) {
            const newPin = pin + number;
            setPin(newPin);
            if (newPin.length === 6) {
                validatePin(newPin);
            }
        }
    };

    const handleDelete = () => {
        if (pin.length > 0) {
            setPin(pin.slice(0, -1));
        }
    };

    const validatePin = async (inputPin: string) => {
        try {
            const isValid = await signIn(inputPin);
            if (isValid) {
                router.replace('/home');
            } else {
                setAttempts(prev => {
                    const updatedAttempts = prev + 1;
                    if (updatedAttempts >= MAX_ATTEMPTS) {
                        handleMaxAttemptsReached();
                    } else {
                        Alert.alert(
                            'Invalid PIN',
                            `Incorrect PIN. ${MAX_ATTEMPTS - updatedAttempts} attempts remaining.`
                        );
                        setPin('');
                    }
                    return updatedAttempts;
                });
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to verify PIN');
            setPin('');
        }
    };

    const handleMaxAttemptsReached = async () => {
        await unRegister();
        Alert.alert(
            'Account Locked',
            'Too many failed attempts. Please authenticate with Microsoft again.',
            [
                {
                    text: 'OK',
                    onPress: () => router.replace('/openId')
                }
            ]
        );
    };

    return (
        <ThemedView style={styles.container}>
            <ThemedText type="title" style={styles.title}>
                {useBiometrics ? 'Unlock with Biometrics' : 'Enter PIN'}
            </ThemedText>

            {useBiometrics ? (
                <TouchableOpacity
                    style={styles.biometricButton}
                    onPress={handleBiometricAuth}
                >
                    <Ionicons name="lock-open-outline" size={65} color="#007AFF" />
                </TouchableOpacity>
            ) : (
                <>
                    <ThemedView style={styles.pinDisplay}>
                        {[...Array(6)].map((_, i) => (
                            <ThemedView
                                key={i}
                                style={[
                                    styles.pinDot,
                                    i < pin.length && styles.pinDotFilled
                                ]}
                            />
                        ))}
                    </ThemedView>

                    <ThemedView style={styles.keypad}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((key, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.keypadButton,
                                    key === '' && styles.keypadButtonDisabled
                                ]}
                                onPress={() => {
                                    if (key === '⌫') {
                                        handleDelete();
                                    } else if (key !== '') {
                                        handlePinInput(key.toString());
                                    }
                                }}
                                disabled={key === ''}
                            >
                                <ThemedText style={styles.keypadButtonText}>
                                    {key}
                                </ThemedText>
                            </TouchableOpacity>
                        ))}
                    </ThemedView>
                </>
            )}
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
        marginBottom: 40,
        textAlign: 'center',
    },
    biometricButton: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    pinDisplay: {
        flexDirection: 'row',
        marginBottom: 40,
    },
    pinDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#0078D4',
        marginHorizontal: 10,
    },
    pinDotFilled: {
        backgroundColor: '#0078D4',
    },
    keypad: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        width: '80%',
        maxWidth: 300,
    },
    keypadButton: {
        width: '30%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        margin: '1.5%',
        borderRadius: 40,
        backgroundColor: '#f0f0f0',
    },
    keypadButtonDisabled: {
        backgroundColor: 'transparent',
    },
    keypadButtonText: {
        fontSize: 24,
        color: '#00000'
    },
});