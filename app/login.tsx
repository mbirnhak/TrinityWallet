import { StyleSheet, TouchableOpacity, Alert, Text } from 'react-native';
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
    const [useBiometrics, setUseBiometrics] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const MAX_ATTEMPTS = 5;

    /**
    * useEffect hook to check whether biometric authentication should be used
    * and sets the appropriate state based on the `forcePin` value.
    */
    useEffect(() => {
        const checkForcePin = async () => {
            try {
                setUseBiometrics(!authState.forcePin);
            } catch (error) {
                console.error('Error checking biometric availability:', error);
            }
        };

        checkForcePin();
    }, [authState]);



    /**
     * Handles biometric authentication by checking biometric availability
     * and signing in the user if available. If not, it prompts the user to 
     * enable biometrics in the device settings.
     */
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

    /**
     * Handles the input of numbers for the PIN. Adds the number to the current PIN
     * if the length is less than 6, and validates the PIN once it reaches 6 digits.
     * 
     * @param number The number input by the user for the PIN.
     */
    const handlePinInput = (number: string) => {
        if (pin.length < 6) {
            const newPin = pin + number;
            setPin(newPin);
            if (newPin.length === 6) {
                validatePin(newPin);
            }
        }
    };

    /**
     * Deletes the last character from the PIN if the PIN has any digits.
     */
    const handleDelete = () => {
        if (pin.length > 0) {
            setPin(pin.slice(0, -1));
        }
    };

    /**
     * Validates the entered PIN by calling the signIn function.
     * If valid, navigates to the home page; otherwise, it increments the failed
     * attempts and alerts the user with the remaining attempts.
     * 
     * @param inputPin The PIN entered by the user.
     */
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

    /**
     * Handles the scenario when the maximum number of failed attempts is reached.
     * It unregisters the user and prompts them to authenticate with Microsoft again.
     */
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
                <>
                    <TouchableOpacity
                        style={styles.biometricButton}
                        onPress={handleBiometricAuth}
                    >
                        <Ionicons name="lock-open-outline" size={65} color="#007AFF" />
                    </TouchableOpacity>
                    <Text
                        onPress={() => setUseBiometrics(false)}
                        style={styles.switchText}>
                        Use PIN
                    </Text>
                </>
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
        fontFamily: 'Poppins-Bold',
        fontSize: 28,
        color: '#0078D4',
        marginBottom: 40,
        textAlign: 'center',
    },
    biometricButton: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        padding: 30,
        borderRadius: 50,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
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
        color: '#00000',
    },
    switchText: {
        marginTop: 20,
        color: '#ffffff',
        fontFamily: 'Poppins-Bold',
        fontSize: 20,
        textAlign: 'center',
        padding: 12,
        backgroundColor: '#0078D4',
        borderRadius: 25,
        width: 150,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
});