import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Error = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Error loading the app routing. Please restart the application.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 18,
    color: 'red',
  },
});

export default Error;