// (app)/error.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function ErrorScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Error</Text>
      <Text style={styles.message}>
        Something went wrong while processing your request.
      </Text>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => {
          // If your credential issuance is at '/credentialIssuance'
          // and you want to fully replace:
          router.replace('/(app)/credentialIsuuance');
          // Or if you route to '/(app)/credentialIssuance', then:
          // router.replace('/(app)/credentialIssuance');
        }}
      >
        <Text style={styles.buttonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#0078D4',
    marginBottom: 20,
  },
  message: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#0078D4',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  buttonText: {
    fontFamily: 'Poppins-Regular',
    color: '#FFFFFF',
    fontSize: 16,
  },
});
