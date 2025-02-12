import { Text, View, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { requestCredential } from '../../services/credentialIssuance';
import { CredentialStorage, StoredCredential } from '../../services/credentialStorage';
import * as Animatable from 'react-native-animatable';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from './_layout';
import { LinearGradient } from 'expo-linear-gradient';

export default function Home() {
    const { signOut } = useAuth();
    const [credentials, setCredentials] = useState<StoredCredential | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchCredentials = async () => {
        try {
            const metadata = await CredentialStorage.getMetadata();
            setCredentials(metadata);
        } catch (error) {
            console.error('Error fetching credentials:', error);
            Alert.alert(
                'Error',
                'Failed to fetch credentials. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCredentials();
    }, []);

    const handleCredentialRequest = async () => {
        try {
            setLoading(true);
            await requestCredential();
            await fetchCredentials();
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

    const viewCredentialDetails = async (format: 'jwt_vc' | 'mdoc') => {
        try {
            const credential = await CredentialStorage.retrieveCredential(format);
            if (credential) {
                Alert.alert(
                    `${format.toUpperCase()} Credential`,
                    credential.substring(0, 200) + '...',
                    [{ text: 'Close' }]
                );
            } else {
                Alert.alert(
                    'No Credential',
                    `No ${format.toUpperCase()} credential found.`,
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.error('Error viewing credential:', error);
            Alert.alert(
                'Error',
                'Failed to view credential details. Please try again.',
                [{ text: 'OK' }]
            );
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut();
            router.replace('/login');
        } catch (error) {
            console.error('Error signing out:', error);
            Alert.alert(
                'Error',
                'Failed to sign out. Please try again.',
                [{ text: 'OK' }]
            );
        }
    };

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
                    <Text style={styles.welcomeText}>Trinity Wallet</Text>
                </LinearGradient>

                <TouchableOpacity 
                    onPress={handleCredentialRequest} 
                    style={[
                        styles.requestCredentialButton,
                        loading && styles.buttonDisabled
                    ]}
                    disabled={loading}
                >
                    <LinearGradient
                        colors={[theme.primary, theme.primaryDark]}
                        style={styles.buttonGradient}
                    >
                        <Text style={styles.buttonText}>
                            {loading ? 'Processing...' : 'Request Credentials'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>

                {credentials ? (
                    <Animatable.View 
                        animation="fadeInUp" 
                        duration={800} 
                        style={styles.credentialContainer}
                    >
                        <Text style={styles.credentialTitle}>Stored Credentials</Text>
                        
                        <TouchableOpacity 
                            style={styles.credentialItem}
                            onPress={() => viewCredentialDetails('jwt_vc')}
                        >
                            <View style={styles.credentialContent}>
                                <Text style={styles.credentialLabel}>
                                    PID (SD-JWT-VC)
                                </Text>
                                <Text style={credentials.jwt_vc ? styles.statusSuccess : styles.statusMissing}>
                                    {credentials.jwt_vc ? '✓' : '✗'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.credentialItem}
                            onPress={() => viewCredentialDetails('mdoc')}
                        >
                            <View style={styles.credentialContent}>
                                <Text style={styles.credentialLabel}>
                                    PID (mDOC)
                                </Text>
                                <Text style={credentials.mdoc ? styles.statusSuccess : styles.statusMissing}>
                                    {credentials.mdoc ? '✓' : '✗'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {credentials.timestamp && (
                            <Text style={styles.timestampText}>
                                Last Updated: {new Date(credentials.timestamp).toLocaleString()}
                            </Text>
                        )}
                    </Animatable.View>
                ) : !loading && (
                    <Animatable.Text 
                        animation="fadeIn" 
                        duration={800} 
                        style={styles.noCredentialText}
                    >
                        No credentials issued yet
                    </Animatable.Text>
                )}
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
        justifyContent: 'center',
        alignItems: 'center',
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
    requestCredentialButton: {
        width: '80%',
        height: 50,
        borderRadius: 25,
        overflow: 'hidden',
        marginBottom: 20,
    },
    buttonGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    signOutButton: {
        width: '80%',
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255, 69, 58, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    buttonText: {
        fontFamily: 'Poppins-Bold',
        color: theme.text,
        fontSize: 18,
    },
    credentialContainer: {
        width: '90%',
        padding: 20,
        backgroundColor: theme.surface,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: theme.border,
    },
    credentialTitle: {
        fontFamily: 'Poppins-Bold',
        fontSize: 18,
        color: theme.text,
        marginBottom: 16,
    },
    credentialItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginVertical: 4,
        backgroundColor: theme.darker,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.border,
    },
    credentialContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    credentialLabel: {
        fontFamily: 'Poppins-Medium',
        fontSize: 16,
        color: theme.text,
    },
    statusSuccess: {
        fontFamily: 'Poppins-Bold',
        fontSize: 18,
        color: theme.success,
    },
    statusMissing: {
        fontFamily: 'Poppins-Bold',
        fontSize: 18,
        color: theme.error,
    },
    timestampText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: theme.textSecondary,
        marginTop: 12,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    noCredentialText: {
        fontFamily: 'Poppins-Regular',
        marginTop: 20,
        fontSize: 14,
        color: theme.textSecondary,
        textAlign: 'center',
    },
});