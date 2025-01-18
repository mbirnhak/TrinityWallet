// (app)/home.tsx

import React, { useState } from 'react';
import { Text, View, TouchableOpacity, StyleSheet, Alert, FlatList, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import * as Animatable from 'react-native-animatable';
import CredentialIssuanceService from '@/services/CredentialIssuance';

interface IssuedCredential {
  id: string;
  type: string;
  issuer: string;
}

export default function Home() {
  const { signOut } = useAuth();
  const [issuedCredentials, setIssuedCredentials] = useState<IssuedCredential[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Fetch and display issued credentials from the issuer.
   */
  const handleFetchCredentials = async () => {
    try {
      setIsLoading(true);

      // Example of requesting a batch of credentials
      const credentialRequestPayload = [
        {
          format: 'vc+sd-jwt',
          doctype: 'eu.europa.ec.eudi.mdl_jwt_vc_json',
          proof: {
            proof_type: 'dpop',
          },
        },
      ];

      // Request credentials
      const response = await CredentialIssuanceService.requestBatchCredentials(credentialRequestPayload);

      // Adjust parsing if needed based on actual response shape
      const issuedCredentialsList = ((response as { credential_responses: IssuedCredential[] }).credential_responses) || [];
      setIssuedCredentials(issuedCredentialsList);

      if (issuedCredentialsList.length > 0) {
        await CredentialIssuanceService.saveCredential(issuedCredentialsList[0]);
        Alert.alert('Success', 'Credential saved successfully.');
      }

      Alert.alert('Success', 'Credentials issued successfully.');
    } catch (error) {
      console.error('Error issuing credentials:', error);
      Alert.alert('Error', 'Failed to issue credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Display individual credential details.
   */
  const renderCredentialItem = ({ item }: { item: IssuedCredential }) => (
    <View style={styles.credentialItem}>
      <Text style={styles.credentialText}>Credential ID: {item.id}</Text>
      <Text style={styles.credentialText}>Type: {item.type}</Text>
      <Text style={styles.credentialText}>Issuer: {item.issuer}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Animatable.View animation="fadeIn" duration={1500} style={styles.contentContainer}>
        <Text style={styles.welcomeText}>eIDAS Wallet</Text>

        <TouchableOpacity
          onPress={handleFetchCredentials}
          style={styles.actionButton}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Issue Credentials</Text>
          )}
        </TouchableOpacity>

        <FlatList
          data={issuedCredentials}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderCredentialItem}
          style={styles.credentialsList}
          ListEmptyComponent={<Text style={styles.emptyText}>No credentials issued yet.</Text>}
        />

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
    paddingHorizontal: 20,
  },
  welcomeText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 32,
    color: '#0078D4',
    marginBottom: 40,
  },
  actionButton: {
    width: '80%',
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0078D4',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    marginBottom: 20,
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
  credentialsList: {
    flex: 1,
    width: '100%',
    marginTop: 20,
  },
  credentialItem: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  credentialText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333',
  },
  emptyText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 18,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
});
