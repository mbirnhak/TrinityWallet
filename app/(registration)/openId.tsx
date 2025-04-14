import { StyleSheet, Alert, TouchableOpacity, ActivityIndicator, Dimensions, View, Platform, StatusBar, Image, SafeAreaView } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import * as Animatable from 'react-native-animatable';
import { Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Buffer } from 'buffer';
global.Buffer = Buffer;

const { width, height } = Dimensions.get('window');

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
    cardBackground: 'rgba(18, 18, 22, 0.9)',
    headerBackground: 'rgba(18, 18, 20, 0.98)',
    divider: 'rgba(80, 80, 85, 0.3)',
};

// Animation frames from the extracted video
const ANIMATION_FRAMES = [
    require('@/assets/images/frames/ezgif-frame-001.jpg'),
    require('@/assets/images/frames/ezgif-frame-002.jpg'),
    require('@/assets/images/frames/ezgif-frame-003.jpg'),
    require('@/assets/images/frames/ezgif-frame-004.jpg'),
    require('@/assets/images/frames/ezgif-frame-005.jpg'),          
    require('@/assets/images/frames/ezgif-frame-006.jpg'),
    require('@/assets/images/frames/ezgif-frame-007.jpg'),
    require('@/assets/images/frames/ezgif-frame-008.jpg'),
    require('@/assets/images/frames/ezgif-frame-009.jpg'),
    require('@/assets/images/frames/ezgif-frame-010.jpg'),
    require('@/assets/images/frames/ezgif-frame-011.jpg'),
    require('@/assets/images/frames/ezgif-frame-012.jpg'),
    require('@/assets/images/frames/ezgif-frame-013.jpg'),
    require('@/assets/images/frames/ezgif-frame-014.jpg'),
    require('@/assets/images/frames/ezgif-frame-015.jpg'),
    require('@/assets/images/frames/ezgif-frame-016.jpg'),
    require('@/assets/images/frames/ezgif-frame-017.jpg'),
    require('@/assets/images/frames/ezgif-frame-018.jpg'),
    require('@/assets/images/frames/ezgif-frame-019.jpg'),
    require('@/assets/images/frames/ezgif-frame-020.jpg'),
    require('@/assets/images/frames/ezgif-frame-021.jpg'),
    require('@/assets/images/frames/ezgif-frame-022.jpg'),
    require('@/assets/images/frames/ezgif-frame-023.jpg'),
    require('@/assets/images/frames/ezgif-frame-024.jpg'),
    require('@/assets/images/frames/ezgif-frame-025.jpg'),
    require('@/assets/images/frames/ezgif-frame-026.jpg'),
    require('@/assets/images/frames/ezgif-frame-027.jpg'),
    require('@/assets/images/frames/ezgif-frame-028.jpg'),
    require('@/assets/images/frames/ezgif-frame-029.jpg'),
    require('@/assets/images/frames/ezgif-frame-030.jpg'),
];

