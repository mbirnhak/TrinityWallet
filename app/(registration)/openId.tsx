import { StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import { Buffer } from 'buffer';
import React from 'react';
import * as Animatable from 'react-native-animatable';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

global.Buffer = Buffer;

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

export default function OpenId() {
    const { authState, oidcRegister, hasEmailHash, isLoading } = useAuth();

    const handleRegistration = async () => {
        if (authState.oidcRegistered) {
            if (authState.pinRegistered) {
                router.replace('/biometric-setup');
            } else {
                router.replace('/pin-setup');
            }
        } else {
            const hasEmail = await hasEmailHash();
            if (hasEmail === null) return;
            const firstTimeUser = !hasEmail;
            const success = await oidcRegister(firstTimeUser);
            if (success) {
                if (authState.pinRegistered) {
                    router.replace('/biometric-setup');
                } else {
                    router.replace('/pin-setup');
                }
            }
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
                style={styles.content}
            >
                <Animatable.Text 
                    animation="fadeInDown"
                    delay={500}
                    style={styles.title}
                >
                    Trinity Wallet
                </Animatable.Text>

                <Animatable.Text 
                    animation="fadeInDown"
                    delay={700}
                    style={styles.subtitle}
                >
                    Secure Digital Identity Wallet
                </Animatable.Text>

                {isLoading ? (
                    <ActivityIndicator size="large" color={theme.primary} style={styles.loader} />
                ) : (
                    <Animatable.View
                        animation="fadeInUp"
                        delay={1000}
                    >
                        <TouchableOpacity
                            onPress={handleRegistration}
                            disabled={isLoading}
                        >
                            <LinearGradient
                                colors={[theme.primary, theme.primaryDark]}
                                style={styles.button}
                            >
                                <Text style={styles.buttonText}>
                                    Register with Microsoft
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animatable.View>
                )}

                <Animatable.Text 
                    animation="fadeIn"
                    delay={1500}
                    style={styles.securityNote}
                >
                    This wallet uses multi-factor authentication to ensure your digital identity's security
                </Animatable.Text>
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
        fontSize: 32,
        color: theme.text,
        marginBottom: 15,
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: 'Poppins-Regular',
        fontSize: 18,
        color: theme.textSecondary,
        marginBottom: 40,
        textAlign: 'center',
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
    },
    securityNote: {
        fontFamily: 'Poppins-Regular',
        textAlign: 'center',
        marginTop: 40,
        paddingHorizontal: 40,
        color: theme.textSecondary,
        fontSize: 14,
        lineHeight: 20,
    }
});