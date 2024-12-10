// app/frontend/registration/pin-setup.tsx

import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import * as SecureStore from 'expo-secure-store';
import { generateSalt, hash } from '@/services/crypto';
import { storedValueKeys } from '@/services/enums';
import { useAuth } from '@/context/AuthContext';

interface PinContextState {
    step: 'initial' | 'confirm';
    pin: string;
    confirmPin: string;
}

export default function PinSetup() {
    const { pinSetup } = useAuth()
    const [state, setState] = useState<PinContextState>({
        step: 'initial',
        pin: '',
        confirmPin: ''
    });

    const handlePinInput = async (number: string) => {
        const currentPin = state.step === 'initial' ? state.pin : state.confirmPin;

        if (currentPin.length < 6) {
            const newPin = currentPin + number;
            if (state.step === 'initial') {
                setState({ ...state, pin: newPin });
                if (newPin.length === 6) {
                    setState({ ...state, step: 'confirm', pin: newPin });
                }
            } else {
                setState({ ...state, confirmPin: newPin });
                if (newPin.length === 6) {
                    await validateAndSavePin(state.pin, newPin);
                }
            }
        }
    };

    const validateAndSavePin = async (pin: string, confirmPin: string) => {
        if (pin !== confirmPin) {
            Alert.alert('Error', 'PINs do not match. Please try again.');
            setState({ step: 'initial', pin: '', confirmPin: '' });
            return;
        }
        // Ensures pin is 6 digits long
        if (!/^\d{6}$/.test(pin)) {
            Alert.alert('Error', 'PIN must be 6 digits.');
            setState({ step: 'initial', pin: '', confirmPin: '' });
            return;
        }

        try {
            const salt = await generateSalt();
            const hashedPinData = await hash(pin, salt);
            if (!hashedPinData) {
                console.error('Failed to hash the email, aborting registration.');
                return false; // Abort the process if hashing fails
            }
            await SecureStore.setItemAsync(storedValueKeys.PIN, hashedPinData);
            await pinSetup();
            router.replace('./biometric-setup');
        } catch (error) {
            Alert.alert('Error', 'Failed to save PIN. Please try again.');
            setState({ step: 'initial', pin: '', confirmPin: '' });
        }
    };

    const handleDelete = () => {
        if (state.step === 'initial' && state.pin.length > 0) {
            setState({ ...state, pin: state.pin.slice(0, -1) });
        } else if (state.step === 'confirm' && state.confirmPin.length > 0) {
            setState({ ...state, confirmPin: state.confirmPin.slice(0, -1) });
        }
    };

    return (
        <ThemedView style={styles.container}>
            <ThemedText type="title" style={styles.title}>
                Create PIN
            </ThemedText>

            <ThemedText type="subtitle" style={styles.subtitle}>
                {state.step === 'initial'
                    ? 'Enter a 6-digit PIN'
                    : 'Confirm your PIN'}
            </ThemedText>

            <ThemedView style={styles.pinDisplay}>
                {[...Array(6)].map((_, i) => (
                    <ThemedView
                        key={i}
                        style={[
                            styles.pinDot,
                            ((state.step === 'initial' && i < state.pin.length) ||
                                (state.step === 'confirm' && i < state.confirmPin.length)) &&
                            styles.pinDotFilled,
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
                        onPress={() => key === '⌫' ? handleDelete() : key !== '' && handlePinInput(key.toString())}
                        disabled={key === ''}
                    >
                        <ThemedText style={styles.keypadButtonText}>
                            {key}
                        </ThemedText>
                    </TouchableOpacity>
                ))}
            </ThemedView>

            <ThemedText type="default" style={styles.securityNote}>
                Your PIN will be used to secure your wallet.
                Never share it with anyone.
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
    securityNote: {
        textAlign: 'center',
        marginTop: 20,
        paddingHorizontal: 40,
        opacity: 0.7,
    },
});