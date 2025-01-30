import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import * as Animatable from 'react-native-animatable';
import { createSdJwt } from '@/services/Credentials/SdJwtVc';
import type { DisclosureFrame } from '@sd-jwt/types';

export default function Home() {
  const { signOut } = useAuth();
  const claims = {
    firstname: 'John',
    lastname: 'Doe',
    ssn: '123-45-6789',
    id: '1234',
  };
  const credentialPayload = {
    iss: 'Issuer',
    iat: new Date().getTime(),
    vct: 'ExampleCredentials',
    ...claims,
  };
  const disclosureFrame: DisclosureFrame<typeof claims> = {
    _sd: ['firstname', 'lastname', 'ssn'],
  };

  const sdJwt = async () => {
    const sdJwt = await createSdJwt();
    const credential = await sdJwt.issueCredential(credentialPayload, disclosureFrame);
    console.log('Issued Credential:', credential);
    const claims = await sdJwt.getClaims(credential);
    console.log("Claims: ", claims);
    // const valid = await sdJwt.validateCredential(credential);
    // console.log('Validation Result:', valid);

    const presentationFrame = { firstname: true, id: true };
    const presentation = await sdJwt.presentCredential(credential, presentationFrame);
    const presClaims = await sdJwt.getClaims(presentation);
    console.log("Claims: ", presClaims);
    // console.log('Presentation:', presentation);

    // const requiredClaims = ['firstname', 'id'];
    // const verified = await sdJwt.verifyPresentation(presentation, requiredClaims);
    // console.log('Verified:', verified);
  }

  return (
    <View style={styles.container}>
      <Animatable.View
        animation="fadeIn"
        duration={1500}
        style={styles.contentContainer}
      >
        <Text style={styles.welcomeText}>eIDAS Wallet</Text>
        <TouchableOpacity
          onPress={sdJwt}
          style={styles.signOutButton}
        >
          <Text style={styles.buttonText}>
            Run SdJwt
          </Text>
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
  signOutButton: {
    width: '80%',
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0078D4',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    fontSize: 18,
  }
});