import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';

// Import theme directly
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
            useNativeDriver: false,
        }).start();
    };

    const cardHeight = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [120, 250]
    });

    const getCardTitle = () => {
        switch(type) {
            case 'jwt_vc':
                return 'Personal ID (SD-JWT-VC)';
            case 'mdoc':
                return 'Personal ID (mDOC)';
            default:
                return 'Unknown Credential';
        }
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

    return (
        <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={handlePress}
        >
            <Animated.View style={[styles.card, { height: cardHeight }]}>
                <LinearGradient
                    colors={[theme.surface, theme.darker]}
                    style={styles.cardContent}
                >
                    <View style={styles.header}>
                        <View style={styles.titleContainer}>
                            <Ionicons 
                                name={getCardIcon()} 
                                size={24} 
                                color={isAvailable ? theme.primary : theme.textSecondary} 
                            />
                            <Text style={[
                                styles.title,
                                !isAvailable && styles.unavailableText
                            ]}>
                                {getCardTitle()}
                            </Text>
                        </View>
                        <Text style={[
                            styles.status,
                            isAvailable ? styles.statusSuccess : styles.statusMissing
                        ]}>
                            {isAvailable ? '✓' : '✗'}
                        </Text>
                    </View>

                    {isExpanded && isAvailable && (
                        <Animatable.View 
                            animation="fadeIn"
                            duration={500}
                            style={styles.details}
                        >
                            <View style={styles.divider} />
                            <Text style={styles.detailsTitle}>Credential Details</Text>
                            <Text style={styles.detailsText}>
                                Type: {type.toUpperCase()}
                            </Text>
                            {timestamp && (
                                <Text style={styles.detailsText}>
                                    Issued: {formatDate(timestamp)}
                                </Text>
                            )}
                            <TouchableOpacity 
                                style={styles.viewButton}
                                onPress={onPress}
                            >
                                <Text style={styles.viewButtonText}>
                                    View Credential
                                </Text>
                            </TouchableOpacity>
                        </Animatable.View>
                    )}
                </LinearGradient>
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        width: '100%',
        marginVertical: 8,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.border,
    },
    cardContent: {
        flex: 1,
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    title: {
        fontFamily: 'Poppins-Bold',
        fontSize: 18,
        color: theme.text,
        marginLeft: 12,
    },
    unavailableText: {
        color: theme.textSecondary,
    },
    status: {
        fontFamily: 'Poppins-Bold',
        fontSize: 24,
    },
    statusSuccess: {
        color: theme.success,
    },
    statusMissing: {
        color: theme.error,
    },
    details: {
        marginTop: 16,
    },
    divider: {
        height: 1,
        backgroundColor: theme.border,
        marginVertical: 12,
    },
    detailsTitle: {
        fontFamily: 'Poppins-Bold',
        fontSize: 16,
        color: theme.text,
        marginBottom: 8,
    },
    detailsText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        color: theme.textSecondary,
        marginBottom: 4,
    },
    viewButton: {
        backgroundColor: theme.primary,
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 12,
    },
    viewButtonText: {
        fontFamily: 'Poppins-Bold',
        color: theme.text,
        fontSize: 14,
    },
});

export default CredentialCard;