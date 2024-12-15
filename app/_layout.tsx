import { Stack } from 'expo-router';
import { AuthProvider } from '@/context/AuthContext';

function StackLayout() {
  return (
    <Stack>
      <Stack.Screen name='index' options={{ headerShown: false }} />
      <Stack.Screen name='(registration)/openId' options={{ headerShown: false }} />
      <Stack.Screen name='(registration)/pin-setup' options={{ headerShown: false }} />
      <Stack.Screen name='(registration)/biometric-setup' options={{ headerShown: false }} />
      <Stack.Screen name='login' options={{ headerShown: false }} />
      <Stack.Screen name='(app)' options={{ headerShown: false }} />
    </Stack>
  );
}

export default function Root() {
  // Set up the auth context and render our layout inside of it.
  return (
    <AuthProvider>
      <StackLayout />
    </AuthProvider>
  );
}