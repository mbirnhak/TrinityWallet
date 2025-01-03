import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import * as Animatable from 'react-native-animatable';

export default function Home() {
  const { signOut } = useAuth();
  
  return (
    <View style={styles.container}>
      <Animatable.View 
        animation="fadeIn" 
        duration={1500} 
        style={styles.contentContainer}
      >
        <Text style={styles.welcomeText}>eIDAS Wallet</Text>
        <TouchableOpacity
          onPress={signOut}
          style={styles.signOutButton}
        >
          <Text style={styles.buttonText}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </Animatable.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 32,
    color: '#0078D4',
    marginBottom: 40,
  },
  signOutButton: {
    width: '80%',
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0078D4',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    fontSize: 18,
  }
});