import { Text, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';

export default function Home() {
  const { oidcRegister } = useAuth();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text
        onPress={() => {
          // signOut();
          router.replace('/openId');
        }}>
        Sign Out
      </Text>
    </View>
  );
}