export default function OpenId() {
    const { authState, oidcRegister, hasEmailHash, isLoading, setIsLoading } = useAuth();
    const [currentFrame, setCurrentFrame] = useState(0);
    const [playbackDirection, setPlaybackDirection] = useState(1); // 1 for forward, -1 for reverse
    const [isLoaded, setIsLoaded] = useState(false);
    const animationRef = useRef(null);

    // Animation frame management
    useEffect(() => {
        // Start after a small delay to ensure images are ready
        setTimeout(() => {
            setIsLoaded(true);
        }, 500);

        let frameInterval: NodeJS.Timeout | undefined;
        
        if (isLoaded) {
            frameInterval = setInterval(() => {
                setCurrentFrame(prevFrame => {
                    let nextFrame = prevFrame + playbackDirection;
                    
                    // Check boundaries for direction change
                    if (playbackDirection === 1 && nextFrame >= ANIMATION_FRAMES.length - 1) {
                        setPlaybackDirection(-1);
                        return prevFrame;
                    } else if (playbackDirection === -1 && nextFrame <= 0) {
                        setPlaybackDirection(1);
                        return 0;
                    }
                    
                    return nextFrame;
                });
            }, 50); // Slightly faster animation for smoother playback
        }
        
        return () => {
            if (frameInterval) clearInterval(frameInterval);
        };
    }, [isLoaded, playbackDirection]);

    // Preload images to prevent flickering
    useEffect(() => {
        ANIMATION_FRAMES.forEach((frame) => {
            const imgUri = Image.resolveAssetSource(frame).uri;
            Image.prefetch(imgUri);
        });
        // Ensure loading value from AuthContext is set to false after preloading
        setIsLoading(false);
    }, []);

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
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* Header with divider */}
            <View style={styles.header}>
                <Animatable.Text
                    animation="fadeIn"
                    duration={800}
                    style={styles.headerTitle}
                >
                    Trinity Wallet
                </Animatable.Text>
            </View>
            <View style={styles.divider} />
            
            <View style={styles.contentContainer}>
                {/* Animation Frame - Now larger and without text inside it */}
                <Animatable.View
                    animation="fadeIn"
                    duration={1000}
                    delay={300}
                    style={styles.videoContainer}
                >
                    {!isLoaded ? (
                        <View style={styles.loaderContainer}>
                            <ActivityIndicator size="large" color={theme.primary} />
                        </View>
                    ) : (
                        <Animatable.View
                            ref={animationRef}
                            style={styles.animationContainer}
                            animation="fadeIn"
                            duration={500}
                        >
                            <Image
                                source={ANIMATION_FRAMES[currentFrame]}
                                style={styles.frameImage}
                                resizeMode="cover"
                                fadeDuration={0} // Remove default fade for smoother animation
                            />
                        </Animatable.View>
                    )}
                    
                    {/* Subtle gradient overlay to enhance visuals */}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.3)']}
                        style={styles.videoOverlay}
                    />
                </Animatable.View>
                
                {/* Security information placed below the video */}
                <Animatable.View
                    animation="fadeIn"
                    duration={1200}
                    delay={500}
                    style={styles.securityInfoContainer}
                >
                    <Text style={styles.securityTitle}>Wallet for the students!</Text>
                    <Text style={styles.securityDescription}>
                        We keep you and your data safe.
                    </Text>
                </Animatable.View>
                
                {/* Spacer to push button to bottom */}
                <View style={styles.spacer} />
                
                {/* Registration Section - Now at the bottom */}
                <Animatable.View
                    animation="fadeInUp"
                    duration={800}
                    delay={600}
                    style={styles.registrationContainer}
                >
                    {isLoading ? (
                        <ActivityIndicator size="large" color={theme.primary} style={styles.loader} />
                    ) : (
                        <TouchableOpacity
                            onPress={handleRegistration}
                            activeOpacity={0.8}
                            style={styles.buttonContainer}
                        >
                            <LinearGradient
                                colors={[theme.primary, theme.primaryDark]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.button}
                            >
                                <Text style={styles.buttonText}>
                                    Register with Microsoft
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </Animatable.View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 10 : 15,
        paddingBottom: 15,
        paddingHorizontal: 20,
        backgroundColor: theme.headerBackground,
    },
    headerTitle: {
        fontFamily: 'Poppins-Bold',
        fontSize: 22,
        color: theme.text,
        textAlign: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: theme.divider,
        width: '100%',
    },
    contentContainer: {
        flex: 1,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
    },
    videoContainer: {
        width: '100%',
        height: height * 0.5, // Taller video frame
        borderRadius: 18,
        overflow: 'hidden',
        marginTop: 24,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
        position: 'relative',
    },
    loaderContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        backgroundColor: theme.darker,
    },
    animationContainer: {
        flex: 1,
        overflow: 'hidden',
        borderRadius: 18,
    },
    frameImage: {
        width: '100%',
        height: '100%',
    },
    videoOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 5,
    },
    securityInfoContainer: {
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 10,
    },
    securityTitle: {
        fontFamily: 'Poppins-Bold',
        fontSize: 18,
        color: theme.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    securityDescription: {
        fontFamily: 'Poppins-Regular',
        fontSize: 15,
        color: theme.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    spacer: {
        flex: 1, // Pushes the button to the bottom
    },
    registrationContainer: {
        width: '100%',
        paddingBottom: Platform.OS === 'ios' ? 20 : 24,
    },
    buttonContainer: {
        width: '100%',
        borderRadius: 30,
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    button: {
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
    },
    buttonText: {
        fontFamily: 'Poppins-Bold',
        color: theme.text,
        fontSize: 17,
    },
    loader: {
        marginVertical: 25,
    },
});