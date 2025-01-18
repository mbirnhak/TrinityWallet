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
import CredentialIssuanceService from '@/services/CredentialIssuance';
import { router } from 'expo-router';

// Define types for metadata and issued credentials
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

interface CredentialResponse {
  credential_responses: IssuedCredential[];
}

export default function CredentialIssuance() {
  const [metadata, setMetadata] = useState<MetadataItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [issuedCredentials, setIssuedCredentials] = useState<IssuedCredential[]>([]);

  /**
   * Fetch Credential Metadata on Component Load
   */
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setIsLoading(true);
        const fetchedMetadata = await CredentialIssuanceService.fetchMetadata();
        
        // Transform the data if necessary
        const transformedMetadata: MetadataItem[] = Array.isArray(fetchedMetadata) ? fetchedMetadata.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description,
        })) : [];
        
        setMetadata(transformedMetadata);
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
   * Handle Credential Issuance
   */
  const handleIssueCredentials = async () => {
    try {
      setIsLoading(true);

      // Example payload for requesting credentials
      const credentialRequestPayload = [
        {
          format: 'vc+sd-jwt',
          doctype: 'eu.europa.ec.eudi.mdl_jwt_vc_json',
          proof: {
            proof_type: 'dpop', // Example: replace with real proof type if needed
          },
        },
      ];

      // Request a batch of credentials
      const response = await CredentialIssuanceService.requestBatchCredentials(
        credentialRequestPayload
      ) as CredentialResponse;

      // TypeScript now knows the shape of response
      const issuedCredentialsList = response.credential_responses || [];
      setIssuedCredentials(issuedCredentialsList);

      // For demonstration, save the first credential to secure storage
      if (issuedCredentialsList.length > 0) {
        await CredentialIssuanceService.saveCredential(issuedCredentialsList[0]);
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
   * Render Metadata Item
   */
  const renderMetadataItem = ({ item }: { item: MetadataItem }) => (
    <View style={styles.metadataItem}>
      <Text style={styles.metadataTitle}>{item.title}</Text>
      <Text style={styles.metadataSubtitle}>{item.description}</Text>
    </View>
  );

  /**
   * Render Issued Credential Item
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
      <Text style={styles.title}>Credential Issuance</Text>
      {isLoading ? (
        <ActivityIndicator size="large" color="#0078D4" style={styles.loader} />
      ) : (
        <>
          <FlatList
            data={metadata}
            keyExtractor={(item) => item.id}
            renderItem={renderMetadataItem}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No metadata available.</Text>
            }
            style={styles.metadataList}
          />
          <TouchableOpacity
            style={styles.issueButton}
            onPress={handleIssueCredentials}
          >
            <Text style={styles.buttonText}>Issue Credentials</Text>
          </TouchableOpacity>

          <FlatList
            data={issuedCredentials}
            keyExtractor={(item) => item.id}
            renderItem={renderCredentialItem}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No credentials issued yet.</Text>
            }
            style={styles.credentialsList}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
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
