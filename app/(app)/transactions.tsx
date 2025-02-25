import { View, ScrollView, StyleSheet, Alert, Text } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { requestCredential } from '../../services/credentialIssuance';
import * as Animatable from 'react-native-animatable';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from './_layout';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Transactions() {
    const [loading, setLoading] = useState(false);

    const handleCredentialRequest = async () => {
        try {
            setLoading(true);
            await requestCredential();
            Alert.alert('Success', 'Credentials requested successfully');
        } catch (error) {
            console.error('Error requesting credentials:', error);
            Alert.alert(
                'Error',
                'Failed to request credentials. Please check your connection and try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDoor = () => {
        Alert.alert('Coming Soon', 'Door access feature will be available soon!');
    };

    const handleIssueBook = () => {
        Alert.alert('Coming Soon', 'Book issuance feature will be available soon!');
    };

    const ActionButton = ({ 
        onPress, 
        icon, 
        title, 
        description,
        loading = false,
        gradient = [theme.primary, theme.primaryDark]
    }) => (
        <TouchableOpacity 
            onPress={onPress}
            disabled={loading}
            style={styles.actionButton}
        >
            <LinearGradient
                colors={gradient}
                style={styles.actionGradient}
            >
                <View style={styles.actionContent}>
                    <View style={styles.actionIcon}>
                        <Ionicons name={icon} size={32} color={theme.text} />
                    </View>
                    <View style={styles.actionTextContainer}>
                        <Text style={styles.actionTitle}>
                            {loading ? 'Processing...' : title}
                        </Text>
                        <Text style={styles.actionDescription}>
                            {description}
                        </Text>
                    </View>
                    <Ionicons 
                        name="chevron-forward" 
                        size={24} 
                        color={theme.text} 
                        style={styles.actionArrow}
                    />
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );

    return (
        <ScrollView 
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            <Animatable.View 
                animation="fadeIn" 
                duration={1500} 
                style={styles.contentContainer}
            >
                <LinearGradient
                    colors={['rgba(10, 132, 255, 0.1)', 'transparent']}
                    style={styles.gradientHeader}
                >
                    <Text style={styles.welcomeText}>Transactions</Text>
                    <Text style={styles.subtitleText}>
                        Manage your credentials and access
                    </Text>
                </LinearGradient>

                <View style={styles.actionsContainer}>
                    <ActionButton 
                        onPress={handleCredentialRequest}
                        icon="key"
                        title="Request Credentials"
                        description="Get your digital credentials"
                        loading={loading}
                    />

                    <ActionButton 
                        onPress={handleOpenDoor}
                        icon="lock-open"
                        title="Open Door"
                        description="Access secure areas"
                        gradient={[theme.accent, '#4B0082']}
                    />

                    <ActionButton 
                        onPress={handleIssueBook}
                        icon="book"
                        title="Issue Book"
                        description="Library services"
                        gradient={['#FF6B6B', '#EE0000']}
                    />
                </View>
            </Animatable.View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.dark,
    },
    scrollContent: {
        flexGrow: 1,
    },
    contentContainer: {
        flexGrow: 1,
        padding: 20,
        paddingTop: 40,
    },
    gradientHeader: {
        width: '100%',
        paddingVertical: 20,
        alignItems: 'center',
        borderRadius: 15,
        marginBottom: 40,
    },
    welcomeText: {
        fontFamily: 'Poppins-Bold',
        fontSize: 32,
        color: theme.text,
        textAlign: 'center',
    },
    subtitleText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 16,
        color: theme.textSecondary,
        marginTop: 8,
    },
    actionsContainer: {
        gap: 16,
    },
    actionButton: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 4,
    },
    actionGradient: {
        padding: 2,
    },
    actionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: theme.darker,
        borderRadius: 15,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    actionTextContainer: {
        flex: 1,
    },
    actionTitle: {
        fontFamily: 'Poppins-Bold',
        fontSize: 18,
        color: theme.text,
        marginBottom: 4,
    },
    actionDescription: {
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        color: theme.textSecondary,
    },
    actionArrow: {
        marginLeft: 8,
    },
});