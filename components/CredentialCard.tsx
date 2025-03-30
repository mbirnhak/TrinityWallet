import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

const theme = {
    dark: '#000000',
    darker: '#1C1C1E',
    surface: '#18181B',
    primary: '#0A84FF',
    primaryDark: '#0066CC',
    text: '#FFFFFF',
    textSecondary: '#98989F',
    border: '#2C2C2E',
    error: '#FF453A',
    success: '#32D74B',
};

type CredentialCardProps = {
    type: 'jwt_vc' | 'mdoc';
    isAvailable: boolean;
    timestamp?: string;
    onPress: () => void;
    theme: {
        dark: string;
        darker: string;
        primary: string;
        primaryDark: string;
        secondary: string;
        accent: string;
        text: string;
        textSecondary: string;
        surface: string;
        border: string;
        error: string;
        success: string;
        background: string;
    }
}

const CredentialCard = ({ 
    type, 
    isAvailable, 
    timestamp,
    onPress 
}: CredentialCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const expandAnim = useRef(new Animated.Value(0)).current;
    
    const handlePress = () => {
        setIsExpanded(!isExpanded);
        Animated.spring(expandAnim, {
            toValue: isExpanded ? 0 : 1,
            tension: 50,
            friction: 12,
            useNativeDriver: false,
        }).start();
    };

    const cardHeight = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [220, 340]
    });

    const cardScale = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.02]
    });

    const getCardColors = (): {
        colors: [string, string, ...string[]];
        start: { x: number; y: number };
        end: { x: number; y: number };
        textColor: string;
    } => {
        switch(type) {
            case 'jwt_vc':
                // Metallic silver like Apple Card
                return {
                    colors: ['#D8D8D8', '#FFFFFF', '#E8E8E8'],
                    start: { x: 0, y: 0 },
                    end: { x: 1, y: 1 },
                    textColor: '#000000'
                };
            case 'mdoc':
                // Deep blue like Amex
                return {
                    colors: ['#0076BE', '#002663', '#001A4D'],
                    start: { x: 0, y: 0 },
                    end: { x: 1, y: 1 },
                    textColor: '#FFFFFF'
                };
            default:
                return {
                    colors: [theme.surface, theme.darker],
                    start: { x: 0, y: 0 },
                    end: { x: 1, y: 1 },
                    textColor: theme.text
                };
        }
    };

    const getCredentialInfo = () => {
        return {
            title: 'Personal ID',
            type: type === 'jwt_vc' ? 'JWT-VC' : 'mDOC'
        };
    };

    const getCardIcon = () => {
        switch(type) {
            case 'jwt_vc':
                return 'key';
            case 'mdoc':
                return 'card';
            default:
                return 'document';
        }
    };

    const formatDate = (timestamp: string) => {
        try {
            const date = new Date(parseInt(timestamp));
            return date.toLocaleString();
        } catch (error) {
            return 'Date not available';
        }
    };

    const cardStyle = getCardColors();
    const credentialInfo = getCredentialInfo();

    return (
        <Animated.View style={[
            styles.cardContainer,
            {
                height: cardHeight,
                transform: [{ scale: cardScale }]
            }
        ]}>
            <TouchableOpacity 
                activeOpacity={0.95} 
                onPress={handlePress}
                style={styles.touchable}
            >
                <LinearGradient
                    colors={cardStyle.colors}
                    start={cardStyle.start}
                    end={cardStyle.end}
                    style={styles.cardContent}
                >
                    <View style={styles.header}>
                        <View style={styles.titleRow}>
                            <Ionicons 
                                name={getCardIcon()} 
                                size={28} 
                                color={cardStyle.textColor} 
                                style={styles.icon}
                            />
                            <View>
                                <Text style={[
                                    styles.title,
                                    { color: cardStyle.textColor }
                                ]}>
                                    {credentialInfo.title}
                                </Text>
                                <Text style={[
                                    styles.subtitle,
                                    { color: cardStyle.textColor }
                                ]}>
                                    ({credentialInfo.type})
                                </Text>
                            </View>
                        </View>
                        
                        {isAvailable && (
                            <Ionicons 
                                name="checkmark-circle" 
                                size={24} 
                                color={cardStyle.textColor}
                                style={{ opacity: 0.8 }}
                            />
                        )}
                    </View>

                    <View style={styles.typeContainer}>
                        <Text style={[styles.typeText, { color: cardStyle.textColor }]}>
                            {credentialInfo.type}
                        </Text>
                    </View>

                    {isExpanded && isAvailable && (
                        <Animatable.View 
                            animation="fadeIn"
                            duration={400}
                            style={styles.details}
                        >
                            <View style={[styles.divider, { backgroundColor: cardStyle.textColor }]} />
                            
                            <View style={styles.detailsRow}>
                                <Text style={[styles.detailsLabel, { color: cardStyle.textColor }]}>
                                    ISSUED
                                </Text>
                                <Text style={[styles.detailsValue, { color: cardStyle.textColor }]}>
                                    {formatDate(timestamp || '')}
                                </Text>
                            </View>

                            <TouchableOpacity 
                                style={[styles.viewButton, { backgroundColor: type === 'jwt_vc' ? '#000000' : '#FFFFFF' }]}
                                onPress={onPress}
                            >
                                <Text style={[styles.viewButtonText, { color: type === 'jwt_vc' ? '#FFFFFF' : '#000000' }]}>
                                    View Details
                                </Text>
                            </TouchableOpacity>
                        </Animatable.View>
                    )}
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        width: '100%',
        marginVertical: 10,
        borderRadius: 20,
        overflow: 'hidden',
    },
    touchable: {
        flex: 1,
    },
    cardContent: {
        flex: 1,
        padding: 20,
        borderRadius: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        marginRight: 12,
    },
    title: {
        fontFamily: 'Poppins-Bold',
        fontSize: 24,
    },
    subtitle: {
        fontFamily: 'Poppins-Medium',
        fontSize: 16,
        opacity: 0.8,
        marginTop: -2,
    },
    typeContainer: {
        marginTop: 30,
    },
    typeText: {
        fontFamily: 'Poppins-Bold',
        fontSize: 28,
        letterSpacing: 2,
        opacity: 0.9,
    },
    details: {
        marginTop: 20,
    },
    divider: {
        height: 0.5,
        opacity: 0.3,
        marginVertical: 15,
    },
    detailsRow: {
        marginTop: 10,
    },
    detailsLabel: {
        fontFamily: 'Poppins-Medium',
        fontSize: 12,
        opacity: 0.7,
        marginBottom: 4,
    },
    detailsValue: {
        fontFamily: 'Poppins-Bold',
        fontSize: 16,
    },
    viewButton: {
        marginTop: 20,
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    viewButtonText: {
        fontFamily: 'Poppins-Bold',
        fontSize: 16,
    },
});

export default CredentialCard;