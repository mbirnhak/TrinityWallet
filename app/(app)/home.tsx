// app/(app)/home.tsx
import { Text, View, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { findIssuerKeyByType, requestCredential } from '../../services/credentialIssuance';
import { CredentialStorage, StoredCredential } from '../../services/credentialStorage';
import * as Animatable from 'react-native-animatable';
import { useEffect, useState } from 'react';
import { createSdJwt } from '@/services/Credentials/SdJwtVc';
import type { DisclosureFrame, SD, DECOY } from '@sd-jwt/types';
import * as SecureStore from 'expo-secure-store';
import { ES256 } from '@/services/Credentials/utils';
import QuickCrypto from 'react-native-quick-crypto';

export default function Home() {
  const { signOut } = useAuth();
  // const claims = {
  //   firstname: 'John',
  //   lastname: 'Doe',
  //   ssn: '123-45-6789',
  //   id: '1234',
  // };
  // const credentialPayload = {
  //   iss: 'Issuer',
  //   iat: new Date().getTime(),
  //   vct: 'ExampleCredentials',
  //   ...claims,
  // };
  // const disclosureFrame: DisclosureFrame<typeof claims> = {
  //   _sd: ['firstname', 'lastname', 'ssn'],
  // };
  const testPresentation = async () => {
    const credential = await CredentialStorage.retrieveCredential('jwt_vc');
    if (!credential) {
      return null;
    }
    const privateKey_string = await SecureStore.getItemAsync("priv-key");
    const publicKey_string = await SecureStore.getItemAsync("pub-key");
    if (!privateKey_string || !publicKey_string) {
      return null;
    }
    const privateKey = JSON.parse(privateKey_string);
    const publicKey = JSON.parse(publicKey_string);
    const sdjwt = await createSdJwt(privateKey, publicKey);

    type SdJwtClaims = {
      [key: string]: any;
      _sd?: string[];
    };

    const claims = await sdjwt.getClaims(credential) as SdJwtClaims;
    // const disclosureFrame = {
    //   _sd: ['given_name', 'family_name'],
    // } as DisclosureFrame<typeof claims>; 
    const disclosureFrame = {
      "given_name": true,
      "family_name": true
    };
    // as DisclosureFrame<typeof claims>

    const presentation = await sdjwt.presentCredential(credential, disclosureFrame);
    console.log("Presentation: ", presentation);
  }

  const testCredValidation = async () => {
    const credential = await CredentialStorage.retrieveCredential('jwt_vc');
    if (!credential) {
      return null;
    }
    console.log("cred: ", credential);
    const [header, payload, signature_disclosures] = credential.split('.');
    const [signature_base64_url, ...disclosures] = signature_disclosures.split('~');
    console.log("signature base64_url: ", signature_base64_url);
    const data = `${header}.${payload}`;
    const oidcMetadata_string = await SecureStore.getItemAsync('issuer_metadata');
    if (!oidcMetadata_string) {
      return null;
    }
    const oidcMetadata = JSON.parse(oidcMetadata_string);
    const issuer_pub_key_response = await fetch(oidcMetadata.jwks_uri);
    if (!issuer_pub_key_response.ok) {
      const errorText = await issuer_pub_key_response.text();
      console.error('[Step 4] Issuer public key retrieval failes:', errorText);
      throw new Error(`Failed with status: ${issuer_pub_key_response.status}`);
    }
    const issuer_pub_keys = await issuer_pub_key_response.json();
    const issuer_pub_key = findIssuerKeyByType(issuer_pub_keys, "EC");
    if (!issuer_pub_key) {
      throw new Error("Required EC public key not found");
    }
    // console.log("ISS PUB KEY full structure:", JSON.stringify(issuer_pub_key, null, 2));
    // const sdJwt_check_cred_valid = await createSdJwt({}, issuer_pub_key)
    // console.log("Before validating but after creating sdjwt instance")
    // const valid = await sdJwt_check_cred_valid.validateCredential(credential);
    // console.log('Credential Validity: ', valid);
    const encoder = new TextEncoder();
    const signature_base64 = signature_base64_url
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    console.log("Signature base64: ", signature_base64);
    // Then convert base64 to Uint8Array
    let signature;
    try {
      signature = Uint8Array.from(atob(signature_base64), c => c.charCodeAt(0));
    } catch (error) {
      console.error("Error converting to array: ", error);
    }
    if (!signature) {
      return null;
    }
    console.log("Signature: ", signature);
    if (!signature) {
      return null;
    }
    let publicKey;
    try {
      publicKey = await QuickCrypto.subtle.importKey(
        'jwk',
        issuer_pub_key,
        {
          name: 'ECDSA',
          namedCurve: 'P-256', // Must match the curve used to generate the key
        },
        true, // whether the key is extractable (i.e., can be used in exportKey)
        ['verify'],
      );
    } catch (error) {
      console.error("Error importing key: ", error);
    }
    if (!publicKey) {
      return null;
    }
    try {
      const isValid = await QuickCrypto.subtle.verify(
        {
          name: 'ECDSA',
          hash: { name: 'SHA-256' }, // Required for ES256
        },
        publicKey,
        signature,
        encoder.encode(data),
      );
      console.log("IsValid: ", isValid);
    } catch (error) {
      console.error("Error Verifying: ", error);
    }
  }

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
              onPress={testCredValidation}
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