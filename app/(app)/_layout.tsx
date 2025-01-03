import { Redirect, Stack, useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import * as Font from 'expo-font';
import * as Animatable from 'react-native-animatable';
import { useEffect } from "react";

export default function ProtectedLayout() {
  const { authState, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    Font.loadAsync({
      'Poppins-Regular': require('../../assets/fonts/Poppins-Regular.ttf'),
      'Poppins-Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
    });
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LottieView
          source={require('../../assets/fonts/loading.json')}
          autoPlay
          loop
          style={styles.lottieAnimation}
        />
      </View>
    );
  }

  if (!authState.isAuthenticated || !authState.oidcRegistered) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack 
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#0078D4',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontFamily: 'Poppins-Bold',
          fontWeight: '600',
        },
        animation: 'fade',
      }}
    >
      <Stack.Screen
        name="home"
        options={{
          title: "eIDAS Wallet"
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  lottieAnimation: {
    width: 200,
    height: 200,
  }
});