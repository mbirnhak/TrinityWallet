import { View, ScrollView, StyleSheet, Alert, Text, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { CredentialStorage } from '@/services/credentialStorage';
import * as Animatable from 'react-native-animatable';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import CredentialCard from '../../components/CredentialCard';
import { useTheme } from '@/context/ThemeContext';
import CommonHeader from '../../components/Header';
import { getDbEncryptionKey } from '@/services/Utils/crypto';

// Map of credential types
const CREDENTIAL_TYPES = {
  'eu.europa.ec.eudi.pid_jwt_vc_json': 'pid',
  'eu.europa.ec.eudi.msisdn_sd_jwt_vc': 'msisdn',
  'eu.europa.ec.eudi.ehic_sd_jwt_vc': 'ehic',
  'eu.europa.ec.eudi.pseudonym_over18_sd_jwt_vc': 'age_verification',
  'eu.europa.ec.eudi.iban_sd_jwt_vc': 'iban',
  'eu.europa.ec.eudi.hiid_sd_jwt_vc': 'health_id',
  'eu.europa.ec.eudi.tax_sd_jwt_vc': 'tax'
};

export default function Credentials() {
  const { theme, isDarkMode } = useTheme();
  const [storedCredentials, setStoredCredentials] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      
      // Initialize credential storage
      const dbEncryptionKey = await getDbEncryptionKey();
      const storage = new CredentialStorage(dbEncryptionKey);
      
      try {
        // Fetch all credentials from database
        const credentialsFromDb = await storage.retrieveCredentials();
        console.log("Retrieved credentials:", credentialsFromDb ? credentialsFromDb.length : 0);
        
        // Process the credentials into a format for our cards
        const credentials = {};
        
        if (credentialsFromDb && credentialsFromDb.length > 0) {
          // Group credentials by type
          credentialsFromDb.forEach(cred => {
            // Try to determine credential type from the VCT or other fields
            const claims = cred.credential_claims || {};
            const vct = claims.vct || '';
            
            // Find the proper credential type
            let credType = null;
            for (const [typeId, shortType] of Object.entries(CREDENTIAL_TYPES)) {
              if (typeId === vct || (claims.vc && claims.vc._type && claims.vc._type.includes(typeId))) {
                credType = shortType;
                break;
              }
            }
            
            if (credType) {
              credentials[credType] = {
                isAvailable: true,
                timestamp: cred.iss_date ? new Date(cred.iss_date * 1000).toISOString() : new Date().toISOString(),
                data: cred.credential_string,
                claims: cred.credential_claims
              };
            }
          });
        }
        
        setStoredCredentials(credentials);
      } finally {
        storage.close();
      }
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

  const viewCredentialDetails = (type) => {
    try {
      if (storedCredentials[type] && storedCredentials[type].isAvailable) {
        const credential = storedCredentials[type];
        // Format the credential claims for display
        const formattedClaims = JSON.stringify(credential.claims, null, 2);
        
        Alert.alert(
          `${type.toUpperCase().replace('_', ' ')} Credential`,
          `Issued: ${new Date(credential.timestamp).toLocaleDateString()}\n\nFirst 200 chars:\n${credential.data.substring(0, 200)}...`,
          [
            { 
              text: 'View Claims', 
              onPress: () => Alert.alert('Credential Claims', formattedClaims.substring(0, 1500) + '...', [{ text: 'Close' }]) 
            },
            { text: 'Close' }
          ]
        );
      } else {
        Alert.alert(
          'No Credential',
          `No ${type.toUpperCase()} credential found.`,
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
            {Object.keys(storedCredentials).length > 0 ? (
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

                {/* Personal ID (PID) */}
                {storedCredentials.pid && (
                  <CredentialCard
                    type="pid"
                    isAvailable={storedCredentials.pid.isAvailable}
                    timestamp={storedCredentials.pid.timestamp}
                    onPress={() => viewCredentialDetails('pid')}
                    theme={theme}
                  />
                )}
                
                {/* Mobile Number */}
                {storedCredentials.msisdn && (
                  <CredentialCard
                    type="msisdn"
                    isAvailable={storedCredentials.msisdn.isAvailable}
                    timestamp={storedCredentials.msisdn.timestamp}
                    onPress={() => viewCredentialDetails('msisdn')}
                    theme={theme}
                  />
                )}
                
                {/* Health Insurance Card */}
                {storedCredentials.ehic && (
                  <CredentialCard
                    type="ehic"
                    isAvailable={storedCredentials.ehic.isAvailable}
                    timestamp={storedCredentials.ehic.timestamp}
                    onPress={() => viewCredentialDetails('ehic')}
                    theme={theme}
                  />
                )}
                
                {/* Age Verification */}
                {storedCredentials.age_verification && (
                  <CredentialCard
                    type="age_verification"
                    isAvailable={storedCredentials.age_verification.isAvailable}
                    timestamp={storedCredentials.age_verification.timestamp}
                    onPress={() => viewCredentialDetails('age_verification')}
                    theme={theme}
                  />
                )}
                
                {/* Bank Account */}
                {storedCredentials.iban && (
                  <CredentialCard
                    type="iban"
                    isAvailable={storedCredentials.iban.isAvailable}
                    timestamp={storedCredentials.iban.timestamp}
                    onPress={() => viewCredentialDetails('iban')}
                    theme={theme}
                  />
                )}
                
                {/* Health ID */}
                {storedCredentials.health_id && (
                  <CredentialCard
                    type="health_id"
                    isAvailable={storedCredentials.health_id.isAvailable}
                    timestamp={storedCredentials.health_id.timestamp}
                    onPress={() => viewCredentialDetails('health_id')}
                    theme={theme}
                  />
                )}
                
                {/* Tax ID */}
                {storedCredentials.tax && (
                  <CredentialCard
                    type="tax"
                    isAvailable={storedCredentials.tax.isAvailable}
                    timestamp={storedCredentials.tax.timestamp}
                    onPress={() => viewCredentialDetails('tax')}
                    theme={theme}
                  />
                )}

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