import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { CredentialStorage } from '@/services/credentialStorage';
import { getDbEncryptionKey } from '@/services/Utils/crypto';
import LogService from '@/services/LogService';

interface Credential {
  id: string | number;
  type: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  timestamp: string;
  expiration?: string | null;
  vct?: string;
}

type IoniconsProps = React.ComponentProps<typeof Ionicons>;

// Map for credential types and their display names
const CREDENTIAL_TYPES: Record<string, { name: string, description: string, icon: string, color: string }> = {
  'pid': {
    name: 'Personal ID',
    description: 'Present your personal identity information',
    icon: 'person-outline',
    color: '#0A84FF' // Blue
  },
  'msisdn': {
    name: 'Mobile Number',
    description: 'Present your mobile subscriber number',
    icon: 'call-outline',
    color: '#FF9500' // Orange
  },
  'ehic': {
    name: 'Health Insurance Card',
    description: 'Present your European health insurance information',
    icon: 'medical-outline',
    color: '#5E5CE6' // Purple
  },
  'age_over': {
    name: 'Age Verification',
    description: 'Verify that you are over 18 years old',
    icon: 'calendar-outline',
    color: '#FF2D55' // Pink
  },
  'iban': {
    name: 'Bank Account',
    description: 'Present your bank account information',
    icon: 'card-outline',
    color: '#30B0C7' // Light blue
  },
  'health_id': {
    name: 'Health ID',
    description: 'Present your health identification information',
    icon: 'fitness-outline',
    color: '#34C759' // Green
  },
  'tax': {
    name: 'Tax ID',
    description: 'Present your tax identification information',
    icon: 'receipt-outline',
    color: '#AF52DE' // Purple
  },
  'trinity_library': {
    name: 'Trinity Library Card',
    description: 'Access Trinity library services',
    icon: 'library-outline',
    color: '#5E5CE6' // Purple
  },
  'default': {
    name: 'Credential',
    description: 'Present your digital credential',
    icon: 'document-outline',
    color: '#0A84FF' // Default blue
  }
};

