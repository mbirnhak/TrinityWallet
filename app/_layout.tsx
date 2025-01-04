import { Stack } from 'expo-router';
import { AuthProvider } from '@/context/AuthContext';
import * as Font from 'expo-font';
import { AppState, AppStateStatus, View } from 'react-native';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

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

function AppStateListener() {
  const { signOut } = useAuth();

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Logout when app goes to background or inactive
        await signOut();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove(); // Clean up the listener
    };
  }, [signOut]);

  return null;
}

export default function Root() {
  return (
    <AuthProvider>
      <AppStateListener />
      <StackLayout />
    </AuthProvider>
  );
}