import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Alert, ActivityIndicator, Modal, Switch } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { CredentialStorage } from '@/services/credentialStorage';
import { getDbEncryptionKey } from '@/services/Utils/crypto';
import LogService from '@/services/LogService';
import QRCode from 'react-native-qrcode-svg';
import { presentationQrCode } from '@/services/Transaction/credentialPresentation';

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
  claims: any;
}

interface SelectedClaim {
  key: string;
  value: any;
  selected: boolean;
}

interface SelectedCredential {
  credential_ID: number;
  attributes: string[];
}

// Map for credential types and their display names
const CREDENTIAL_TYPES: Record<string, { name: string, description: string, icon: string, color: string }> = {
  'pid': {
    name: 'Personal ID',
    description: 'Present your personal identity information',
    icon: 'person-outline',
    color: '#0A84FF'
  },
  'msisdn': {
    name: 'Mobile Number',
    description: 'Present your mobile subscriber number',
    icon: 'call-outline',
    color: '#FF9500'
  },
  'ehic': {
    name: 'Health Insurance Card',
    description: 'Present your European health insurance information',
    icon: 'medical-outline',
    color: '#5E5CE6'
  },
  'age_over': {
    name: 'Age Verification',
    description: 'Verify that you are over 18 years old',
    icon: 'calendar-outline',
    color: '#FF2D55'
  },
  'iban': {
    name: 'Bank Account',
    description: 'Present your bank account information',
    icon: 'card-outline',
    color: '#30B0C7'
  },
  'health_id': {
    name: 'Health ID',
    description: 'Present your health identification information',
    icon: 'fitness-outline',
    color: '#34C759'
  },
  'tax': {
    name: 'Tax ID',
    description: 'Present your tax identification information',
    icon: 'receipt-outline',
    color: '#AF52DE'
  },
  'trinity_library': {
    name: 'Trinity Library Card',
    description: 'Access Trinity library services',
    icon: 'library-outline',
    color: '#5E5CE6'
  },
  'default': {
    name: 'Credential',
    description: 'Present your digital credential',
    icon: 'document-outline',
    color: '#0A84FF'
  }
};

