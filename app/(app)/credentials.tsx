import { View, ScrollView, StyleSheet, Alert, Text, TouchableOpacity } from 'react-native';
import { CredentialStorage, StoredCredential } from '../../services/credentialStorageTemp';
import * as Animatable from 'react-native-animatable';
import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from './_layout';
import { Ionicons } from '@expo/vector-icons';
import CredentialCard from '../../components/CredentialCard';

export default function Credentials() {
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
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Animatable.View 
        animation="fadeIn" 
        duration={1000} 
        style={styles.contentContainer}
      >
        <LinearGradient
          colors={['rgba(10, 132, 255, 0.1)', 'transparent']}
          style={styles.gradientHeader}
        >
          <Text style={styles.welcomeText}>Digital Credentials</Text>
          <Text style={styles.subtitleText}>
            Your secure identity wallet
          </Text>
        </LinearGradient>

        {credentials ? (
          <Animatable.View 
            animation="fadeInUp" 
            duration={800} 
            style={styles.credentialsContainer}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="wallet-outline" size={24} color={theme.primary} />
                <Text style={styles.sectionTitle}>Your Credentials</Text>
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
            />
            
            <CredentialCard
              type="mdoc"
              isAvailable={!!credentials.mdoc}
              timestamp={String(credentials.timestamp)}
              onPress={() => viewCredentialDetails('mdoc')}
            />

            <View style={styles.infoContainer}>
              <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
              <Text style={styles.infoText}>
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
            <Text style={styles.emptyStateText}>
              No credentials issued yet
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Head to the Dashboard to request new credentials
            </Text>
          </Animatable.View>
        )}
      </Animatable.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.dark,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 40,
  },
  gradientHeader: {
    width: '100%',
    paddingVertical: 20,
    alignItems: 'center',
    borderRadius: 15,
    marginBottom: 30,
  },
  welcomeText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 28,
    color: theme.text,
    textAlign: 'center',
  },
  subtitleText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: theme.textSecondary,
    marginTop: 8,
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
    color: theme.text,
    marginLeft: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.darker,
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 24,
  },
  infoText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: theme.textSecondary,
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
    color: theme.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.8,
  }
});