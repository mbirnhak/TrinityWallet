import { StyleSheet, TouchableOpacity, Alert, Text, View, Platform, StatusBar } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { biometricAvailability } from '../services/Authentication';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';

export default function PinLogin() {
    const { theme, isDarkMode } = useTheme();
    const { signIn, unRegister, authState } = useAuth();
    const [pin, setPin] = useState('');
    const [useBiometrics, setUseBiometrics] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [isScanning, setIsScanning] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const MAX_ATTEMPTS = 5;
    const lottieRef = useRef<LottieView>(null);

    useEffect(() => {
        const checkForcePin = async () => {
            try {
                // Check if biometrics are available and allowed
                const biometricStatus = await biometricAvailability();
                console.log('Biometric status:', biometricStatus);
                
                // Only set to use biometrics if they're available and not forced to use PIN
                if (biometricStatus && biometricStatus.isAvailable && !authState.forcePin) {
                    setUseBiometrics(true);
                } else {
                    setUseBiometrics(false);
                }
            } catch (error) {
                console.error('Error checking biometric availability:', error);
                setUseBiometrics(false);
            }
        };

        checkForcePin();
    }, [authState]);

    const handleBiometricAuth = async () => {
        try {
            setIsScanning(true);
            if (lottieRef.current) {
                // Reset and play animation
                lottieRef.current.reset();
                lottieRef.current.play();
            }

            const biometricStatus = await biometricAvailability();
            console.log('Attempting biometric auth:', biometricStatus);

            if (biometricStatus && biometricStatus.isAvailable) {
                const success = await signIn(null);
                console.log('Biometric auth result:', success);
                
                if (success) {
                    router.replace('/home');
                } else {
                    setIsScanning(false);
                    Alert.alert(
                        'Authentication Failed',
                        'Please try again or use your PIN.',
                        [{ text: 'OK' }]
                    );
                }
            } else {
                setIsScanning(false);
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
        } catch (error) {
            console.error('Biometric authentication error:', error);
            setIsScanning(false);
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
            console.error('PIN validation error:', error);
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

    // Smooth transition between PIN and biometrics
    const toggleAuthMethod = (useBio: boolean | ((prevState: boolean) => boolean)) => {
        setIsTransitioning(true);
        
        // Use Animatable.View's ref to trigger animations
        setTimeout(() => {
            setUseBiometrics(useBio);
            setTimeout(() => {
                setIsTransitioning(false);
            }, 300); // Duration slightly longer than the fadeIn animation
        }, 300); // Duration matching the fadeOut animation
    };

    return (
        <>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.dark} />
            <LinearGradient
                colors={isDarkMode ? 
                    [theme.dark, theme.background] : 
                    ['#F2F2F6', '#FFFFFF']
                }
                style={styles.container}
            >
                {/* Simple Login Header with Divider */}
                <Animatable.View 
                    animation="fadeInDown" 
                    duration={800}
                    style={styles.headerContainer}
                >
                    <Text style={[styles.headerText, { color: theme.text }]}>Login</Text>
                    <View style={[styles.divider, { 
                        backgroundColor: isDarkMode ? 
                            'rgba(255, 255, 255, 0.2)' : 
                            'rgba(0, 0, 0, 0.1)' 
                    }]} />
                </Animatable.View>

                <View style={styles.content}>
                    {/* Main authentication content area */}
                    {useBiometrics ? (
                        <View style={styles.biometricContainer}>
                            {/* Premium Face ID section with larger animation */}
                            <TouchableOpacity
                                style={styles.faceIdTouchable}
                                onPress={handleBiometricAuth}
                                disabled={isScanning || isTransitioning}
                                activeOpacity={0.7}
                            >
                                <View style={styles.animationContainer}>
                                    <LinearGradient
                                        colors={[`${theme.primary}20`, 'transparent']}
                                        style={styles.animationBackground}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    />
                                    
                                    <LottieView
                                        ref={lottieRef}
                                        source={require('../assets/fonts/face-id.json')}
                                        style={styles.lottieAnimation}
                                        autoPlay={false}
                                        loop={isScanning}
                                        speed={0.7} // Slightly slower for smoother appearance
                                    />
                                    
                                    {isScanning && (
                                        <View style={styles.scanOverlay}>
                                            <LinearGradient
                                                colors={['transparent', theme.primary, 'transparent']}
                                                style={styles.scanLine}
                                                start={{ x: 0.5, y: 0 }}
                                                end={{ x: 0.5, y: 1 }}
                                            >
                                                <View style={[styles.scanLineInner, { backgroundColor: theme.primary }]} />
                                            </LinearGradient>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                            
                            {/* Descriptive text that changes based on state */}
                            <Text style={[styles.authStatusText, { color: theme.text }]}>
                                {isScanning ? 'Scanning face...' : 'Tap to use Face ID'}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.pinContainer}>
                            <View style={styles.pinDisplay}>
                                {[...Array(6)].map((_, i) => (
                                    <View
                                        key={i}
                                        style={[
                                            styles.pinDot,
                                            { borderColor: theme.primary },
                                            i < pin.length && { backgroundColor: theme.primary }
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
                                                backgroundColor: isDarkMode ? theme.surface : '#F2F2F7',
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
                    )}
                    
                    {/* Fixed position button container at the bottom */}
                    <View style={styles.buttonContainer}>
                        {useBiometrics ? (
                            <TouchableOpacity
                                style={[styles.switchButtonContainer]}
                                onPress={() => toggleAuthMethod(false)}
                                disabled={isScanning || isTransitioning}
                            >
                                <LinearGradient
                                    colors={[theme.primary, theme.primaryDark]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.switchButton}
                                >
                                    <Ionicons name="keypad-outline" size={22} color="#FFFFFF" style={styles.buttonIcon} />
                                    <Text style={[styles.switchText, { color: "#FFFFFF" }]}>Use PIN</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        ) : (
                            authState && authState.biometricsRegistered && (
                                <TouchableOpacity
                                    style={[styles.switchButtonContainer]}
                                    onPress={() => toggleAuthMethod(true)}
                                    disabled={isTransitioning}
                                >
                                    <LinearGradient
                                        colors={[theme.primary, theme.primaryDark]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.switchButton}
                                    >
                                        <Ionicons name="scan-outline" size={22} color="#FFFFFF" style={styles.buttonIcon} />
                                        <Text style={[styles.switchText, { color: "#FFFFFF" }]}>Use Face ID</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            )
                        )}
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
    // Header with divider
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
    },
    divider: {
        height: 1,
        width: '85%',
    },
    content: {
        flex: 1,
        justifyContent: 'space-between', // Changed from 'center' to use space between
        alignItems: 'center',
        padding: 20,
        paddingBottom: 40, // Add bottom padding for consistent button spacing
    },
    // Face ID styles with animation
    biometricContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%', // Ensure full width for button alignment
    },
    faceIdTouchable: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    animationContainer: {
        width: 300,
        height: 300,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    animationBackground: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        opacity: 0.7,
    },
    lottieAnimation: {
        width: 300,
        height: 300,
    },
    scanOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scanLine: {
        width: 300,
        height: 300,
        position: 'absolute',
        opacity: 0.6,
    },
    scanLineInner: {
        width: '100%',
        height: 2,
    },
    authStatusText: {
        fontFamily: 'Poppins-Medium',
        fontSize: 18,
        marginBottom: 30,
        textAlign: 'center',
    },
    pinContainer: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center', // Center the PIN components
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
        marginHorizontal: 10,
        backgroundColor: 'transparent',
    },
    keypad: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        width: '90%',
        maxWidth: 300,
        marginBottom: 30,
    },
    keypadButton: {
        width: '30%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        margin: '1.5%',
        borderRadius: 40,
        borderWidth: 1,
    },
    keypadButtonDisabled: {
        backgroundColor: 'transparent',
        borderWidth: 0,
    },
    keypadButtonText: {
        fontSize: 24,
        fontFamily: 'Poppins-Regular',
    },
    deleteButtonText: {
        fontFamily: 'Poppins-Bold',
        fontSize: 36,
    },
    // New button container for consistent positioning
    buttonContainer: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        height: 80, // Fixed height for button area
        marginBottom: 20,
    },
    // Standardized Switch Button styles
    switchButtonContainer: {
        width: 220, // Fixed width for both buttons
        overflow: 'hidden',
        borderRadius: 30,
        elevation: 4,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        shadowColor: '#0A84FF', // Using theme.primary color
        alignSelf: 'center', // Center the button
    },
    switchButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 30,
    },
    buttonIcon: {
        marginRight: 10,
    },
    switchText: {
        fontFamily: 'Poppins-Bold',
        fontSize: 18,
        textAlign: 'center',
    },
});