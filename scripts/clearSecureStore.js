import * as SecureStore from 'expo-secure-store';

export async function clearSecureStore() {
    const keys = ['authState', 'walletPIN', 'hashedEmail', 'idToken', 'oidcRegistered', 'pinRegistered', 'biometricsRegistered']; // Replace with your actual keys
    try {
        for (const key of keys) {
            await SecureStore.deleteItemAsync(key);
            console.log(`Deleted key: ${key}`);
        }
        console.log('All specified keys have been cleared.');
    } catch (error) {
        console.error('Error clearing SecureStore:', error);
    }
}