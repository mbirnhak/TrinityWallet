import { Redirect, Tabs, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { View, StyleSheet, Platform } from 'react-native';
import LottieView from 'lottie-react-native';
import * as Font from 'expo-font';
import { useEffect } from "react";
import { Ionicons } from '@expo/vector-icons';

// Define theme colors for reuse (keeping for backward compatibility)
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
  const { theme: currentTheme } = useTheme();
  const params = useLocalSearchParams();
  
  // Check if we should hide the tab bar
  const hideTabBar = params.hideTabBar === 'true';

  useEffect(() => {
    Font.loadAsync({
      'Poppins-Regular': require('../../assets/fonts/Poppins-Regular.ttf'),
      'Poppins-Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
      'Poppins-Medium': require('../../assets/fonts/Poppins-Medium.ttf'),
    });
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: currentTheme.dark }]}>
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
          backgroundColor: currentTheme.dark,
          borderBottomWidth: 0.5,
          borderBottomColor: currentTheme.border,
        },
        headerTintColor: currentTheme.text,
        headerTitleStyle: {
          fontFamily: 'Poppins-Bold',
          fontSize: 17,
          color: currentTheme.text,
        },
        tabBarStyle: {
          backgroundColor: currentTheme.dark,
          borderTopWidth: 0.5,
          borderTopColor: currentTheme.border,
          height: Platform.OS === 'ios' ? 84 : 68, // Increased height for better spacing
          paddingBottom: Platform.OS === 'ios' ? 28 : 12, // Account for iPhone home indicator
          paddingTop: 8,
          // Hide the tab bar when hideTabBar is true
          display: hideTabBar ? 'none' : 'flex',
        },
        tabBarActiveTintColor: currentTheme.primary,
        tabBarInactiveTintColor: currentTheme.textSecondary,
        tabBarLabelStyle: {
          fontFamily: 'Poppins-Medium',
          fontSize: 11, // Slightly smaller font size
          marginTop: -4, // Adjust label position
          paddingBottom: 4, // Add padding at the bottom
        },
        tabBarIconStyle: {
          marginTop: 4, // Adjust icon position
        },
        tabBarItemStyle: {
          paddingVertical: 4, // Add vertical padding to items
        }
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Dashboard",
          tabBarLabel: "Home",  // Changed to shorter "Home" label
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size-2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="request-credentials"
        options={{
          title: "Request",
          tabBarLabel: "Request",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="key" size={size-2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="credentials"
        options={{
          title: "Credentials",
          tabBarLabel: "Wallet",  // Changed to shorter "Wallet" label
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet" size={size-2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="present-credentials"
        options={{
          title: "Present",
          tabBarLabel: "Present",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="id-card" size={size-2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size-2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          href: null, // Don't show in the tab bar
        }}
      />
      <Tabs.Screen
        name="e-sign"
        options={{
          href: null, // Don't show in the tab bar
        }}
      />
      <Tabs.Screen
        name="library-rental"
        options={{
          href: null, // Don't show in the tab bar
        }}
      />
      <Tabs.Screen
        name="pin-auth"
        options={{
          href: null,              // still hide the icon
          tabBarStyle: {           // hide the entire tab bar container
          display: 'none',
          },
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
  },
  lottieAnimation: {
    width: 200,
    height: 200,
  }
});