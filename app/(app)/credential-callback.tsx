// (app)/credential-callback.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CredentialIssuanceService from '@/services/CredentialIssuance';

export default function CredentialCallbackScreen() {
  const router = useRouter();
  const { issuerUrl, preAuthorizedCode, userPin } = useLocalSearchParams<{
    issuerUrl?: string;
    preAuthorizedCode?: string;
    userPin?: string;
  }>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initFlow = async () => {
      try {
        if (!issuerUrl) {
          throw new Error('Missing issuerUrl from query params.');
        }
        if (!preAuthorizedCode) {
          throw new Error('Missing preAuthorizedCode from query params.');
        }
        
        // 1. Optionally fetch metadata
        await CredentialIssuanceService.fetchMetadata();

        // 2. Exchange preAuthorizedCode for an access token
        const accessToken = await CredentialIssuanceService.requestTokenPreAuthorized(
          preAuthorizedCode.toString(), 
          userPin?.toString()
        );

        // 3. Request your credentials. For example, a single credential
        //    in 'vc+sd-jwt' format or 'mso_mdoc'...
        const proofJwt = await CredentialIssuanceService.createProofJwt('https://issuer.eudiw.dev');

        const credentialPayload = {
          format: 'vc+sd-jwt',
          doctype: 'eu.europa.ec.eudi.mdl_jwt_vc_json',
          proof: {
            proof_type: 'jwt',
            jwt: proofJwt,
          },
        };

        const credentialResponse = await CredentialIssuanceService.requestCredential(credentialPayload);
        // credentialResponse might contain { credential, c_nonce, notification_id, ... }

        // 4. Save the credential
        if (credentialResponse.credential) {
          await CredentialIssuanceService.saveCredential({
            id: 'issued_vc_sdjwt',
            type: 'vc+sd-jwt',
            issuer: issuerUrl.toString(),
            raw: credentialResponse.credential,
          });
        }

        Alert.alert('Success', 'Credential issuance completed via callback!');
        router.replace('/home');
      } catch (err: any) {
        console.error('Issuer-Initiated Flow Error:', err);
        setError(err.message || 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    initFlow();
  }, [issuerUrl, preAuthorizedCode, userPin]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Processing Credential...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <Text>Credential Issuance Complete!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  errorText: {
    color: 'red',
    marginVertical: 8,
    textAlign: 'center'
  }
});
