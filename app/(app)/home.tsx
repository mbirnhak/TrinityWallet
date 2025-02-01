import { Text, View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { requestCredential } from '../../services/credentialIssuance';
import * as Animatable from 'react-native-animatable';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';

export default function Home() {
  const { signOut } = useAuth();
  const [credential, setCredential] = useState<string | null>(null);

  useEffect(() => {
    const fetchCredential = async () => {
      const storedCredential = await SecureStore.getItemAsync('credential_token');
      setCredential(storedCredential);
    };
    fetchCredential();
  }, []);

  const handleCredentialRequest = async () => {
    try {
      await requestCredential();
    } catch (error) {
      Alert.alert('Error', 'Failed to start credential request.');
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Animatable.View animation="fadeIn" duration={1500} style={styles.contentContainer}>
        <Text style={styles.welcomeText}>eIDAS Wallet</Text>

        <TouchableOpacity onPress={handleCredentialRequest} style={styles.requestCredentialButton}>
          <Text style={styles.buttonText}>Request Credential</Text>
        </TouchableOpacity>

        {credential ? (
          <View style={styles.credentialContainer}>
            <Text style={styles.credentialText}>Credential Issued:</Text>
            <Text style={styles.credentialValue}>{credential}</Text>
          </View>
        ) : (
          <Text style={styles.noCredentialText}>No credential issued yet</Text>
        )}

        <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </Animatable.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  signOutButton: {
    width: '80%',
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0078D4',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  buttonText: {
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    fontSize: 18,
  },
  credentialContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
  },
  credentialText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  credentialValue: {
    fontSize: 14,
    color: '#333',
  },
  noCredentialText: {
    marginTop: 20,
    fontSize: 14,
    color: '#666',
  },
});
