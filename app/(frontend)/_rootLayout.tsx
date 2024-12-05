// app/(frontend)/_rootLayout.tsx

import { Stack } from "expo-router";
import { AuthProvider } from "@/context/AuthContext";

const StackLayout = () => {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen 
                name="index"
                options={{ 
                    title: "Trinity Wallet"
                }}
            />
            <Stack.Screen
                name="error"
                options={{
                    title: "Error!"
                }}
            />
            <Stack.Screen 
                name="registration/openId"
                options={{ 
                    gestureEnabled: false
                }}
            />
            <Stack.Screen 
                name="auth/login"
                options={{ 
                    gestureEnabled: false
                }}
            />
            <Stack.Screen 
                name="registration/pin-setup"
                options={{ 
                    gestureEnabled: false
                }}
            />
            <Stack.Screen 
                name="registration/biometric-setup"
                options={{ 
                    gestureEnabled: false
                }}
            />
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <StackLayout />
        </AuthProvider>
    )
}