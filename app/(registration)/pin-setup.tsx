import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { bcryptHash } from '@/services/crypto';
import { storedValueKeys } from '@/services/enums';
import { useAuth } from '@/context/AuthContext';
import * as Animatable from 'react-native-animatable';
import { Text, View } from 'react-native';

const { width } = Dimensions.get('window');
const BUTTON_SIZE = width * 0.2;

interface PinContextState {
    step: 'initial' | 'confirm';
    pin: string;
    confirmPin: string;
}

export default function PinSetup() {
    const { pinSetup } = useAuth();
    const [state, setState] = useState<PinContextState>({
        step: 'initial',
        pin: '',
        confirmPin: ''
    });

    const handlePinInput = async (number: string) => {
        const currentPin = state.step === 'initial' ? state.pin : state.confirmPin;
        if (currentPin.length < 6) {
            const newPin = currentPin + number;
            if (state.step === 'initial' && newPin.length === 6) {
                setState({ ...state, step: 'confirm', pin: newPin });
            } else if (state.step === 'confirm' && newPin.length === 6) {
                await validateAndSavePin(state.pin, newPin);
            } else {
                setState(state.step === 'initial' 
                    ? { ...state, pin: newPin }
                    : { ...state, confirmPin: newPin }
                );
            }
        }
    };

    const validateAndSavePin = async (pin: string, confirmPin: string) => {
        if (pin !== confirmPin || !/^\d{6}$/.test(pin)) {
            Alert.alert(
                'Error', 
                pin !== confirmPin ? 'PINs do not match.' : 'PIN must be 6 digits.',
                [{ text: 'Try Again', style: 'default' }]
            );
            setState({ step: 'initial', pin: '', confirmPin: '' });
            return;
        }

        try {
            const hashedPin = await bcryptHash(pin);
            if (!hashedPin) return false;
            await SecureStore.setItemAsync(storedValueKeys.PIN, hashedPin);
            await pinSetup();
            router.replace('./biometric-setup');
        } catch (error) {
            Alert.alert('Error', 'Failed to save PIN. Please try again.');
            setState({ step: 'initial', pin: '', confirmPin: '' });
        }
    };

    const handleDelete = () => {
        if ((state.step === 'initial' && state.pin.length > 0) || 
            (state.step === 'confirm' && state.confirmPin.length > 0)) {
            setState(state.step === 'initial'
                ? { ...state, pin: state.pin.slice(0, -1) }
                : { ...state, confirmPin: state.confirmPin.slice(0, -1) }
            );
        }
    };

    const renderPinDots = () => (
        <View style={styles.pinDisplay}>
            {[...Array(6)].map((_, i) => (
                <Animatable.View
                    key={i}
                    animation={
                        (state.step === 'initial' && i < state.pin.length) ||
                        (state.step === 'confirm' && i < state.confirmPin.length)
                            ? 'bounceIn'
                            : undefined
                    }
                    duration={200}
                    style={[
                        styles.pinDot,
                        ((state.step === 'initial' && i < state.pin.length) ||
                        (state.step === 'confirm' && i < state.confirmPin.length)) &&
                        styles.pinDotFilled,
                    ]}
                />
            ))}
        </View>
    );

    return (
        <Animatable.View animation="fadeIn" duration={800} style={styles.container}>
            <View style={styles.header}>
                <Animatable.Text animation="fadeInDown" delay={200} style={styles.title}>
                    Create PIN
                </Animatable.Text>
                <Animatable.Text animation="fadeInDown" delay={400} style={styles.subtitle}>
                    {state.step === 'initial' ? 'Enter a 6-digit PIN' : 'Confirm your PIN'}
                </Animatable.Text>
            </View>

            <Animatable.View animation="fadeIn" delay={600} style={styles.pinContainer}>
                {renderPinDots()}
            </Animatable.View>

            <Animatable.View animation="fadeInUp" delay={800} style={styles.keypad}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((key, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.keypadButton,
                            key === '' && styles.keypadButtonDisabled,
                            typeof key === 'number' && styles.numberButton
                        ]}
                        onPress={() => key === '⌫' ? handleDelete() : key !== '' && handlePinInput(key.toString())}
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
            </Animatable.View>

            <Animatable.Text animation="fadeIn" delay={1000} style={styles.securityNote}>
                Never share your PIN with anyone
            </Animatable.Text>
        </Animatable.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginTop: 60,
    },
    title: {
        fontFamily: 'Poppins-Bold',
        fontSize: 28,
        color: '#0078D4',
        marginBottom: 10,
    },
    subtitle: {
        fontFamily: 'Poppins-Regular',
        fontSize: 16,
        color: '#666666',
        marginBottom: 40,
    },
    pinContainer: {
        alignItems: 'center',
        marginBottom: 50,
    },
    pinDisplay: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 20,
    },
    pinDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#0078D4',
        marginHorizontal: 8,
        backgroundColor: '#ffffff',
    },
    pinDotFilled: {
        backgroundColor: '#0078D4',
    },
    keypad: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    keypadButton: {
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 10,
        borderRadius: BUTTON_SIZE / 2,
    },
    numberButton: {
        backgroundColor: '#f5f5f5',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
    },
    keypadButtonDisabled: {
        backgroundColor: 'transparent',
    },
    keypadButtonText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 24,
        color: '#0078D4',
    },
    deleteButtonText: {
        fontSize: 22,
        color: '#666666',
    },
    securityNote: {
        fontFamily: 'Poppins-Regular',
        textAlign: 'center',
        color: '#666666',
        fontSize: 14,
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
    },
});