import { StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import React from 'react';
import * as Animatable from 'react-native-animatable';
import { Text, View } from 'react-native';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

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
                    router.replace('/pin-setup')
                }
            }
        }
    }

    return (
        <Animatable.View 
            animation="fadeIn" 
            duration={1000} 
            style={styles.container}
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
                <ActivityIndicator size="large" color="#0078D4" style={styles.loader} />
            ) : (
                <Animatable.View
                    animation="fadeInUp"
                    delay={1000}
                >
                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleRegistration}
                        disabled={isLoading}
                    >
                        <Text style={styles.buttonText}>
                            Register with Microsoft
                        </Text>
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
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#ffffff',
    },
    title: {
        fontFamily: 'Poppins-Bold',
        fontSize: 32,
        color: '#0078D4',
        marginBottom: 15,
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: 'Poppins-Regular',
        fontSize: 18,
        color: '#666',
        marginBottom: 40,
        textAlign: 'center',
    },
    loader: {
        marginVertical: 30,
    },
    button: {
        backgroundColor: '#0078D4',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
        width: 300,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    buttonText: {
        fontFamily: 'Poppins-Regular',
        color: '#FFFFFF',
        fontSize: 16,
    },
    securityNote: {
        fontFamily: 'Poppins-Regular',
        textAlign: 'center',
        marginTop: 40,
        paddingHorizontal: 40,
        color: '#666',
        fontSize: 14,
        lineHeight: 20,
    }
});