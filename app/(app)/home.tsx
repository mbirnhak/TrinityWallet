import { Text, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';

export default function Home() {
  const { signOut } = useAuth();
  const logOut = async () => {
    await signOut();
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text
        onPress={logOut}>
        Sign Out
      </Text>
    </View>
  );
}