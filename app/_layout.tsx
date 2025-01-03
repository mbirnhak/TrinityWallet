import { Stack } from 'expo-router';
import { AuthProvider } from '@/context/AuthContext';
import { useEffect } from 'react';
import * as Font from 'expo-font';
import { View } from 'react-native';

function StackLayout() {
  useEffect(() => {
    Font.loadAsync({
      'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
      'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
      'Poppins-Medium': require('../assets/fonts/Poppins-Medium.ttf'),
    });
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#ffffff' }
      }}
    >
      <Stack.Screen name='index' />
      <Stack.Screen 
        name='(registration)/openId'
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name='(registration)/pin-setup'
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name='(registration)/biometric-setup'
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name='login'
        options={{
          animation: 'fade',
        }}
      />
      <Stack.Screen name='(app)' />
    </Stack>
  );
}

export default function Root() {
  return (
    <AuthProvider>
      <StackLayout />
    </AuthProvider>
  );
}