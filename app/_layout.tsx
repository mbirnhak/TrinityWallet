import { Stack } from 'expo-router';
import { AuthProvider } from '@/context/AuthContext';
import * as Font from 'expo-font';
import { AppState, AppStateStatus } from 'react-native';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

// Theme colors for the entire app
export const theme = {
    dark: '#000000',
    darker: '#1C1C1E',
    background: '#121214',
    surface: '#18181B',
    primary: '#0A84FF',
    primaryDark: '#0066CC',
    accent: '#5E5CE6',
    text: '#FFFFFF',
    textSecondary: '#98989F',
    border: '#2C2C2E',
};

function RootLayoutNav() {
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
        contentStyle: { backgroundColor: theme.dark }
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="callback" />
      <Stack.Screen
        name="(registration)/openId"
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="(registration)/pin-setup"
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="(registration)/biometric-setup"
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="login"
        options={{
          animation: 'fade',
        }}
      />
      <Stack.Screen 
        name="(app)" 
        options={{
          animation: 'fade',
        }}
      />
    </Stack>
  );
}

function AppStateListener() {
  const { signOut } = useAuth();

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        // Logout when app goes to background or inactive
        await signOut();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [signOut]);

  return null;
}

export default function Root() {
  return (
    <AuthProvider>
      <AppStateListener />
      <RootLayoutNav />
    </AuthProvider>
  );
}