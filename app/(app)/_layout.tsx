import { Redirect, Stack, useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { View, Text } from 'react-native';

export default function ProtectedLayout() {
  const { authState, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Loading...</Text>
        </View>

    );
  }

  // useEffect(() => {
  //   if (!isLoading && (!authState.isAuthenticated || !authState.oidcRegistered)) {
  //     router.replace('/login');
  //   }
  // }, [authState, isLoading]);

  if (!authState.isAuthenticated || !authState.oidcRegistered) {
    console.log('Redirecting...')
    return <Redirect href="/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="home"
        options={{
          title: "Home"
        }}
      />
    </Stack>
  );
}