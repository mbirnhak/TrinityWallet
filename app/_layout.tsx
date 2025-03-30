import { Stack } from 'expo-router';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import * as Font from 'expo-font';
import { ActivityIndicator, AppState, AppStateStatus, View, StyleSheet } from 'react-native';
import { useEffect, Suspense, useState, type PropsWithChildren, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import * as SQLite from 'expo-sqlite';
import { getDbEncryptionKey } from '@/services/Utils/crypto';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import migrations from '@/drizzle/migrations'
import { constants } from '@/services/Utils/enums';

// Theme colors for the entire app - maintaining for backward compatibility
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
      <Stack.Screen name="issuance-callback" />
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

function DatabaseSecurityProvider({ children }: PropsWithChildren) {
  const { authState } = useAuth();
  const db = SQLite.useSQLiteContext();

  useEffect(() => {
    console.log("Executing useEffect to encrypt/decrypt db...");

    const handleAuthChange = async () => {
      try {
        // Open database (in case it is closed) and assign it to the db const
        const isLoggedInAndRegistered = authState.isAuthenticated && authState.oidcRegistered;

        // If user is logged in and registered, then decrypt the database (or set encryption key if first time using)
        if (isLoggedInAndRegistered) {
          console.log("User is authenticated, opening database...");
          const dbEncryptionKey = await getDbEncryptionKey();
          await db.execAsync(`PRAGMA key = "x'${dbEncryptionKey}'"`);
          console.log("Database unlocked");
        }

        // If user is not logged in, the connection is automatically closed by SQLite Provider
        else {
          console.log("Database locked");
        }
      } catch (error) {
        console.log(error);
      }
    }
    handleAuthChange();
  }, [authState]);

  return children;
}

// Carries out the migrations necessary for drizzle setup
function MigrationProvider({ children }: PropsWithChildren) {
  const db = SQLite.useSQLiteContext();
  try {
    // If database has been setup, this will fail (because it will be enc).
    db.execSync("SELECT * FROM sqlite_master;");
    // If it did not fail, then the database was just created. Therefore, we must create the tables.
    const drizzleDb = drizzle(db);
    const { success, error } = useMigrations(drizzleDb, migrations);
    console.log("Migration Success: ", success);
    console.log("Migration Error: ", error);
  } catch (error) {
    console.log(error);
  }

  return children;;
}

async function initDb(db: SQLite.SQLiteDatabase) {
  try {
    // If key is set already then this will fail
    await db.execAsync("SELECT * FROM sqlite_master;");
    // If it did not fail, then the database was just created. Therefore, we must set the key.
    const dbEncryptionKey = await getDbEncryptionKey();
    db.execSync(`PRAGMA key = "x'${dbEncryptionKey}'"`);
    console.log("Database key has now been set");
  } catch (error) {
    console.log("Database already has key set");
  }
}

export default function Root() {

  return (
    <ThemeProvider>
      <AuthProvider>
        <Suspense fallback={<ActivityIndicator size="large" />}>
          <SQLite.SQLiteProvider
            databaseName={constants.DBNAME}
            options={{ enableChangeListener: true }}
            onInit={initDb}
            useSuspense
          >
            <MigrationProvider>
              <DatabaseSecurityProvider>
                <AppStateListener />
                <RootLayoutNav />
              </DatabaseSecurityProvider>
            </MigrationProvider>
          </SQLite.SQLiteProvider>
        </Suspense>
      </AuthProvider>
    </ThemeProvider>
  );
}