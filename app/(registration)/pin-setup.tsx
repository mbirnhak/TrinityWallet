import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, Alert, Text, View, Platform, StatusBar } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { bcryptHash } from '@/services/Utils/crypto';
import { storedValueKeys } from '@/services/Utils/enums';
import { useAuth } from '@/context/AuthContext';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';

// Using the same theme structure as login page
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
    const [isTransitioning, setIsTransitioning] = useState(false);

    const handlePinInput = async (number: string) => {
        const currentPin = state.step === 'initial' ? state.pin : state.confirmPin;
        if (currentPin.length < 6) {
            const newPin = currentPin + number;
            if (state.step === 'initial' && newPin.length === 6) {
                setIsTransitioning(true);
                setTimeout(() => {
                    setState({ ...state, step: 'confirm', pin: newPin });
                    setIsTransitioning(false);
                }, 300);
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

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor={theme.dark} />
            <LinearGradient
                colors={[theme.dark, theme.background]}
                style={styles.container}
            >
                {/* Header with divider - matching login page */}
                <Animatable.View
                    animation="fadeInDown"
                    duration={800}
                    style={styles.headerContainer}
                >
                    <Text style={styles.headerText}>Create PIN</Text>
                    <View style={styles.divider} />
                </Animatable.View>

                <View style={styles.content}>
                    {/* Pin container styled like login page */}
                    <View style={styles.pinContainer}>
                        <Animatable.Text 
                            animation="fadeInDown" 
                            delay={400} 
                            style={styles.subtitle}
                        >
                            {state.step === 'initial' ? 'Enter a 6-digit PIN' : 'Confirm your PIN'}
                        </Animatable.Text>

                        <View style={styles.pinDisplay}>
                            {[...Array(6)].map((_, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.pinDot,
                                        { borderColor: theme.primary },
                                        ((state.step === 'initial' && i < state.pin.length) ||
                                        (state.step === 'confirm' && i < state.confirmPin.length)) && 
                                        { backgroundColor: theme.primary }
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
                                        typeof key === 'number' && {
                                            backgroundColor: theme.surface,
                                            borderColor: theme.border
                                        }
                                    ]}
                                    onPress={() => {
                                        if (key === '⌫') {
                                            handleDelete();
                                        } else if (key !== '') {
                                            handlePinInput(key.toString());
                                        }
                                    }}
                                    disabled={key === '' || isTransitioning}
                                >
                                    <Text style={[
                                        styles.keypadButtonText,
                                        { color: theme.text },
                                        key === '⌫' && { color: theme.primary }
                                    ]}>
                                        {key}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Security note at bottom */}
                    <View style={styles.buttonContainer}>
                        <Animatable.Text animation="fadeIn" delay={1000} style={styles.securityNote}>
                            Never share your PIN with anyone
                        </Animatable.Text>
                    </View>
                </View>
            </LinearGradient>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    // Header with divider - matching login page
    headerContainer: {
        width: '100%',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 15,
        alignItems: 'center',
    },
    headerText: {
        fontFamily: 'Poppins-Bold',
        fontSize: 32,
        marginBottom: 12,
        color: theme.text,
    },
    divider: {
        height: 1,
        width: '85%',
        backgroundColor: 'rgba(255, 255, 255, 0.2)'
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 30,
    },
    subtitle: {
        fontFamily: 'Poppins-Regular',
        fontSize: 18,
        color: theme.textSecondary,
        marginBottom: 40,
        textAlign: 'center',
    },
    // Pin container styled like login page
    pinContainer: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 40,
        paddingBottom: 10,
    },
    pinDisplay: {
        flexDirection: 'row',
        marginBottom: 60,
    },
    pinDot: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1,
        marginHorizontal: 10,
        backgroundColor: 'transparent',
    },
    // Updated keypad styles to match login page
    keypad: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        width: '95%',
        maxWidth: 360,
        marginBottom: 15,
        marginTop: 30,
    },
    keypadButton: {
        width: '31%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        margin: '1%',
        marginVertical: '4%',
        borderRadius: 45,
        borderWidth: 1,
    },
    keypadButtonDisabled: {
        backgroundColor: 'transparent',
        borderWidth: 0,
    },
    keypadButtonText: {
        fontSize: 30,
        fontFamily: 'Poppins-Regular',
    },
    deleteButtonText: {
        fontFamily: 'Poppins-Bold',
        fontSize: 32,
    },
    // Button container for bottom area
    buttonContainer: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        height: 80,
        marginTop: 5,
        marginBottom: 20,
    },
    securityNote: {
        fontFamily: 'Poppins-Regular',
        textAlign: 'center',
        color: theme.textSecondary,
        fontSize: 14,
    },
});