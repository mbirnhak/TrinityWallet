// app/_rootLayout.tsx

import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/context/AuthContext";

export default function protectedLayout() {
    const { authState, isLoading } = useAuth();

    if (isLoading) {
        return (
            < div style={{ flex: 1, justifyContent: "center", alignItems: "center" }}> 
                <p>Loading...</p>
            </div >
        );
    }

    if (authState.isAuthenticated !== true || authState.isRegistered !== true) {
        return <Redirect href="/auth/login" />;
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen 
                name="home"
                options={{ 
                    title: "Trinity Wallet"
                }}
            />
        </Stack>
    );
}