export default function PresentCredentials() {
  const { theme, isDarkMode } = useTheme();
  const [selectedCredential, setSelectedCredential] = useState<string | number | null>(null);
  const [availableCredentials, setAvailableCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);

  const logService = LogService.getInstance();

  // Function to determine credential type from claims
  const determineCredentialType = (claims: any): string => {
    // Check VCT field first
    const vct = claims.vct || '';
    
    for (const type of Object.keys(CREDENTIAL_TYPES)) {
      if (vct.includes(type)) {
        return type;
      }
    }

    // Check specific fields
    if (claims.family_name || claims.given_name) return 'pid';
    if (claims.msisdn || claims.phoneNumber) return 'msisdn';
    if (claims.ehic_number || claims.healthInsurance) return 'ehic';
    if (claims.over18 || claims.ageOver18) return 'age_over';
    if (claims.iban || claims.bankAccount) return 'iban';
    if (claims.health_id_number || claims.healthId) return 'health_id';
    if (claims.tax_id || claims.taxNumber) return 'tax';
    
    // Try to determine from claim keys as fallback
    const claimKeys = Object.keys(claims).join(' ').toLowerCase();
    
    if (claimKeys.includes('person') || claimKeys.includes('name')) return 'pid';
    if (claimKeys.includes('phone') || claimKeys.includes('mobile')) return 'msisdn';
    if (claimKeys.includes('health') || claimKeys.includes('insurance')) return 'ehic';
    if (claimKeys.includes('age') || claimKeys.includes('adult')) return 'age_over';
    if (claimKeys.includes('bank') || claimKeys.includes('account')) return 'iban';
    if (claimKeys.includes('tax')) return 'tax';
    if (claimKeys.includes('library') || claimKeys.includes('trinity')) return 'trinity_library';
    
    return 'default';
  };

  // Fetch available credentials from storage
  useEffect(() => {
    const fetchCredentials = async () => {
      let storage = null;
      
      try {
        setLoading(true);
        
        // Get database encryption key
        const dbEncryptionKey = await getDbEncryptionKey();
        if (!dbEncryptionKey) {
          throw new Error("Failed to retrieve database encryption key");
        }
        
        // Initialize credential storage
        storage = new CredentialStorage(dbEncryptionKey);
        
        // Fetch actual credentials from database
        const credentialsFromDb = await storage.retrieveCredentials();
        
        if (!credentialsFromDb || credentialsFromDb.length === 0) {
          setAvailableCredentials([]);
          setLoading(false);
          return;
        }
        
        // Transform credentials into displayable format
        const displayableCredentials = credentialsFromDb.map(cred => {
          // Parse claims if they're stored as a string
          const claims = typeof cred.credential_claims === 'string' 
            ? JSON.parse(cred.credential_claims) 
            : cred.credential_claims;
            
          // Determine credential type from claims
          const credType = determineCredentialType(claims);
          
          // Get display information for the credential type
          const typeInfo = CREDENTIAL_TYPES[credType] || CREDENTIAL_TYPES.default;
          
          // Get expiration date if available
          const expiration = cred.exp_date 
            ? new Date(Number(cred.exp_date) * 1000).toISOString() 
            : null;
            
          // Create credential object
          return {
            id: cred.id,
            type: credType,
            name: typeInfo.name,
            description: typeInfo.description,
            icon: typeInfo.icon,
            color: typeInfo.color,
            timestamp: new Date(Number(cred.iss_date) * 1000).toISOString(),
            expiration,
            vct: claims.vct
          };
        });
        
        setAvailableCredentials(displayableCredentials);
        
        // Log credential fetch attempt
        await logService.createLog({
          transaction_type: 'credential_presentation',
          status: 'success',
          details: `Retrieved ${displayableCredentials.length} available credentials for presentation`
        });
        
      } catch (error) {
        console.error('Error fetching credentials:', error);
        
        // Log the error
        await logService.createLog({
          transaction_type: 'credential_presentation',
          status: 'failed',
          details: `Error fetching available credentials: ${error instanceof Error ? error.message : String(error)}`
        });
        
        Alert.alert(
          'Error',
          'Failed to fetch credential information. Please try again.',
          [{ text: 'OK' }]
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCredentials();
  }, [theme]);

  const handleCredentialSelection = (credential: Credential) => {
    setSelectedCredential(prev => prev === credential.id ? null : credential.id);
  };

  // Show confirmation dialog
  const handlePresentCredential = () => {
    if (!selectedCredential) {
      Alert.alert('No Selection', 'Please select a credential to present');
      return;
    }
    
    const credential = availableCredentials.find(c => c.id === selectedCredential);
    if (!credential) {
      Alert.alert('Error', 'Selected credential not found');
      return;
    }

    Alert.alert(
      'Confirm Presentation',
      `Are you sure you want to present the following credential?\n\n• ${credential.name}`,
      [
        { text: 'No', style: 'cancel' },
        { text: 'Confirm', onPress: () => doPresentCredential(credential) }
      ]
    );
  };

  // Actual presentation logic
  const doPresentCredential = async (credential: Credential) => {
    try {
      await logService.initialize();
      await logService.createLog({
        transaction_type: 'credential_presentation',
        status: 'success',
        details: `Presented ${credential.name} credential`,
        relying_party: 'Test Verifier'
      });

      Alert.alert(
        'Credential Presented',
        `You have successfully presented your ${credential.name} credential.`,
        [{
          text: 'OK',
          onPress: () => {
            // Just clear the selection after successful presentation
            setSelectedCredential(null);
          }
        }]
      );
    } catch (error) {
      console.error('Error during credential presentation:', error);
      await logService.createLog({
        transaction_type: 'credential_presentation',
        status: 'failed',
        details: `Failed to present ${credential.name} credential: ${error instanceof Error ? error.message : String(error)}`,
        relying_party: 'Test Verifier'
      });
      Alert.alert('Error', 'Failed to present credential. Please try again.');
    } finally {
      logService.close();
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return `Issued: ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const CredentialCard = ({ credential }: { credential: Credential }) => {
    const isSelected = credential.id === selectedCredential;
    return (
      <TouchableOpacity
        style={[
          styles.credentialCard,
          { borderColor: theme.border },
          isSelected && [styles.selectedCard, { borderColor: theme.primary }]
        ]}
        onPress={() => handleCredentialSelection(credential)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[theme.surface, theme.darker]}
          style={styles.cardGradient}
        >
          <View style={styles.cardContent}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: credential.color + '20' }
              ]}
            >
              <Ionicons
                name={credential.icon as IoniconsProps['name']}
                size={24}
                color={credential.color}
              />
            </View>

            <View style={styles.cardTextContainer}>
              <Text
                style={[
                  styles.credentialName,
                  { color: theme.text }
                ]}
              >
                {credential.name}
              </Text>
              <Text style={[styles.credentialDescription, { color: theme.textSecondary }]}>
                {credential.description}
              </Text>
              <Text style={[styles.issueDate, { color: theme.textSecondary }]}>
                {formatDate(credential.timestamp)}
              </Text>
            </View>

            <View style={styles.radioContainer}>
              <View
                style={[
                  styles.radioOuter,
                  { borderColor: theme.border },
                  isSelected && { borderColor: theme.primary }
                ]}
              >
                {isSelected && <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />}
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.dark }]}>
      <View style={[styles.header, { backgroundColor: theme.dark, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Present Credentials</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animatable.View animation="fadeIn" duration={800} style={styles.contentContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Select a Credential</Text>
          <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
            Choose the credential you would like to present. Only one credential can be presented at a time.
          </Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading credentials...</Text>
            </View>
          ) : availableCredentials.length > 0 ? (
            <View style={styles.credentialsContainer}>
              {availableCredentials.map(cred => (
                <CredentialCard key={cred.id.toString()} credential={cred} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="document-text-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                No credentials available
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: theme.textSecondary }]}>
                Go to the Request tab to obtain credentials
              </Text>
            </View>
          )}
        </Animatable.View>
      </ScrollView>

      {availableCredentials.length > 0 && (
        <View style={[styles.bottomContainer, { borderTopColor: theme.border, backgroundColor: theme.dark }]}>
          <TouchableOpacity
            style={[styles.presentButton, !selectedCredential && styles.disabledButton]}
            onPress={handlePresentCredential}
            disabled={!selectedCredential}
          >
            <LinearGradient
              colors={[
                selectedCredential ? theme.primary : theme.textSecondary,
                selectedCredential ? theme.primaryDark : theme.border
              ]}
              style={styles.buttonGradient}
            >
              <Text style={[styles.buttonText, { color: theme.text }]}>Present Credential</Text>
              <Ionicons name="arrow-forward" size={20} color={theme.text} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  header: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingHorizontal: 16, 
    paddingTop: 60, 
    paddingBottom: 16, 
    borderBottomWidth: 1
  },
  headerTitle: { 
    fontFamily: 'Poppins-Bold', 
    fontSize: 18 
  },
  scrollView: { 
    flex: 1 
  },
  scrollContent: { 
    paddingBottom: 30 
  },
  contentContainer: { 
    padding: 20 
  },
  sectionTitle: { 
    fontFamily: 'Poppins-Bold', 
    fontSize: 20, 
    marginBottom: 8 
  },
  instructionText: { 
    fontFamily: 'Poppins-Regular', 
    fontSize: 14, 
    marginBottom: 24 
  },
  loadingContainer: { 
    alignItems: 'center', 
    paddingVertical: 30 
  },
  loadingText: { 
    fontFamily: 'Poppins-Regular', 
    fontSize: 16,
    marginTop: 12
  },
  credentialsContainer: { 
    gap: 16 
  },
  credentialCard: { 
    borderRadius: 16, 
    overflow: 'hidden', 
    borderWidth: 1 
  },
  selectedCard: { 
    borderWidth: 2 
  },
  cardGradient: { 
    borderRadius: 15 
  },
  cardContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16 
  },
  iconContainer: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 16 
  },
  cardTextContainer: { 
    flex: 1 
  },
  credentialName: { 
    fontFamily: 'Poppins-Bold', 
    fontSize: 16 
  },
  credentialDescription: { 
    fontFamily: 'Poppins-Regular', 
    fontSize: 13, 
    marginTop: 2 
  },
  issueDate: { 
    fontFamily: 'Poppins-Regular', 
    fontSize: 12, 
    marginTop: 4, 
    fontStyle: 'italic' 
  },
  radioContainer: { 
    padding: 4 
  },
  radioOuter: { 
    width: 22, 
    height: 22, 
    borderRadius: 11, 
    borderWidth: 2, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  radioInner: { 
    width: 12, 
    height: 12, 
    borderRadius: 6 
  },
  bottomContainer: { 
    padding: 20, 
    borderTopWidth: 1 
  },
  presentButton: { 
    borderRadius: 16, 
    overflow: 'hidden' 
  },
  disabledButton: { 
    opacity: 0.7 
  },
  buttonGradient: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 14, 
    paddingHorizontal: 20, 
    borderRadius: 16, 
    gap: 8 
  },
  buttonText: { 
    fontFamily: 'Poppins-Bold', 
    fontSize: 16 
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40
  },
  emptyStateText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    marginTop: 16
  },
  emptyStateSubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center'
  }
});