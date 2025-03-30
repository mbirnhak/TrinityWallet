import { View, ScrollView, StyleSheet, Alert, Text, TouchableOpacity, SafeAreaView, StatusBar, Platform } from 'react-native';
import { CredentialStorage, StoredCredential } from '../../services/credentialStorageTemp';
import * as Animatable from 'react-native-animatable';
import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import CredentialCard from '../../components/CredentialCard';
import { useTheme } from '@/context/ThemeContext';
import CommonHeader from '../../components/Header';

export default function Credentials() {
  const { theme, isDarkMode } = useTheme();
  const [credentials, setCredentials] = useState<StoredCredential | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredentials = async () => {
    try {
      const metadata = await CredentialStorage.getMetadata();
      setCredentials(metadata);
    } catch (error) {
      console.error('Error fetching credentials:', error);
      Alert.alert(
        'Error',
        'Failed to fetch credentials. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

  const viewCredentialDetails = async (format: 'jwt_vc' | 'mdoc') => {
    try {
      const credential = await CredentialStorage.retrieveCredential(format);
      if (credential) {
        Alert.alert(
          `${format.toUpperCase()} Credential`,
          credential.substring(0, 200) + '...',
          [{ text: 'Close' }]
        );
      } else {
        Alert.alert(
          'No Credential',
          `No ${format.toUpperCase()} credential found.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error viewing credential:', error);
      Alert.alert(
        'Error',
        'Failed to view credential details. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchCredentials();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.dark }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.dark} />
      <ScrollView 
        style={[styles.container, { backgroundColor: theme.dark }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <CommonHeader title="Digital Credentials" />
        
        <Animatable.View 
          animation="fadeIn" 
          duration={1000} 
          style={styles.contentContainer}
        >
          <View style={styles.mainContent}>
            {credentials ? (
              <Animatable.View 
                animation="fadeInUp" 
                duration={800} 
                style={styles.credentialsContainer}
              >
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleContainer}>
                    <Ionicons name="wallet-outline" size={24} color={theme.primary} />
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Credentials</Text>
                  </View>
                  <TouchableOpacity onPress={handleRefresh}>
                    <Ionicons name="refresh-outline" size={20} color={theme.primary} />
                  </TouchableOpacity>
                </View>

                <CredentialCard
                  type="jwt_vc"
                  isAvailable={!!credentials.jwt_vc}
                  timestamp={String(credentials.timestamp)}
                  onPress={() => viewCredentialDetails('jwt_vc')}
                  theme={theme}
                />
                
                <CredentialCard
                  type="mdoc"
                  isAvailable={!!credentials.mdoc}
                  timestamp={String(credentials.timestamp)}
                  onPress={() => viewCredentialDetails('mdoc')}
                  theme={theme}
                />

                <View style={[styles.infoContainer, { backgroundColor: theme.darker }]}>
                  <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
                  <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                    Tap on a credential to expand and view details
                  </Text>
                </View>
              </Animatable.View>
            ) : !loading && (
              <Animatable.View 
                animation="fadeIn" 
                duration={800} 
                style={styles.emptyStateContainer}
              >
                <Ionicons name="wallet-outline" size={48} color={theme.textSecondary} />
                <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                  No credentials issued yet
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: theme.textSecondary }]}>
                  Head to the Dashboard to request new credentials
                </Text>
              </Animatable.View>
            )}
          </View>
        </Animatable.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  mainContent: {
    paddingHorizontal: 4,
  },
  credentialsContainer: {
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    marginLeft: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 24,
  },
  infoText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginLeft: 8,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.8,
  }
});