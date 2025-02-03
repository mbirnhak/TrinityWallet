// app/(app)/home.tsx
import { Text, View, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { requestCredential } from '../../services/credentialIssuance';
import { CredentialStorage, StoredCredential } from '../../services/credentialStorage';
import * as Animatable from 'react-native-animatable';
import { useEffect, useState } from 'react';
import { createSdJwt } from '@/services/Credentials/SdJwtVc';
import type { DisclosureFrame } from '@sd-jwt/types';
import { jwtDecode, JwtPayload, JwtHeader } from 'jwt-decode';

export default function Home() {
  const { signOut } = useAuth();
  interface PublicKeyJWK {
    crv: string;
    kty: string;
    x: string;
    y: string;
    [key: string]: any;  // This allows other dynamic properties
  }
  interface CustomJwtHeader extends JwtHeader {
    jwk?: PublicKeyJWK;  // Define the `jwk` property with the appropriate type (here as an object, but adjust as needed)
  }
  const jwt = "eyJ0eXAiOiJvcGVuaWQ0dmNpLXByb29mK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7Imt0eSI6IkVDIiwiY3J2IjoiUC0yNTYiLCJ4Ijoid1V1UDJPbHdIZWZlRS1ZMTZXajdQSEF6WjBKQVF5ZXZxV01mZDUtS21LWSIsInkiOiJZVy1iOE8zVWszTlVyazlvWnBBVDFsYVBlQWdpTlF3RGNvdFdpd0JGUTZFIn19.eyJhdWQiOiJodHRwczovL3ByZXByb2QuaXNzdWVyLmV1ZGl3LmRldi9vaWRjIiwibm9uY2UiOiJTcUdTMzc0eUFheFpIc254aUs5NWVnIiwiaWF0IjoxNzA0ODg2ODU1fQ.IdmxwbfJIKwcaqvADp6bzV2u-o0UwKIVmo_kQkc1rZHQ9MtBDNbO21NoVr99ZEgumTX8UYNFJcr_R95xfO1NiA"
  const decoded = jwtDecode<CustomJwtHeader>(jwt, { header: true });
  const pub_jwk = decoded?.jwk;
  // Format properly for getVerifier func
  const public_jwl = {
    ...pub_jwk,
    "ext": true,
    "key_ops": ["verify"],
  }
  const priv_key = {}
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

  const sdJwt = async () => {
    const sdJwt = await createSdJwt(priv_key, public_jwl);
    // const credential = await sdJwt.issueCredential(credentialPayload, disclosureFrame);
    const credential = "eyJhbGciOiAiRVMyNTYiLCAidHlwIjogInZjK3NkLWp3dCIsICJ4NWMiOiBbIk1JSURBRENDQW9hZ0F3SUJBZ0lVR2F6SzNndW5wMkFrVnpvODI0a0JHNGhWKzFnd0NnWUlLb1pJemowRUF3SXdYREVlTUJ3R0ExVUVBd3dWVUVsRUlFbHpjM1ZsY2lCRFFTQXRJRlZVSURBeE1TMHdLd1lEVlFRS0RDUkZWVVJKSUZkaGJHeGxkQ0JTWldabGNtVnVZMlVnU1cxd2JHVnRaVzUwWVhScGIyNHhDekFKQmdOVkJBWVRBbFZVTUI0WERUSTFNREV4TkRFeU5UY3lNMW9YRFRJMk1EUXdPVEV5TlRjeU1sb3dVekVWTUJNR0ExVUVBd3dNVUVsRUlFUlRJQzBnTURBek1TMHdLd1lEVlFRS0RDUkZWVVJKSUZkaGJHeGxkQ0JTWldabGNtVnVZMlVnU1cxd2JHVnRaVzUwWVhScGIyNHhDekFKQmdOVkJBWVRBbFZVTUZrd0V3WUhLb1pJemowQ0FRWUlLb1pJemowREFRY0RRZ0FFQXk1Mlo0ZG9RNk1DZEF1RzFVOWZGRmZLdmxobUdibXRTVlhkRjdCTnl2a3RtUWJjaDU4aFpPZkl0SDhqMjl3Y1UzT0dmM25ORW8xRkc4bzF2T29yYTZPQ0FTMHdnZ0VwTUI4R0ExVWRJd1FZTUJhQUZMTnN1SkVYSE5la0dtWXhoMExoaThCQXpKVWJNQnNHQTFVZEVRUVVNQktDRUdsemMzVmxjaTVsZFdScGR5NWtaWFl3RmdZRFZSMGxBUUgvQkF3d0NnWUlLNEVDQWdBQUFRSXdRd1lEVlIwZkJEd3dPakE0b0RhZ05JWXlhSFIwY0hNNkx5OXdjbVZ3Y205a0xuQnJhUzVsZFdScGR5NWtaWFl2WTNKc0wzQnBaRjlEUVY5VlZGOHdNUzVqY213d0hRWURWUjBPQkJZRUZIN1FJR1FTYkxncURTOFBkcTVVdS9JeVgzK0lNQTRHQTFVZER3RUIvd1FFQXdJSGdEQmRCZ05WSFJJRVZqQlVobEpvZEhSd2N6b3ZMMmRwZEdoMVlpNWpiMjB2WlhVdFpHbG5hWFJoYkMxcFpHVnVkR2wwZVMxM1lXeHNaWFF2WVhKamFHbDBaV04wZFhKbExXRnVaQzF5WldabGNtVnVZMlV0Wm5KaGJXVjNiM0pyTUFvR0NDcUdTTTQ5QkFNQ0EyZ0FNR1VDTUZoNEUrU2JvZ3hGRHphbFF0M3RWV1drY3F4NmhjSW1VUTZVVndMZUJXUFJvS2dweUNueUdwK3lMSERXckd2b09RSXhBTzE1NUFIK1QzTWcxNE9jNlFuYzZIdDZvK1l1SU44NnZvTzZHa3djb25Ic3JjQlNqNVR3SmNxTkI1cXRmN0kxOXc9PSJdfQ.eyJfc2QiOiBbIjFxNnZDaTlWYjJkSkNWWGdxZEoteU1VcjM5c2ZSNnlTQWRsVDJwYl9uZEUiLCAiRk1DZTY1OUhMSFhrcTAyZXFkSWRqUGF6TXEzTExfZlZPcFAxQWVGdl9NNCIsICJLRWxLTUlWS2dmQUxOU3V4ejJxOUpEamJTWi00dUVDMU5CTW1yS3lLYVpnIiwgIk9UR0xia281SGFPX0laSzZaVTgyQVU2OWtRNXd4b1dibHRZdm0zdHNFX28iLCAibE1EeTJWRTdEeFg0VThGVHlLR2NjQnl2YkRmUV9JNGZlaFVUeWpDRGpNSSIsICJtdG92amgyRjByOVRwZXJWY012S0o3YWpBS1dDbXNBYXRpM1lyN2dWRjljIl0sICJpc3MiOiAiaHR0cHM6Ly9pc3N1ZXIuZXVkaXcuZGV2IiwgImlhdCI6IDE3Mzg0NTQ0MDAsICJleHAiOiAxNzQ2MjI2ODAwLCAidmN0IjogInVybjpldS5ldXJvcGEuZWMuZXVkaTpwaWQ6MSIsICJzdGF0dXMiOiB7ImlkZW50aWZpZXJfbGlzdCI6IHsiaWQiOiAiNzQiLCAidXJpIjogImh0dHBzOi8vaXNzdWVyLmV1ZGl3LmRldi9pZGVudGlmaWVyX2xpc3QvRkMvZXUuZXVyb3BhLmVjLmV1ZGkucGlkLjEvZTAwZjNmMzgtMTBmZS00OTUyLTkyYjYtZTcxZDhiZWYyZDRlIn0sICJzdGF0dXNfbGlzdCI6IHsiaWR4IjogNzQsICJ1cmkiOiAiaHR0cHM6Ly9pc3N1ZXIuZXVkaXcuZGV2L3Rva2VuX3N0YXR1c19saXN0L0ZDL2V1LmV1cm9wYS5lYy5ldWRpLnBpZC4xL2UwMGYzZjM4LTEwZmUtNDk1Mi05MmI2LWU3MWQ4YmVmMmQ0ZSJ9fSwgIl9zZF9hbGciOiAic2hhLTI1NiIsICJjbmYiOiB7Imp3ayI6IHsia3R5IjogIkVDIiwgImNydiI6ICJQLTI1NiIsICJ4IjogIndVdVAyT2x3SGVmZUUtWTE2V2o3UEhBelowSkFReWV2cVdNZmQ1LUttS1kiLCAieSI6ICJZVy1iOE8zVWszTlVyazlvWnBBVDFsYVBlQWdpTlF3RGNvdFdpd0JGUTZFIn19fQ.hdMzx8Ac_JNNqAR7BjT-zYocGa-9oq4rkx-lewvBBX40JYoaym9gV2kaQz6ls0scGfj2SKvY_i-P9iOcjvN5ag~WyIwbmN6ZGpDVU9kMVdmdEJ6MmVIM193IiwgImZhbWlseV9uYW1lIiwgInRlc3QiXQ~WyJCTnZ3LWxsMjhSajZXMDgwdTZ5OVNBIiwgImdpdmVuX25hbWUiLCAidGVzdCJd~WyJuUVVHU1cxNXRVZlRIZ284d0NGZldRIiwgImJpcnRoZGF0ZSIsICIyMDAwLTExLTExIl0~WyJzY2JBNmN6bW8zVGlOVXdDU2VQa19BIiwgImlzc3VpbmdfYXV0aG9yaXR5IiwgIlRlc3QgUElEIGlzc3VlciJd~WyJkRFoyZ3RPYVMwMjBORjlZUnQ0UVlBIiwgImlzc3VpbmdfY291bnRyeSIsICJGQyJd~WyJ3blZBYjVON2RZalpKb25GSmlWb19RIiwgIjE4IiwgdHJ1ZV0~WyJTWk8tV1RYdDRYcnVIUDRwWUQ3LWdRIiwgImFnZV9lcXVhbF9vcl9vdmVyIiwgeyJfc2QiOiBbIkVRckRtbW5LT215MXVSUm1hMDFlRmlheU9TbU5weE9aS1FVRFJQbEF6NTgiXX1d~"
    // console.log('Issued Credential:', credential);
    // const claims = await sdJwt.getClaims(credential);
    // console.log("Claims: ", claims);
    // const valid = await sdJwt.validateCredential(credential);
    // console.log('Validation Result:', valid);

    // const presentationFrame = { firstname: true, id: true };
    // const presentation = await sdJwt.presentCredential(credential, presentationFrame);
    // const presClaims = await sdJwt.getClaims(presentation);
    // console.log("Claims: ", presClaims);
    // console.log('Presentation:', presentation);

    // const requiredClaims = ['firstname', 'id'];
    // const verified = await sdJwt.verifyPresentation(presentation, requiredClaims);
    // console.log('Verified:', verified);
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