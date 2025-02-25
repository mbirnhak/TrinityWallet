import { Redirect, Tabs, useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import * as Font from 'expo-font';
import { useEffect } from "react";
import { useCredentialDeepLinkHandler } from '../../services/credentialIssuance';
import { Ionicons } from '@expo/vector-icons';

// Define theme colors for reuse
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
  error: '#FF453A',
  success: '#32D74B',
};

export default function ProtectedLayout() {
  const { authState, isLoading } = useAuth();
  const router = useRouter();
  useCredentialDeepLinkHandler();

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
    <Tabs
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: theme.dark,
          borderBottomWidth: 0.5,
          borderBottomColor: theme.border,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontFamily: 'Poppins-Bold',
          fontSize: 17,
          color: theme.text,
        },
        tabBarStyle: {
          backgroundColor: theme.dark,
          borderTopWidth: 0.5,
          borderTopColor: theme.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: {
          fontFamily: 'Poppins-Medium',
          fontSize: 12,
        }
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Trinity Wallet",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transactions",
          tabBarLabel: "Transactions",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="swap-horizontal" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.dark,
  },
  lottieAnimation: {
    width: 200,
    height: 200,
  }
});