export default function PresentCredentials() {
  const { theme, isDarkMode } = useTheme();
  const [availableCredentials, setAvailableCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimsModalVisible, setClaimsModalVisible] = useState(false);
  const [currentCredential, setCurrentCredential] = useState<Credential | null>(null);
  const [availableClaims, setAvailableClaims] = useState<SelectedClaim[]>([]);
  const [selectedCredentials, setSelectedCredentials] = useState<SelectedCredential[]>([]);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [qrCodeModalVisible, setQrCodeModalVisible] = useState(false);
  const [generatingQR, setGeneratingQR] = useState(false);

  const logService = LogService.getInstance();

  // Determine credential type from claims (unchanged)
  const determineCredentialType = (claims: any): string => {
    const vct = claims.vct || '';
    for (const type of Object.keys(CREDENTIAL_TYPES)) {
      if (vct && vct.includes(type)) {
        return type;
      }
    }
    if (claims.family_name || claims.given_name) return 'pid';
    if (claims.msisdn || claims.phoneNumber) return 'msisdn';
    if (claims.ehic_number || claims.healthInsurance) return 'ehic';
    if (claims.over18 || claims.ageOver18) return 'age_over';
    if (claims.iban || claims.bankAccount) return 'iban';
    if (claims.health_id_number || claims.healthId) return 'health_id';
    if (claims.tax_id || claims.taxNumber) return 'tax';
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

  // Fetch available credentials
  useEffect(() => {
    const fetchCredentials = async () => {
      let storage = null;
      try {
        setLoading(true);
        const dbEncryptionKey = await getDbEncryptionKey();
        if (!dbEncryptionKey) throw new Error("Failed to retrieve database encryption key");
        storage = new CredentialStorage(dbEncryptionKey);
        const credentialsFromDb = await storage.retrieveCredentials();
        if (!credentialsFromDb || credentialsFromDb.length === 0) {
          setAvailableCredentials([]);
          setLoading(false);
          return;
        }
        const displayableCredentials = credentialsFromDb.map(cred => {
          const claims = typeof cred.credential_claims === 'string'
            ? JSON.parse(cred.credential_claims)
            : cred.credential_claims;
          const credType = determineCredentialType(claims);
          const typeInfo = CREDENTIAL_TYPES[credType] || CREDENTIAL_TYPES.default;
          const expiration = cred.exp_date
            ? new Date(Number(cred.exp_date) * 1000).toISOString()
            : null;
          return {
            id: cred.id,
            type: credType,
            name: typeInfo.name,
            description: typeInfo.description,
            icon: typeInfo.icon,
            color: typeInfo.color,
            timestamp: new Date(Number(cred.iss_date) * 1000).toISOString(),
            expiration,
            vct: claims.vct,
            claims: claims
          };
        });
        setAvailableCredentials(displayableCredentials);
        await logService.createLog({
          transaction_type: 'credential_presentation',
          status: 'success',
          details: `Retrieved ${displayableCredentials.length} available credentials for presentation`
        });
      } catch (error) {
        console.error('Error fetching credentials:', error);
        await logService.createLog({
          transaction_type: 'credential_presentation',
          status: 'failed',
          details: `Error fetching available credentials: ${error instanceof Error ? error.message : String(error)}`
        });
        Alert.alert('Error', 'Failed to fetch credential information. Please try again.', [{ text: 'OK' }]);
      } finally {
        setLoading(false);
      }
    };
    fetchCredentials();
  }, [theme]);

  // Toggle credential selection
  const handleCredentialSelection = (credential: Credential) => {
    setSelectedCredentials(prev => {
      const exists = prev.find(sc => sc.credential_ID === credential.id);
      if (exists) {
        return prev.filter(sc => sc.credential_ID !== credential.id);
      } else {
        return [...prev, { credential_ID: credential.id, attributes: [] }];
      }
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return `Issued: ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Filter out system/technical fields
  const getFilteredClaims = (claims: any): SelectedClaim[] => {
    const ignoredFields = [
      'iss', 'iat', 'exp', 'jti', 'sub', 'aud', 'nbf',
      'vct', 'vc', '_sd', '_sd_alg', 'cnf', 'status'
    ];
    return Object.entries(claims)
      .filter(([key]) => !ignoredFields.includes(key))
      .map(([key, value]) => ({
        key,
        value,
        selected: false
      }));
  };

  // Nicely format claim keys
  const formatClaimKey = (key: string): string => {
    const specialFormats: Record<string, string> = {
      'given_name': 'Given Name',
      'family_name': 'Family Name',
      'msisdn': 'Mobile Number',
      'iban': 'Bank Account (IBAN)',
      'place_of_birth': 'Place of Birth',
      'nationalities': 'Nationalities',
      'age_over': 'Age Over 18',
      'tax_id': 'Tax ID',
      'birthdate': 'Date of Birth',
      'gender': 'Gender',
      'ehic_number': 'Health Insurance Number',
      'health_id_number': 'Health ID',
      'pda1_number': 'Driver\'s License',
      'por_address': 'Address'
    };
    if (specialFormats[key]) {
      return specialFormats[key];
    }
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^\w/, c => c.toUpperCase())
      .trim();
  };

  // Nicely format claim values
  const formatClaimValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return `[${value.length} items]`;
      }
      return '{...}';
    }
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
    }
    return String(value);
  };

  // Open claims selection modal
  const openClaimsSelection = (credential: Credential) => {
    setCurrentCredential(credential);
    const filtered = getFilteredClaims(credential.claims);
    const prevEntry = selectedCredentials.find(sc => sc.credential_ID === credential.id);
    const prevAttributes = prevEntry ? prevEntry.attributes : [];
    filtered.forEach(claim => {
      claim.selected = prevAttributes.includes(claim.key);
    });
    setAvailableClaims(filtered);
    setClaimsModalVisible(true);
  };

  // Toggle a claim's selection state
  const toggleClaimSelection = (index: number) => {
    setAvailableClaims(prev => {
      const updated = [...prev];
      updated[index].selected = !updated[index].selected;
      return updated;
    });
  };

  // Save selected claims back into state
  const saveSelectedClaims = () => {
    if (!currentCredential) return;
    const selectedKeys = availableClaims
      .filter(claim => claim.selected)
      .map(claim => claim.key);

    setSelectedCredentials(prev => {
      // Remove any existing entry for this credential
      const filtered = prev.filter(sc => sc.credential_ID !== currentCredential.id);
      // If no claims selected, we drop this credential entirely
      if (selectedKeys.length === 0) {
        return filtered;
      }
      // Otherwise, add/update with new attributes
      return [...filtered, { credential_ID: currentCredential.id, attributes: selectedKeys }];
    });

    setClaimsModalVisible(false);
  };

  const selectAllClaims = () => {
    setAvailableClaims(prev =>
      prev.map(claim => ({ ...claim, selected: true }))
    );
  };

  const deselectAllClaims = () => {
    setAvailableClaims(prev =>
      prev.map(claim => ({ ...claim, selected: false }))
    );
  };

  // Generate QR Code for presentation
  const generateQRCode = async () => {
    if (selectedCredentials.length === 0) {
      Alert.alert('No Selection', 'Please select at least one credential and its claims to present');
      return;
    }

    // Check if any of the selected credentials have no attributes selected
    const hasEmptyAttributes = selectedCredentials.some(sc => sc.attributes.length === 0);
    if (hasEmptyAttributes) {
      Alert.alert(
        'Incomplete Selection', 
        'Please select specific claims for all your selected credentials',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setGeneratingQR(true);
      await logService.initialize();
      
      // Simply use the selectedCredentials array for the QR code
      const qrData = JSON.stringify(selectedCredentials);
      setQrCodeData(qrData);
      
      await logService.createLog({
        transaction_type: 'credential_presentation',
        status: 'success',
        details: `Generated QR code for ${selectedCredentials.length} credentials with selected claims`,
        relying_party: 'QR Presentation'
      });
      
      // Show QR code modal
      setQrCodeModalVisible(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
      await logService.createLog({
        transaction_type: 'credential_presentation',
        status: 'failed',
        details: `Failed to generate QR code: ${error instanceof Error ? error.message : String(error)}`,
        relying_party: 'QR Presentation'
      });
      Alert.alert('Error', 'Failed to generate QR code. Please try again.');
    } finally {
      setGeneratingQR(false);
      logService.close();
    }
  };

  // Confirm before presenting
  const handlePresentCredentials = () => {
    if (selectedCredentials.length === 0) {
      Alert.alert('No Selection', 'Please select at least one credential and its claims to present');
      return;
    }
    const presentationSummary = selectedCredentials.map(sc => {
      const cred = availableCredentials.find(c => c.id === sc.credential_ID);
      const claimsList = sc.attributes.map(key => formatClaimKey(key)).join(', ');
      return `• ${cred ? cred.name : ''} - ${claimsList}`;
    }).join('\n\n');
    Alert.alert(
      'Confirm Presentation',
      `Are you sure you want to present the following credentials and claims?\n\n${presentationSummary}`,
      [
        { text: 'No', style: 'cancel' },
        { text: 'Confirm', onPress: () => generateQRCode() }
      ]
    );
  };

  // Individual credential card component
  const CredentialCard = ({ credential }: { credential: Credential }) => {
    const isSelected = selectedCredentials.some(sc => sc.credential_ID === credential.id);
    const entry = selectedCredentials.find(sc => sc.credential_ID === credential.id);
    const hasSelectedClaims = entry ? entry.attributes.length > 0 : false;

    return (
      <View style={styles.cardWrapper}>
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
              <View style={[styles.iconContainer, { backgroundColor: credential.color + '20' }]}>
                <Ionicons name={credential.icon as any} size={24} color={credential.color} />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={[styles.credentialName, { color: theme.text }]}>
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

        {isSelected && (
          <TouchableOpacity
            style={[
              styles.selectClaimsButton,
              { backgroundColor: hasSelectedClaims ? theme.primary + '20' : theme.surface }
            ]}
            onPress={() => openClaimsSelection(credential)}
          >
            <Ionicons
              name={hasSelectedClaims ? "checkmark-circle" : "list-outline"}
              size={18}
              color={hasSelectedClaims ? theme.primary : theme.textSecondary}
            />
            <Text style={[
              styles.selectClaimsText,
              { color: hasSelectedClaims ? theme.primary : theme.textSecondary }
            ]}>
              {hasSelectedClaims
                ? `${entry!.attributes.length} claims selected`
                : "Select claims to present"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
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
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Credentials</Text>
          <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
            Choose the credentials you would like to present. You can select specific claims from each credential.
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

      {/* Claims Selection Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={claimsModalVisible}
        onRequestClose={() => setClaimsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.dark }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Claims to Present</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setClaimsModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSubheader}>
              <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                {currentCredential?.name}
              </Text>
              <View style={styles.claimSelectionActions}>
                <TouchableOpacity style={[styles.selectionButton, { borderColor: theme.border }]} onPress={selectAllClaims}>
                  <Text style={[styles.selectionButtonText, { color: theme.primary }]}>Select All</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.selectionButton, { borderColor: theme.border }]} onPress={deselectAllClaims}>
                  <Text style={[styles.selectionButtonText, { color: theme.primary }]}>Clear All</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.claimsScrollView}>
              {availableClaims.map((claim, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.claimItem, { backgroundColor: theme.surface }]}
                  onPress={() => toggleClaimSelection(index)}
                >
                  <View style={styles.claimContent}>
                    <View style={styles.claimInfo}>
                      <Text style={[styles.claimKey, { color: theme.text }]}>{formatClaimKey(claim.key)}</Text>
                      <Text style={[styles.claimValue, { color: theme.textSecondary }]}>{formatClaimValue(claim.value)}</Text>
                    </View>
                    <Switch
                      value={claim.selected}
                      onValueChange={() => toggleClaimSelection(index)}
                      trackColor={{ false: theme.darker, true: theme.primary + '50' }}
                      thumbColor={claim.selected ? theme.primary : theme.textSecondary}
                    />
                  </View>
                </TouchableOpacity>
              ))}
              {availableClaims.length === 0 && (
                <View style={styles.noClaimsContainer}>
                  <Text style={[styles.noClaimsText, { color: theme.textSecondary }]}>
                    No presentable claims found in this credential
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
              <TouchableOpacity style={[styles.cancelButton, { borderColor: theme.border }]} onPress={() => setClaimsModalVisible(false)}>
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={saveSelectedClaims}>
                <Text style={[styles.saveButtonText, { color: theme.text }]}>Save Selection</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      // QR Code Modal
      <Modal
        animationType="fade"
        transparent
        visible={qrCodeModalVisible}
        onRequestClose={() => setQrCodeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.qrModalContainer, { backgroundColor: theme.dark }]}>
            <View style={styles.qrModalHeader}>
              <Text style={[styles.qrModalTitle, { color: theme.text }]}>Credential Presentation</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setQrCodeModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.qrContentContainer}>
              <Text style={[styles.qrInstructions, { color: theme.textSecondary }]}>
                Scan this QR code with the verifier's device to present your credentials
              </Text>
              
      <View style={styles.qrCodeWrapper}>
                {qrCodeData ? (
                  <QRCode
                    value={qrCodeData}
                    size={250}
                    backgroundColor="white"
                    color="black"
                    ecl="Q" // Higher error correction level
                    quietZone={10}
                    onError={(error) => {
                      console.error('QR Code error:', error);
                      Alert.alert(
                        'QR Code Error',
                        'The credential data is too large for a single QR code. Try selecting fewer claims.',
                        [{ text: 'OK' }]
                      );
                    }}
                  />
                ) : (
                  <ActivityIndicator size="large" color={theme.primary} />
                )}
              </View>
              
              <View style={styles.credentialSummaryContainer}>
                <Text style={[styles.credentialSummaryTitle, { color: theme.text }]}>
                  Presenting:
                </Text>
                {selectedCredentials.map((sc, index) => {
                  const cred = availableCredentials.find(c => c.id === sc.credential_ID);
                  return (
                    <View key={index} style={styles.presentingSummaryItem}>
                      <Text style={[styles.presentingCredentialName, { color: theme.text }]}>
                        {cred?.name || `Credential ${index + 1}`}
                      </Text>
                      <Text style={[styles.presentingClaimsCount, { color: theme.textSecondary }]}>
                        {sc.attributes.length} claims
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
            
            <TouchableOpacity 
              style={[styles.doneButton, { backgroundColor: theme.primary }]} 
              onPress={() => setQrCodeModalVisible(false)}
            >
              <Text style={[styles.doneButtonText, { color: '#FFFFFF' }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {availableCredentials.length > 0 && (
        <View style={[styles.bottomContainer, { borderTopColor: theme.border, backgroundColor: theme.dark }]}>
          <TouchableOpacity
            style={[styles.presentButton, selectedCredentials.length === 0 && styles.disabledButton]}
            onPress={handlePresentCredentials}
            disabled={selectedCredentials.length === 0 || generatingQR}
          >
            <LinearGradient
              colors={[
                selectedCredentials.length > 0 ? theme.primary : theme.textSecondary,
                selectedCredentials.length > 0 ? theme.primaryDark : theme.border
              ]}
              style={styles.buttonGradient}
            >
              {generatingQR ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={[styles.buttonText, { color: theme.text }]}>
                    Present Selected Credentials ({selectedCredentials.length})
                  </Text>
                  <Ionicons name="qr-code-outline" size={20} color={theme.text} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {selectedCredentials.length > 0 && selectedCredentials.some(sc => sc.attributes.length === 0) && (
            <Text style={[styles.warningText, { color: theme.textSecondary }]}>
              Please select specific claims for all your selected credentials
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1
  },
  headerTitle: { fontFamily: 'Poppins-Bold', fontSize: 18 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 30 },
  contentContainer: { padding: 20 },
  sectionTitle: { fontFamily: 'Poppins-Bold', fontSize: 20, marginBottom: 8 },
  instructionText: { fontFamily: 'Poppins-Regular', fontSize: 14, marginBottom: 24 },
  loadingContainer: { alignItems: 'center', paddingVertical: 30 },
  loadingText: { fontFamily: 'Poppins-Regular', fontSize: 16, marginTop: 12 },
  credentialsContainer: { gap: 16 },
  cardWrapper: { marginBottom: 8 },
  credentialCard: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  selectedCard: { borderWidth: 2 },
  cardGradient: { borderRadius: 15 },
  cardContent: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  cardTextContainer: { flex: 1 },
  credentialName: { fontFamily: 'Poppins-Bold', fontSize: 16 },
  credentialDescription: { fontFamily: 'Poppins-Regular', fontSize: 13, marginTop: 2 },
  issueDate: { fontFamily: 'Poppins-Regular', fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  radioContainer: { padding: 4 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  selectClaimsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 12, marginTop: 8, marginBottom: 16 },
  selectClaimsText: { fontFamily: 'Poppins-Medium', fontSize: 14, marginLeft: 6 },
  bottomContainer: { padding: 20, borderTopWidth: 1 },
  presentButton: { borderRadius: 16, overflow: 'hidden' },
  disabledButton: { opacity: 0.7 },
  buttonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 16, gap: 8 },
  buttonText: { fontFamily: 'Poppins-Bold', fontSize: 16 },
  warningText: { fontFamily: 'Poppins-Regular', fontSize: 13, textAlign: 'center', marginTop: 8 },
  emptyStateContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyStateText: { fontFamily: 'Poppins-Bold', fontSize: 18, marginTop: 16 },
  emptyStateSubtext: { fontFamily: 'Poppins-Regular', fontSize: 14, marginTop: 8, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, minHeight: '70%', maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)' },
  modalTitle: { fontFamily: 'Poppins-Bold', fontSize: 18 },
  closeButton: { padding: 4 },
  modalSubheader: { padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)' },
  modalSubtitle: { fontFamily: 'Poppins-Medium', fontSize: 16, marginBottom: 12 },
  claimSelectionActions: { flexDirection: 'row', justifyContent: 'space-between' },
  selectionButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
  selectionButtonText: { fontFamily: 'Poppins-Medium', fontSize: 14 },
  claimsScrollView: { flex: 1, padding: 12 },
  claimItem: { borderRadius: 12, padding: 14, marginBottom: 10 },
  claimContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  claimInfo: { flex: 1, marginRight: 12 },
  claimKey: { fontFamily: 'Poppins-Medium', fontSize: 15, marginBottom: 2 },
  claimValue: { fontFamily: 'Poppins-Regular', fontSize: 14 },
  noClaimsContainer: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  noClaimsText: { fontFamily: 'Poppins-Regular', fontSize: 16, textAlign: 'center' },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderTopWidth: 1 },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginRight: 8 },
  cancelButtonText: { fontFamily: 'Poppins-Medium', fontSize: 16 },
  saveButton: { flex: 2, paddingVertical: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { fontFamily: 'Poppins-Medium', fontSize: 16 },
  
  // QR Code Modal Styles
  qrModalContainer: { 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24,
    height: '80%', 
    width: '100%',
    padding: 0
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)'
  },
  qrModalTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20
  },
  qrContentContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center'
  },
  qrInstructions: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24
  },
  qrCodeWrapper: {
    width: 280,
    height: 280,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    padding: 15,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8
  },
  credentialSummaryContainer: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    marginTop: 8
  },
  credentialSummaryTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    marginBottom: 12
  },
  presentingSummaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)'
  },
  presentingCredentialName: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16
  },
  presentingClaimsCount: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14
  },
  doneButton: {
    margin: 20,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  doneButtonText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16
  }
});