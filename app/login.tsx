import { StyleSheet, TouchableOpacity, Alert, Text, View } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { biometricAvailability } from '@/services/authentication';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { theme } from './_layout';

export default function PinLogin() {
    const { signIn, unRegister, authState } = useAuth();
    const [pin, setPin] = useState('');
    const [useBiometrics, setUseBiometrics] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const MAX_ATTEMPTS = 5;
    const lottieRef = useRef<LottieView>(null);

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

    const handleBiometricAuth = async () => {
        if (lottieRef.current) {
            lottieRef.current.play();
        }

        const biometricStatus = await biometricAvailability();

        if (biometricStatus.isAvailable) {
            const success = await signIn(null);
            if (success) {
                router.replace('/home');
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
        <LinearGradient
            colors={[theme.dark, theme.background]}
            style={styles.container}
        >
            <Animatable.View 
                animation="fadeIn" 
                duration={1000} 
                style={styles.content}
            >
                <Animatable.Text 
                    animation="fadeInDown" 
                    delay={300}
                    style={styles.title}
                >
                    {useBiometrics ? 'Face ID' : 'Enter PIN'}
                </Animatable.Text>

                {useBiometrics ? (
                    <Animatable.View animation="fadeIn" delay={500}>
                        <TouchableOpacity
                            style={styles.biometricButton}
                            onPress={handleBiometricAuth}
                        >
                            <LinearGradient
                                colors={[theme.surface, theme.darker]}
                                style={styles.biometricGradient}
                            >
                                <LottieView
                                    ref={lottieRef}
                                    source={require('../assets/fonts/face-id.json')}
                                    style={styles.lottieAnimation}
                                    autoPlay={false}
                                    loop={false}
                                />
                            </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setUseBiometrics(false)}
                        >
                            <LinearGradient
                                colors={[theme.primary, theme.primaryDark]}
                                style={styles.switchButton}
                            >
                                <Text style={styles.switchText}>Use PIN</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animatable.View>
                ) : (
                    <Animatable.View animation="fadeIn" delay={500} style={styles.pinContainer}>
                        <View style={styles.pinDisplay}>
                            {[...Array(6)].map((_, i) => (
                                <Animatable.View
                                    key={i}
                                    animation={i < pin.length ? 'bounceIn' : undefined}
                                    duration={200}
                                    style={[
                                        styles.pinDot,
                                        i < pin.length && styles.pinDotFilled
                                    ]}
                                />
                            ))}
                        </View>

                        <View style={styles.keypad}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((key, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.keypadButton,
                                        key === '' && styles.keypadButtonDisabled,
                                        typeof key === 'number' && styles.numberButton
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
                                    <Text style={[
                                        styles.keypadButtonText,
                                        key === '⌫' && styles.deleteButtonText
                                    ]}>
                                        {key}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
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
        marginBottom: 40,
        textAlign: 'center',
    },
    biometricButton: {
        marginBottom: 20,
        borderRadius: 50,
        overflow: 'hidden',
    },
    biometricGradient: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 50,
        borderWidth: 1,
        borderColor: theme.border,
        width: 260,
        height: 260,
    },
    lottieAnimation: {
        width: 260,
        height: 260,
    },
    pinContainer: {
        width: '100%',
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
        borderColor: theme.primary,
        marginHorizontal: 10,
        backgroundColor: 'transparent',
    },
    pinDotFilled: {
        backgroundColor: theme.primary,
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
    },
    numberButton: {
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.border,
    },
    keypadButtonDisabled: {
        backgroundColor: 'transparent',
    },
    keypadButtonText: {
        fontSize: 24,
        color: theme.text,
        fontFamily: 'Poppins-Regular',
    },
    deleteButtonText: {
        color: theme.primary,
        fontFamily: 'Poppins-Bold',
        fontSize: 36,
    },
    switchButton: {
        marginTop: 20,
        borderRadius: 25,
        overflow: 'hidden',
    },
    switchText: {
        color: theme.text,
        fontFamily: 'Poppins-Bold',
        fontSize: 20,
        textAlign: 'center',
        padding: 12,
    },
});