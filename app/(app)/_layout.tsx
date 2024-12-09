import { Text } from 'react-native';
import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { isLoaded } from 'expo-font';

export default function AppLayout() {
  // const { session, isLoading } = useAuth2();
  const [isLoading, setIsLoading] = useState(false)

  // You can keep the splash screen open, or render a loading screen like we do here.
  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  // Only require authentication within the (app) group's layout as users
  // need to be able to access the (auth) group and sign in again.
  // if (!session) {
  //   // On web, static rendering will stop here as the user is not authenticated
  //   // in the headless Node process that the pages are rendered in.
  //   return <Redirect href="/sign-in" />;
  // }

  // This layout can be deferred because it's not the root layout.
  return <Stack />;
}