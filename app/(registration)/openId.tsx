import { router } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { Buffer } from 'buffer';

// Polyfill for Buffer (to handle error its encountering)
global.Buffer = Buffer;

export default function OpenId() {
    const { authState, oidcRegister, unRegister, hasEmailHash } = useAuth();
    console.log(authState);

    const handleRegistration = async () => {
        if (authState.oidcRegistered) {
            if (authState.pinRegistered) {
                router.replace('/biometric-setup');
            } else {
                router.replace('/pin-setup');
            }
        } else {
            const hasEmail = await hasEmailHash();
            if (hasEmail === null) { return; } // error retrieving email hash
            const firstTimeUser = !hasEmail;
            const success = await oidcRegister(firstTimeUser);
            if (success) {
                if (authState.pinRegistered) {
                    router.replace('/biometric-setup');
                } else {
                    router.replace('/pin-setup')
                }
            } else {
                Alert.alert('Error with registration');
                console.log(success)
            }
        }
    }

    const handleDeRegistration = async () => {
        unRegister();
    }

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text
                onPress={() => handleRegistration()}>
                Register
            </Text>
            <Text
                onPress={() => handleDeRegistration()}>
                UnRegister (Testing)
            </Text>
        </View>
    );
}