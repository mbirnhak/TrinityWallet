import { View, ScrollView, StyleSheet, Alert, Text, TouchableOpacity, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { CredentialStorage } from '@/services/credentialStorage';
import * as Animatable from 'react-native-animatable';
import { useEffect, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import CredentialCard from '../../components/CredentialCard';
import { useTheme } from '@/context/ThemeContext';
import CommonHeader from '../../components/Header';
import { getDbEncryptionKey } from '@/services/Utils/crypto';
import { useFocusEffect } from '@react-navigation/native';

// Map of credential types with their VCT identifiers
const CREDENTIAL_TYPES = {
  'eu.europa.ec.eudi.pid_jwt_vc_json': 'pid',
  'eu.europa.ec.eudi.msisdn_sd_jwt_vc': 'msisdn',
  'eu.europa.ec.eudi.ehic_sd_jwt_vc': 'ehic',
  'eu.europa.ec.eudi.pseudonym_over18_sd_jwt_vc': 'age_verification',
  'eu.europa.ec.eudi.iban_sd_jwt_vc': 'iban',
  'eu.europa.ec.eudi.hiid_sd_jwt_vc': 'health_id',
  'eu.europa.ec.eudi.tax_sd_jwt_vc': 'tax',
  'eu.europa.ec.eudi.pda1_sd_jwt_vc': 'pda1',
  'eu.europa.ec.eudi.por_sd_jwt_vc': 'por'
};

// Human-readable names for credential types
const CREDENTIAL_NAMES = {
  'pid': 'Personal ID',
  'msisdn': 'Mobile Number',
  'ehic': 'Health Insurance Card',
  'age_verification': 'Age Verification',
  'iban': 'Bank Account',
  'health_id': 'Health ID',
  'tax': 'Tax ID',
  'pda1': 'Driving License',
  'por': 'Place of Residence'
};

export default function Credentials() {
  const { theme, isDarkMode } = useTheme();
  const [storedCredentials, setStoredCredentials] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCardId, setExpandedCardId] = useState(null);
  
  const fetchCredentials = useCallback(async () => {
    let storage = null;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching credentials...");
      
      // Initialize credential storage
      const dbEncryptionKey = await getDbEncryptionKey();
      storage = new CredentialStorage(dbEncryptionKey);
      
      // Fetch all credentials from database
      const credentialsFromDb = await storage.retrieveCredentials();
      console.log("Retrieved credentials:", credentialsFromDb ? credentialsFromDb.length : 0);
      
      if (!credentialsFromDb || credentialsFromDb.length === 0) {
        setStoredCredentials({});
        return;
      }
      
      // Process the credentials into a format for our cards
      const credentials = {};
      
      // Group credentials by type
      credentialsFromDb.forEach(cred => {
        try {
          // Try to determine credential type from the VCT or other fields
          const claims = cred.credential_claims || {};
          const vct = claims.vct || '';
          
          // Find the proper credential type
          let credType = null;
          
          // First try to match by VCT in claims
          for (const [typeId, shortType] of Object.entries(CREDENTIAL_TYPES)) {
            // Match by exact VCT or if the typeId is included in any vct field
            if (typeId === vct || (vct && vct.includes(typeId))) {
              credType = shortType;
              break;
            }
          }
          
          // If not found, check in VC type array or other claim fields
          if (!credType && claims.vc) {
            // Check if vc contains a _type array
            const typeArray = claims.vc._type || [];
            for (const [typeId, shortType] of Object.entries(CREDENTIAL_TYPES)) {
              if (Array.isArray(typeArray) && typeArray.some(t => t.includes(typeId))) {
                credType = shortType;
                break;
              }
            }
          }
          
          // If still not found, try more specific claims that might indicate credential type
          if (!credType) {
            if (claims.family_name || claims.given_name) credType = 'pid';
            else if (claims.msisdn || claims.phoneNumber) credType = 'msisdn';
            else if (claims.ehic_number || claims.healthInsurance) credType = 'ehic';
            else if (claims.over18 || claims.ageOver18) credType = 'age_verification';
            else if (claims.iban || claims.bankAccount) credType = 'iban';
            else if (claims.health_id_number || claims.healthId) credType = 'health_id';
            else if (claims.tax_id || claims.taxNumber) credType = 'tax';
          }
          
          // Use a fallback if no specific type was detected but we have a credential
          if (!credType && Object.keys(claims).length > 0) {
            console.log("Unidentified credential type, using fallback");
            
            // Try to determine type from claim keys
            const claimKeys = Object.keys(claims).join(' ').toLowerCase();
            
            if (claimKeys.includes('person') || claimKeys.includes('name')) {
              credType = 'pid';
            } else if (claimKeys.includes('phone') || claimKeys.includes('mobile')) {
              credType = 'msisdn';
            } else if (claimKeys.includes('health') || claimKeys.includes('insurance')) {
              credType = 'ehic';
            } else if (claimKeys.includes('age') || claimKeys.includes('adult')) {
              credType = 'age_verification';
            } else if (claimKeys.includes('bank') || claimKeys.includes('account')) {
              credType = 'iban';
            } else if (claimKeys.includes('tax')) {
              credType = 'tax';
            }
          }
          
          if (credType) {
            const date = cred.iss_date
              ? new Date(cred.iss_date * 1000)
              : new Date();
            
            credentials[credType] = {
              isAvailable: true,
              timestamp: date.toISOString(),
              data: cred.credential_string,
              claims: cred.credential_claims,
              expiration: cred.exp_date ? new Date(cred.exp_date * 1000).toISOString() : null
            };
            
            console.log(`Found credential of type: ${credType}`);
          } else {
            console.log("Unidentified credential type");
          }
        } catch (parseError) {
          console.error("Error parsing credential:", parseError);
        }
      });
      
      console.log("Processed credentials:", Object.keys(credentials));
      setStoredCredentials(credentials);
    } catch (error) {
      console.error('Error fetching credentials:', error);
      setError('Failed to fetch credentials. Please try again.');
      Alert.alert(
        'Error',
        'Failed to fetch credentials. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      if (storage) {
        storage.close();
      }
      setLoading(false);
    }
  }, []);

  // Fetch credentials when the component mounts
  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);
  
  // Refresh credentials when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchCredentials();
      return () => {}; // cleanup function
    }, [fetchCredentials])
  );

  const viewCredentialDetails = (type) => {
    try {
      if (storedCredentials[type] && storedCredentials[type].isAvailable) {
        const credential = storedCredentials[type];
        // Format the credential claims for display
        const formattedClaims = JSON.stringify(credential.claims, null, 2);
        
        // Get a readable name for the credential type
        const credName = CREDENTIAL_NAMES[type] || type.toUpperCase().replace('_', ' ');
        
        Alert.alert(
          `${credName}`,
          `Issued: ${new Date(credential.timestamp).toLocaleDateString()}\n${credential.expiration ? `Expires: ${new Date(credential.expiration).toLocaleDateString()}` : ''}\n`,
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
          `No ${CREDENTIAL_NAMES[type] || type.toUpperCase()} credential found.`,
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

  // Determine if we have any credentials to show
  const hasCredentials = Object.keys(storedCredentials).length > 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.dark }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.dark} />
      
      <View style={[styles.container, { backgroundColor: theme.dark }]}>
        <CommonHeader title="Digital Credentials" />

        <Animatable.View
          animation="fadeIn"
          duration={1000}
          style={styles.contentContainer}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.text }]}>Loading credentials...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color={theme.error} />
              <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
              <TouchableOpacity 
                style={[styles.retryButton, { backgroundColor: theme.primary }]} 
                onPress={handleRefresh}
              >
                <Text style={[styles.retryButtonText, { color: theme.buttonText }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.mainContent}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="wallet-outline" size={24} color={theme.primary} />
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Credentials</Text>
                </View>
                <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
                  <Ionicons name="refresh-outline" size={20} color={theme.primary} />
                </TouchableOpacity>
              </View>
              
              {hasCredentials ? (
                <ScrollView 
                  style={styles.cardsScrollView}
                  contentContainerStyle={styles.cardsContainer}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Only show cards for available credentials */}
                  {Object.keys(storedCredentials).map((type) => {
                    const credential = storedCredentials[type];
                    if (!credential || !credential.isAvailable) return null;
                    
                    return (
                      <Animatable.View
                        key={type}
                        animation="fadeInUp"
                        duration={600}
                        delay={200}
                      >
                        <CredentialCard
                          type={type}
                          isAvailable={true}
                          timestamp={credential.timestamp}
                          onPress={() => viewCredentialDetails(type)}
                          theme={theme}
                        />
                      </Animatable.View>
                    );
                  })}
                  
                  <View style={[styles.infoContainer, { backgroundColor: theme.darker }]}>
                    <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
                    <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                      Tap on a credential to expand and view details
                    </Text>
                  </View>
                </ScrollView>
              ) : (
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
                  <TouchableOpacity
                    onPress={handleRefresh}
                    style={[styles.emptyStateButton, { backgroundColor: theme.primary }]}
                  >
                    <Text style={[styles.emptyStateButtonText, { color: theme.buttonText }]}>
                      Refresh
                    </Text>
                  </TouchableOpacity>
                </Animatable.View>
              )}
            </View>
          )}
        </Animatable.View>
      </View>
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
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
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
  refreshButton: {
    padding: 8,
  },
  cardsScrollView: {
    flex: 1,
  },
  cardsContainer: {
    paddingBottom: 24,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 8,
  },
  retryButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
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
  },
  emptyStateButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  emptyStateButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  }
});