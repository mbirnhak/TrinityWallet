import { router } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { Buffer } from 'buffer';
import { useEffect, useState } from 'react';

// Polyfill for Buffer (to handle error its encountering)
global.Buffer = Buffer;

export default function OpenId() {
    const { isFirstTimeUser, register, unRegister } = useAuth();
    const [firstTimeUser, setFirstTimeUser] = useState<boolean | null>(false);

    useEffect(() => {
        const checkFirstTimeUser = async () => {
            setFirstTimeUser(await isFirstTimeUser());
            if (firstTimeUser === null) { return; }
            setFirstTimeUser(firstTimeUser);
        };

        checkFirstTimeUser();
    }, []);

    const handleRegistration = async () => {
        if (firstTimeUser === null) return;
        const success = await register(firstTimeUser);
        if (success) {
            if (firstTimeUser) {
                router.replace('/pin-setup');
            } else {
                router.replace('/login')
            }
        } else {
            Alert.alert('Error with registration');
            console.log(success)
        }
    }

    const handleDeRegistration = async () => {
        await unRegister();
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