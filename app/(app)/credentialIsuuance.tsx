// (app)/credentialIssuance.tsx

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator, 
  FlatList 
} from 'react-native';
import { router } from 'expo-router';
import CredentialIssuanceService from '@/services/CredentialIssuance';

interface MetadataItem {
  id: string;
  title: string;
  description: string;
}

interface IssuedCredential {
  id: string;
  type: string;
  issuer: string;
}

interface CredentialBatchResponse {
  credential_responses: IssuedCredential[];
}

export default function CredentialIssuance() {
  const [metadata, setMetadata] = useState<MetadataItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [issuedCredentials, setIssuedCredentials] = useState<IssuedCredential[]>([]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setIsLoading(true);
        const fetched = await CredentialIssuanceService.fetchMetadata();
        // If your server returns an array, transform it; otherwise,
        // you can keep it simple. For demonstration, let's assume
        // we parse it into an array of items with {id, title, description}.
        // If it's an object, adapt as needed.
        
        // Example: if the server returned a single object, do:
        // const items: MetadataItem[] = [{
        //   id: 'vc+sd-jwt',
        //   title: 'MDL Credential',
        //   description: 'Mobile drivers license'
        // }];
        
        // For demonstration only, let's keep a mock:
        const items: MetadataItem[] = [
          { id: '1', title: 'MDL Credential', description: 'Issue an MDL in SD-JWT format.' },
        ];
        
        setMetadata(items);
      } catch (error) {
        console.error('Error fetching metadata:', error);
        Alert.alert('Error', 'Failed to fetch metadata. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMetadata();
  }, []);

  /**
   * Handle Credential Issuance (batch)
   */
  const handleIssueCredentials = async () => {
    try {
      setIsLoading(true);

      // 1. Create a JWT proof
      const proofJwt = await CredentialIssuanceService.createProofJwt('https://issuer.eudiw.dev');

      // 2. Build your request for a "vc+sd-jwt" credential
      //    e.g. doctype = 'eu.europa.ec.eudi.mdl_jwt_vc_json'
      //    If your server needs claims, add them under e.g. "claims": { ... }
      const credentialRequestPayload = [
        {
          format: 'vc+sd-jwt',
          doctype: 'eu.europa.ec.eudi.mdl_jwt_vc_json',
          proof: {
            proof_type: 'jwt',
            jwt: proofJwt,
          },
          // If the server expects user claims, add them here
          // claims: { ... },
        },
      ];

      // 3. Call requestBatchCredentials
      const response = await CredentialIssuanceService.requestBatchCredentials(
        credentialRequestPayload
      ) as CredentialBatchResponse;

      const newCredentials = response.credential_responses || [];
      setIssuedCredentials(newCredentials);

      // 4. Save the first credential to SecureStore for demonstration
      if (newCredentials.length > 0) {
        await CredentialIssuanceService.saveCredential(newCredentials[0]);
      }

      Alert.alert('Success', 'Credential(s) issued successfully!');
    } catch (error) {
      console.error('Error issuing credentials:', error);
      Alert.alert('Error', 'Failed to issue credentials. See logs for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderMetadataItem = ({ item }: { item: MetadataItem }) => (
    <View style={styles.metadataItem}>
      <Text style={styles.metadataTitle}>{item.title}</Text>
      <Text style={styles.metadataSubtitle}>{item.description}</Text>
    </View>
  );

  const renderCredentialItem = ({ item }: { item: IssuedCredential }) => (
    <View style={styles.credentialItem}>
      <Text style={styles.credentialText}>Credential ID: {item.id}</Text>
      <Text style={styles.credentialText}>Type: {item.type}</Text>
      <Text style={styles.credentialText}>Issuer: {item.issuer}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Credential Issuance</Text>
      {isLoading ? (
        <ActivityIndicator size="large" color="#0078D4" style={styles.loader} />
      ) : (
        <>
          <FlatList
            data={metadata}
            keyExtractor={(item) => item.id}
            renderItem={renderMetadataItem}
            ListEmptyComponent={<Text style={styles.emptyText}>No metadata available.</Text>}
            style={styles.metadataList}
          />
          <TouchableOpacity style={styles.issueButton} onPress={handleIssueCredentials}>
            <Text style={styles.buttonText}>Issue Credentials</Text>
          </TouchableOpacity>

          <FlatList
            data={issuedCredentials}
            keyExtractor={(item) => item.id}
            renderItem={renderCredentialItem}
            ListEmptyComponent={<Text style={styles.emptyText}>No credentials issued yet.</Text>}
            style={styles.credentialsList}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, padding: 20, backgroundColor: '#fff',
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#0078D4',
    marginBottom: 20,
    textAlign: 'center',
  },
  metadataList: {
    marginBottom: 20,
  },
  metadataItem: {
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
  metadataTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    color: '#333',
  },
  metadataSubtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  issueButton: {
    backgroundColor: '#0078D4',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    fontFamily: 'Poppins-Regular',
    color: '#FFFFFF',
    fontSize: 16,
  },
  credentialsList: {
    marginTop: 20,
  },
  credentialItem: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
  },
  credentialText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333',
  },
  loader: {
    marginTop: 30,
  },
  emptyText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});
