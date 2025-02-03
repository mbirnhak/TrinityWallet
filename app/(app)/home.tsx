// app/(app)/home.tsx
import { Text, View, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { requestCredential } from '../../services/credentialIssuance';
import { CredentialStorage, StoredCredential } from '../../services/credentialStorage';
import * as Animatable from 'react-native-animatable';
import { useEffect, useState } from 'react';

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
            Alert.alert('Error', 'Failed to fetch credentials');
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
            console.error('Error:', error);
            Alert.alert('Error', 'Failed to request credentials.');
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
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.error('Error viewing credential:', error);
            Alert.alert('Error', 'Failed to view credential details');
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Animatable.View animation="fadeIn" duration={1500} style={styles.contentContainer}>
                <Text style={styles.welcomeText}>eIDAS Wallet</Text>

                <TouchableOpacity 
                    onPress={handleCredentialRequest} 
                    style={[
                        styles.requestCredentialButton,
                        loading && styles.buttonDisabled
                    ]}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Processing...' : 'Request Credentials'}
                    </Text>
                </TouchableOpacity>

                {credentials ? (
                    <View style={styles.credentialContainer}>
                        <Text style={styles.credentialTitle}>Stored Credentials:</Text>
                        
                        <TouchableOpacity 
                            style={styles.credentialItem}
                            onPress={() => viewCredentialDetails('jwt_vc')}
                        >
                            <Text style={styles.credentialLabel}>
                                PID (SD-JWT-VC): 
                                <Text style={credentials.jwt_vc ? styles.statusSuccess : styles.statusMissing}>
                                    {credentials.jwt_vc ? ' ✓' : ' ✗'}
                                </Text>
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.credentialItem}
                            onPress={() => viewCredentialDetails('mdoc')}
                        >
                            <Text style={styles.credentialLabel}>
                                PID (mDOC): 
                                <Text style={credentials.mdoc ? styles.statusSuccess : styles.statusMissing}>
                                    {credentials.mdoc ? ' ✓' : ' ✗'}
                                </Text>
                            </Text>
                        </TouchableOpacity>

                        {credentials.timestamp && (
                            <Text style={styles.timestampText}>
                                Last Updated: {new Date(credentials.timestamp).toLocaleString()}
                            </Text>
                        )}
                    </View>
                ) : !loading && (
                    <Text style={styles.noCredentialText}>No credentials issued yet</Text>
                )}

                <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
                    <Text style={styles.buttonText}>Sign Out</Text>
                </TouchableOpacity>
            </Animatable.View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    contentContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        paddingTop: 40,
    },
    welcomeText: {
        fontFamily: 'Poppins-Bold',
        fontSize: 32,
        color: '#0078D4',
        marginBottom: 40,
    },
    requestCredentialButton: {
        width: '80%',
        height: 50,
        borderRadius: 25,
        backgroundColor: '#28a745',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        elevation: 3,
    },
    buttonDisabled: {
        opacity: 0.7,
        backgroundColor: '#666',
    },
    signOutButton: {
        width: '80%',
        height: 50,
        borderRadius: 25,
        backgroundColor: '#0078D4',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        elevation: 3,
    },
    buttonText: {
        fontFamily: 'Poppins-Bold',
        color: '#ffffff',
        fontSize: 18,
    },
    credentialContainer: {
        width: '90%',
        padding: 20,
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    credentialTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    credentialItem: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginVertical: 4,
        backgroundColor: '#fff',
        borderRadius: 6,
    },
    credentialLabel: {
        fontSize: 16,
    },
    statusSuccess: {
        color: '#28a745',
        fontWeight: 'bold',
    },
    statusMissing: {
        color: '#dc3545',
        fontWeight: 'bold',
    },
    timestampText: {
        fontSize: 12,
        color: '#666',
        marginTop: 12,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    noCredentialText: {
        marginTop: 20,
        fontSize: 14,
        color: '#666',
    },
});