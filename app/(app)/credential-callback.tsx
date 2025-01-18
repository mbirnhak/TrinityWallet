// (app)/credential-callback.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CredentialIssuanceService from '@/services/CredentialIssuance';

export default function CredentialCallbackScreen() {
  const router = useRouter();
  const { issuerUrl, preAuthorizedCode } = useLocalSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initFlow = async () => {
      try {
        if (!issuerUrl) {
          throw new Error('Missing issuerUrl from query params.');
        }
        
        // 1. (Optional) fetch metadata if needed
        await CredentialIssuanceService.fetchMetadata();
        
        // 2. (Optional) exchange preAuthorizedCode for an access token 
        //    if your issuer supports "pre-authorized_code" flows 
        //    (In reality, you'd call requestToken with the correct payload)
        //    For example:
        /*
        const tokenResponse = await CredentialIssuanceService.requestToken({
          grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
          pre_authorized_code: preAuthorizedCode,
          // user_pin if needed, etc.
        });
        */

        // 3. (Optional) request credential(s)
        /*
        const credentialPayload = {
          format: 'vc+sd-jwt',
          doctype: 'eu.europa.ec.eudi.mdl_jwt_vc_json',
          proof: { proof_type: 'dpop' },
        };
        const credential = await CredentialIssuanceService.requestCredential(credentialPayload);
        await CredentialIssuanceService.saveCredential(credential);
        */

        // For demonstration, we do an alert and navigate away
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
  }, [issuerUrl, preAuthorizedCode]);

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
