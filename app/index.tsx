import { router } from 'expo-router';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import * as Animatable from 'react-native-animatable';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from './_layout';

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
            <LinearGradient
                colors={[theme.dark, theme.background]}
                style={styles.container}
            >
                <Animatable.View 
                    animation="fadeIn" 
                    duration={1000}
                    style={styles.content}
                >
                    <LottieView
                        source={require('../assets/fonts/loading.json')}
                        autoPlay
                        loop
                        style={styles.lottieAnimation}
                    />
                    <Animatable.Text 
                        animation="fadeIn"
                        delay={500}
                        style={styles.text}
                    >
                        Welcome to your Digital Wallet
                    </Animatable.Text>
                </Animatable.View>
            </LinearGradient>
        );
    }
    return null;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    lottieAnimation: {
        width: 150,
        height: 150,
    },
    text: {
        fontFamily: 'Poppins-Bold',
        fontSize: 32,
        color: theme.text,
        marginTop: 20,
        textAlign: 'center',
        paddingHorizontal: 20,
    }
});