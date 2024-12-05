// app/frontend/auth/login.tsx

import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Alert, AppState } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '../../../components/ThemedText';
import { ThemedView } from '../../../components/ThemedView';
import AuthenticationService from '../../backend/Authentication';
import * as SecureStore from 'expo-secure-store';

export default function PinLogin() {
    const [pin, setPin] = useState('');
    const [showBiometrics, setShowBiometrics] = useState(false);
    const [requirePin, setRequirePin] = useState(true);
    const [attempts, setAttempts] = useState(0);
    const MAX_ATTEMPTS = 5;

    const checkBiometricAvailability = async () => {
        try {
            const lastRestart = await SecureStore.getItemAsync('lastRestartTime');
            const currentTime = Date.now().toString();

            // Check if device was restarted
            if (!lastRestart) {
                await SecureStore.setItemAsync('lastRestartTime', currentTime);
                setRequirePin(true);
                setShowBiometrics(false);
                return;
            }

            setShowBiometrics(biometricsEnabled === 'true' && !requirePin);
            
            if (showBiometrics) {
                handleBiometricAuth();
            }
        } catch (error) {
            console.error('Error checking biometric availability:', error);
        }
    };

    const handlePinInput = (number: string) => {
        if (pin.length < 6) {
            const newPin = pin + number;
            setPin(newPin);
            
            if (newPin.length === 6) {
                validatePin(newPin);
            }
        }
    };

    const validatePin = async (inputPin: string) => {
        try {
            const auth = AuthenticationService.getInstance();
            const isValid = await auth.verifyPin(inputPin);

            if (isValid) {
                await SecureStore.setItemAsync('lastRestartTime', Date.now().toString());
                setRequirePin(false);
                router.replace('../main/home');
            } else {
                setAttempts(prev => prev + 1);
                if (attempts + 1 >= MAX_ATTEMPTS) {
                    await handleMaxAttemptsReached();
                } else {
                    Alert.alert(
                        'Invalid PIN',
                        `Incorrect PIN. ${MAX_ATTEMPTS - (attempts + 1)} attempts remaining.`
                    );
                    setPin('');
                }
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to verify PIN');
            setPin('');
        }
    };

    const handleMaxAttemptsReached = async () => {
        await SecureStore.deleteItemAsync('idToken');
        await SecureStore.deleteItemAsync('biometricsEnabled');
        Alert.alert(
            'Account Locked',
            'Too many failed attempts. Please authenticate with Microsoft again.',
            [
                {
                    text: 'OK',
                    onPress: () => router.replace('../registration/registration')
                }
            ]
        );
    };

    const handleDelete = () => {
        if (pin.length > 0) {
            setPin(pin.slice(0, -1));
        }
    };

    return (
        <ThemedView style={styles.container}>
            <ThemedText type="title" style={styles.title}>
                Enter PIN
            </ThemedText>

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
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 
                  showBiometrics ? '👆' : '', 0, '⌫'].map((key, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.keypadButton,
                            !key && styles.keypadButtonDisabled
                        ]}
                        onPress={() => {
                            if (key === '👆') {
                                handleBiometricAuth();
                            } else if (key === '⌫') {
                                handleDelete();
                            } else if (key !== '') {
                                handlePinInput(key.toString());
                            }
                        }}
                        disabled={!key}
                    >
                        <ThemedText style={styles.keypadButtonText}>
                            {key}
                        </ThemedText>
                    </TouchableOpacity>
                ))}
            </ThemedView>
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
    },
});