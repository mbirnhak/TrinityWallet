import { router } from 'expo-router';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import * as Animatable from 'react-native-animatable';
import LottieView from 'lottie-react-native';

export default function Index() {
    const { authState, isLoading } = useAuth();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsReady(true), 0);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (isReady && !isLoading) {
            const determineInitialRoute = async () => {
                const oidcRegistered = authState?.oidcRegistered;
                const pinRegistered = authState?.pinRegistered;
                const biometricsRegistered = authState?.biometricsRegistered;
                console.log("AuthState: ", authState);
                if (oidcRegistered && pinRegistered && biometricsRegistered) {
                    router.replace('/login');
                } else {
                    router.replace('/openId');
                }
            };

            determineInitialRoute();
        }
    }, [isReady, authState, isLoading]);

    if (!isReady || isLoading) {
        return (
            <View style={styles.container}>
                <Animatable.View animation="fadeIn" duration={1000}>
                    <LottieView
                        source={require('../assets/fonts/loading.json')}
                        autoPlay
                        loop
                        style={styles.lottieAnimation}
                    />
                </Animatable.View>
                <Animatable.Text 
                    animation="fadeIn"
                    delay={500}
                    style={styles.text}
                >
                    Welcome to your Digital Wallet
                </Animatable.Text>
            </View>
        );
    }
    return null;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff',
    },
    lottieAnimation: {
        width: 150,
        height: 150,
    },
    text: {
        fontFamily: 'Poppins-Bold',
        fontSize: 32,
        color: '#0078D4',
        marginTop: 20,
    }
});