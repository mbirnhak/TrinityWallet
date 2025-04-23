import { View, Modal, ScrollView, StyleSheet, Alert, Text, TouchableOpacity, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { CredentialStorage } from '@/services/credentialStorage';
import * as Animatable from 'react-native-animatable';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import CredentialCard from '../../components/CredentialCard';
import { useTheme } from '@/context/ThemeContext';
import CommonHeader from '../../components/Header';
import { getDbEncryptionKey } from '@/services/Utils/crypto';
import { useFocusEffect } from '@react-navigation/native';
import LogService from '@/services/LogService';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';

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
  const [openSwipeable, setOpenSwipeable] = useState<Swipeable | null>(null);
  const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});

  interface StoredCredential {
    id: string | number; // Add ID to uniquely identify each credential
    isAvailable: boolean;
    timestamp: string;
    data: string;
    claims: any;
    expiration: string | null;
  }
  interface CredentialStore {
    [key: string]: StoredCredential[]; // Changed to array of credentials per type
  }

  const [storedCredentials, setStoredCredentials] = useState<CredentialStore>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCardId, setExpandedCardId] = useState(null);
  const logService = LogService.getInstance();

  // State for the claims modal
  const [claimsModalVisible, setClaimsModalVisible] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<StoredCredential | null>(null);
  const [selectedCredentialType, setSelectedCredentialType] = useState(null);

  // State to keep track of expanded nested objects
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({});

  // Toggle expansion of a nested object
  const toggleExpand = (path: string) => {
    setExpandedPaths(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  // Render right swipe actions (delete button)
  const renderRightActions = (type: string, credentialId: string | number) => {
    return (
      <TouchableOpacity
        style={[styles.deleteAction, { backgroundColor: theme.error }]}
        onPress={() => confirmDeleteCredential(type, credentialId)}
      >
        <Ionicons name="trash-outline" size={24} color="white" />
        <Text style={styles.deleteActionText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  // Handle swipeable open
  const onSwipeableOpen = (swipeable: Swipeable | null) => {
    if (openSwipeable && openSwipeable !== swipeable) {
      openSwipeable.close();
    }
    setOpenSwipeable(swipeable);
  };

  const fetchCredentials = useCallback(async () => {
    let storage = null;

    try {
      setLoading(true);
      setError(null);

      console.log("Fetching credentials...");

      // Initialize credential storage
      const dbEncryptionKey = await getDbEncryptionKey();
      if (!dbEncryptionKey) {
        throw new Error("Failed to retrieve database encryption key");
      }

      storage = new CredentialStorage(dbEncryptionKey);

      // Fetch all credentials from database
      const credentialsFromDb = await storage.retrieveCredentials();
      console.log("Retrieved credentials:", credentialsFromDb ? credentialsFromDb.length : 0);

      // Log credential fetch attempt
      await logService.createLog({
        transaction_type: 'credential_presentation',
        status: credentialsFromDb && credentialsFromDb.length > 0 ? 'success' : 'pending',
        details: `Retrieved ${credentialsFromDb ? credentialsFromDb.length : 0} credentials`
      });

      if (!credentialsFromDb || credentialsFromDb.length === 0) {
        setStoredCredentials({});
        setLoading(false);
        return;
      }

      // Process the credentials into a format for our cards
      const credentialsMap: CredentialStore = {};

      // Group credentials by type
      for (const cred of credentialsFromDb) {
        try {
          if (!cred || !cred.credential_claims) {
            console.log("Skipping invalid credential entry");
            continue;
          }

          // Try to determine credential type from the VCT or other fields
          const claims = typeof cred.credential_claims === 'string'
            ? JSON.parse(cred.credential_claims)
            : cred.credential_claims;

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
            const typeArray = Array.isArray(claims.vc._type) ? claims.vc._type :
              (typeof claims.vc._type === 'string' ? [claims.vc._type] : []);

            for (const [typeId, shortType] of Object.entries(CREDENTIAL_TYPES)) {
              // Explicit type guard for string array element
              if (typeArray.some((t: string | unknown): boolean =>
                Boolean(t && typeof t === 'string' && t.includes(typeId))
              )) {
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
            } else {
              // Last resort fallback - use generic credential type
              credType = 'pid'; // Default to personal ID if nothing else matches
            }
          }

          if (credType) {
            const date = cred.iss_date
              ? new Date(Number(cred.iss_date) * 1000)
              : new Date();

            // Create a credential object with ID
            const credentialObj: StoredCredential = {
              id: cred.id, // Store the database ID
              isAvailable: true,
              timestamp: date.toISOString(),
              data: cred.credential_string,
              claims: claims,
              expiration: cred.exp_date ? new Date(Number(cred.exp_date) * 1000).toISOString() : null
            };

            // Initialize array for this type if it doesn't exist
            if (!credentialsMap[credType]) {
              credentialsMap[credType] = [];
            }

            // Add this credential to the array for its type
            credentialsMap[credType].push(credentialObj);

            console.log(`Found credential of type: ${credType} with ID: ${cred.id}`);
          } else {
            console.log("Unidentified credential type, skipping");
          }
        } catch (parseError) {
          console.error("Error parsing credential:", parseError);
        }
      }

      console.log("Processed credential types:", Object.keys(credentialsMap));
      console.log("Total credentials found:", Object.values(credentialsMap).flat().length);
      setStoredCredentials(credentialsMap);
    } catch (error) {
      console.error('Error fetching credentials:', error);
      setError('Failed to fetch credentials. Please try again.');

      // Log the error
      try {
        await logService.createLog({
          transaction_type: 'credential_presentation',
          status: 'failed',
          details: `Error fetching credentials: ${error instanceof Error ? error.message : String(error)}`
        });
      } catch (logError) {
        console.error("Error logging credential fetch failure:", logError);
      }

      Alert.alert(
        'Error',
        'Failed to fetch credentials. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
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
      return () => { }; // cleanup function
    }, [fetchCredentials])
  );

  // Confirm credential deletion with ID
  const confirmDeleteCredential = (type: string, credentialId: string | number) => {
    // Close any open swipeable
    if (openSwipeable) {
      openSwipeable.close();
      setOpenSwipeable(null);
    }

    const credName = CREDENTIAL_NAMES[type] || type.toUpperCase().replace('_', ' ');

    Alert.alert(
      'Delete Credential',
      `Are you sure you want to delete your ${credName} credential? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCredential(type, credentialId)
        }
      ]
    );
  };

  // Delete credential implementation with ID
  const deleteCredential = async (type: string, credentialId: string | number) => {
    setLoading(true);

    try {
      const dbEncryptionKey = await getDbEncryptionKey();
      if (!dbEncryptionKey) {
        throw new Error("Failed to retrieve database encryption key");
      }

      const storage = new CredentialStorage(dbEncryptionKey);

      // Call the delete method with the ID
      const success = await storage.deleteCredentialById(credentialId);

      if (success) {
        // Remove from local state
        const updatedCredentials = { ...storedCredentials };

        if (updatedCredentials[type]) {
          updatedCredentials[type] = updatedCredentials[type].filter(cred => cred.id !== credentialId);

          // If no credentials of this type left, remove the type entirely
          if (updatedCredentials[type].length === 0) {
            delete updatedCredentials[type];
          }
        }

        setStoredCredentials(updatedCredentials);

        // Show success message
        Alert.alert(
          'Success',
          `${CREDENTIAL_NAMES[type] || type} credential has been deleted.`,
          [{ text: 'OK' }]
        );
      } else {
        throw new Error('Failed to delete credential');
      }
    } catch (error) {
      console.error('Error deleting credential:', error);

      // Log the error
      logService.createLog({
        transaction_type: 'error',
        status: 'failed',
        details: `Error deleting credential: ${error instanceof Error ? error.message : String(error)}`
      }).catch(err => console.error("Error logging credential deletion failure:", err));

      Alert.alert(
        'Error',
        'Failed to delete credential. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // View credential details with ID
  const viewCredentialDetails = (type: string, credentialId: string | number) => {
    try {
      // Find the specific credential by type and ID
      const credentialsOfType = storedCredentials[type] || [];
      const credential = credentialsOfType.find(cred => cred.id === credentialId);

      if (credential && credential.isAvailable) {
        // Log credential view action
        logService.createLog({
          transaction_type: 'credential_presentation',
          status: 'success',
          details: `Viewed credential details for ${CREDENTIAL_NAMES[type] || type}`
        }).catch(err => console.error("Error logging credential view:", err));

        // Get a readable name for the credential type
        const credName = CREDENTIAL_NAMES[type] || type.toUpperCase().replace('_', ' ');

        Alert.alert(
          `${credName}`,
          `Issued: ${new Date(credential.timestamp).toLocaleDateString()}\n${credential.expiration ? `Expires: ${new Date(credential.expiration).toLocaleDateString()}` : ''}\n`,
          [
            {
              text: 'View Claims',
              onPress: () => {
                // Set the selected credential for the modal
                setSelectedCredential(credential);
                setSelectedCredentialType(type);
                setClaimsModalVisible(true);
              }
            },
            // Removed the Delete option from here since it's now on the card
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

      // Log the error
      logService.createLog({
        transaction_type: 'error',
        status: 'failed',
        details: `Error viewing credential details: ${error instanceof Error ? error.message : String(error)}`
      }).catch(err => console.error("Error logging credential view failure:", err));

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

  // Helper function to render the claims items in a user-friendly format
  const renderClaimItem = (key, value, index, path = '') => {
    const currentPath = path ? `${path}.${key}` : key;
    const isExpanded = expandedPaths[currentPath];

    // Handle complex objects or arrays
    if (typeof value === 'object' && value !== null) {
      return (
        <View key={index}>
          <TouchableOpacity
            style={[styles.claimNestedItem, { backgroundColor: theme.card }]}
            onPress={() => toggleExpand(currentPath)}
          >
            <Text style={[styles.claimKey, { color: theme.primary }]}>{formatClaimKey(key)}</Text>
            <View style={styles.nestedValueContainer}>
              <Text style={[styles.claimNestedValue, { color: theme.textSecondary }]}>
                {Array.isArray(value) ? `Array (${value.length})` : 'Object'}
              </Text>
              <Ionicons
                name={isExpanded ? "chevron-down" : "chevron-forward"}
                size={16}
                color={theme.textSecondary}
              />
            </View>
          </TouchableOpacity>

          {isExpanded && (
            <View style={[styles.nestedContent, { borderLeftColor: theme.primary }]}>
              {Array.isArray(value) ? (
                // Render array items
                value.map((item, arrayIndex) => (
                  <View key={`${currentPath}-${arrayIndex}`} style={styles.arrayItem}>
                    {typeof item === 'object' && item !== null ? (
                      // If array item is an object, render its properties
                      <View>
                        <Text style={[styles.arrayItemIndex, { color: theme.primary }]}>
                          Item {arrayIndex + 1}
                        </Text>
                        {Object.entries(item).map(([itemKey, itemValue], itemIndex) =>
                          renderClaimItem(itemKey, itemValue, `${currentPath}-${arrayIndex}-${itemIndex}`, `${currentPath}[${arrayIndex}]`)
                        )}
                      </View>
                    ) : (
                      // If array item is a primitive value
                      <View style={[styles.simpleArrayItem, { backgroundColor: theme.card }]}>
                        <Text style={[styles.arrayItemIndex, { color: theme.primary }]}>
                          Item {arrayIndex + 1}
                        </Text>
                        <Text style={[styles.claimValue, { color: theme.text }]}>
                          {formatClaimValue(item)}
                        </Text>
                      </View>
                    )}
                  </View>
                ))
              ) : (
                // Render object properties
                Object.entries(value).map(([subKey, subValue], subIndex) =>
                  renderClaimItem(subKey, subValue, `${currentPath}-${subIndex}`, currentPath)
                )
              )}
            </View>
          )}
        </View>
      );
    }

    // For simple values, display directly
    return (
      <View key={index} style={[styles.claimItem, { backgroundColor: theme.card }]}>
        <Text style={[styles.claimKey, { color: theme.primary }]}>{formatClaimKey(key)}</Text>
        <Text style={[styles.claimValue, { color: theme.text }]}>
          {formatClaimValue(value)}
        </Text>
      </View>
    );
  };

  // Format a claim key to make it more readable
  const formatClaimKey = (key) => {
    // Special case formatting for common credential fields
    const specialFormats = {
      'given_name': 'Given Name',
      'family_name': 'Family Name',
      'msisdn': 'Mobile Number',
      'iban': 'Bank Account (IBAN)',
      'cnf': 'Confirmation',
      'status': 'Status',
      'place_of_birth': 'Place of Birth',
      'nationalities': 'Nationalities',
      'age_over_18': 'Age Over 18',
      'over18': 'Over 18',
      'tax_id': 'Tax ID',
      'birthdate': 'Date of Birth',
      'gender': 'Gender',
      'ehic_number': 'Health Insurance Number',
      'health_id_number': 'Health ID',
      'pda1_number': 'Driver\'s License',
      'por_address': 'Address'
    };

    // Use special format if available
    if (specialFormats[key]) {
      return specialFormats[key];
    }

    // Convert snake_case or camelCase to Title Case with spaces
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^\w/, c => c.toUpperCase()) // Capitalize first letter
      .trim();
  };

  // Format a claim value to make it more readable
  const formatClaimValue = (value) => {
    if (value === null || value === undefined) return 'N/A';

    // Boolean values
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';

    // Date strings
    if (typeof value === 'string') {
      // Check for ISO date format
      if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString();
          }
        } catch (e) {
          // If date parsing fails, continue to other formats
        }
      }

      // Check for timestamp (seconds)
      if (/^\d{10}$/.test(value)) {
        try {
          const date = new Date(parseInt(value) * 1000);
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString();
          }
        } catch (e) {
          // If timestamp parsing fails, continue
        }
      }

      // Check for timestamp (milliseconds)
      if (/^\d{13}$/.test(value)) {
        try {
          const date = new Date(parseInt(value));
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString();
          }
        } catch (e) {
          // If timestamp parsing fails, return the original string
        }
      }
    }

    return String(value);
  };

  // Organize claims into categories for better display
  interface ClaimItem {
    key: string;
    value: unknown;
    index: string | number;
  }

  interface Claims {
    [key: string]: unknown;
    given_name?: string;
    family_name?: string;
    birthdate?: string;
    place_of_birth?: string;
    nationalities?: string | string[];
    gender?: string;
    age_over_18?: boolean;
    over18?: boolean;
    msisdn?: string;
    phone_number?: string;
    phoneNumber?: string;
    iban?: string;
    account_number?: string;
    bankAccount?: string;
    tax_id?: string;
    taxNumber?: string;
    vct?: string;
    vc?: unknown;
    _sd?: unknown;
    _sd_alg?: string;
    iss?: string;
    exp?: number;
    iat?: number;
    jti?: string;
  }

  const organizeClaimsForDisplay = (claims: Claims | null): ClaimItem[] => {
    if (!claims) return [];

    const displayItems: ClaimItem[] = [];

    // First add common important fields that should appear at the top
    const priorityFields: Array<keyof Claims> = [
      'given_name', 'family_name', 'birthdate', 'place_of_birth',
      'nationalities', 'gender', 'age_over_18', 'over18',
      'msisdn', 'phone_number', 'phoneNumber',
      'iban', 'account_number', 'bankAccount',
      'tax_id', 'taxNumber'
    ];

    // First pass: Add priority fields in order
    priorityFields.forEach(field => {
      if (field in claims) {
        displayItems.push({
          key: field,
          value: claims[field],
          index: `priority-${field}`
        });
      }
    });

    // Second pass: Add remaining fields
    Object.entries(claims).forEach(([key, value], index) => {
      // Skip fields that are already added or should be hidden
      if (priorityFields.includes(key as keyof Claims) ||
        ['vct', 'vc', '_sd', '_sd_alg', 'iss', 'exp', 'iat', 'jti'].includes(key)) {
        return;
      }

      displayItems.push({ key, value, index });
    });

    return displayItems;
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
                  <Text style={[styles.retryButtonText, { color: theme.text }]}>Retry</Text>
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
                  <>
                    {/* Swipe instruction banner */}
                    <View style={[styles.instructionContainer, { backgroundColor: theme.darker }]}>
                      <Ionicons name="swap-horizontal" size={20} color={theme.textSecondary} />
                      <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
                        Swipe left on a credential to delete it
                      </Text>
                    </View>

                    <ScrollView
                      style={styles.cardsScrollView}
                      contentContainerStyle={styles.cardsContainer}
                      showsVerticalScrollIndicator={false}
                    >
                      {/* Use flatMap to render all credentials from all types */}
                      {Object.entries(storedCredentials).flatMap(([type, credentials]) =>
                        credentials.map((credential) => {
                          if (!credential || !credential.isAvailable) return null;

                          // Generate a unique key for this credential
                          const credKey = `${type}-${credential.id}`;

                          return (
                            <Animatable.View
                              key={credKey}
                              animation="fadeInUp"
                              duration={600}
                              delay={200}
                            >
                              <Swipeable
                                renderRightActions={() => renderRightActions(type, credential.id)}
                                onSwipeableOpen={() => {
                                  const swipeable = swipeableRefs.current[credKey];
                                  if (swipeable) {
                                    onSwipeableOpen(swipeable);
                                  }
                                }}
                                ref={(ref) => {
                                  if (ref) {
                                    swipeableRefs.current[credKey] = ref;
                                  }
                                }}
                              >
                                <CredentialCard
                                  type={type}
                                  isAvailable={true}
                                  timestamp={credential.timestamp}
                                  onPress={() => viewCredentialDetails(type, credential.id)}
                                  onDelete={() => confirmDeleteCredential(type, credential.id)}
                                  theme={theme}
                                />
                              </Swipeable>
                            </Animatable.View>
                          );
                        })
                      )}

                      <View style={[styles.infoContainer, { backgroundColor: theme.darker }]}>
                        <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
                        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                          Tap on a credential to expand and view details
                        </Text>
                      </View>
                    </ScrollView>
                  </>
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
                      <Text style={[styles.emptyStateButtonText, { color: theme.text }]}>
                        Refresh
                      </Text>
                    </TouchableOpacity>
                  </Animatable.View>
                )}
              </View>
            )}
          </Animatable.View>
        </View>

        {/* Claims Viewing Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={claimsModalVisible}
          onRequestClose={() => {
            setClaimsModalVisible(false);
            setExpandedPaths({}); // Reset expanded paths when closing modal
          }}
        >
          <View style={styles.modalContainer}>
            <Animatable.View
              animation="fadeInUp"
              duration={300}
              style={[styles.modalContent, { backgroundColor: theme.dark }]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {selectedCredentialType ? CREDENTIAL_NAMES[selectedCredentialType] : 'Credential'} Claims
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    setClaimsModalVisible(false);
                    setExpandedPaths({}); // Reset expanded paths when closing modal
                  }}
                >
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              {selectedCredential && (
                <ScrollView
                  style={styles.claimsScrollView}
                  contentContainerStyle={styles.claimsContainer}
                  showsVerticalScrollIndicator={true}
                >
                  {/* Credential metadata section */}
                  <View style={styles.credentialMetaSection}>
                    <View style={[styles.metadataCard, { backgroundColor: theme.darker }]}>
                      <View style={styles.metadataRow}>
                        <Ionicons name="card-outline" size={18} color={theme.primary} />
                        <Text style={[styles.metadataLabel, { color: theme.textSecondary }]}>Type:</Text>
                        <Text style={[styles.metadataValue, { color: theme.text }]}>
                          {selectedCredentialType && CREDENTIAL_NAMES[selectedCredentialType] || 'Unknown'}
                        </Text>
                      </View>

                      <View style={styles.metadataRow}>
                        <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                        <Text style={[styles.metadataLabel, { color: theme.textSecondary }]}>Issued:</Text>
                        <Text style={[styles.metadataValue, { color: theme.text }]}>
                          {new Date(selectedCredential.timestamp).toLocaleDateString()}
                        </Text>
                      </View>

                      {selectedCredential.expiration && (
                        <View style={styles.metadataRow}>
                          <Ionicons name="time-outline" size={18} color={theme.primary} />
                          <Text style={[styles.metadataLabel, { color: theme.textSecondary }]}>Expires:</Text>
                          <Text style={[styles.metadataValue, { color: theme.text }]}>
                            {new Date(selectedCredential.expiration).toLocaleDateString()}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Claims section */}
                  <View style={styles.sectionHeaderContainer}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                      Credential Information
                    </Text>

                    {Object.keys(expandedPaths).length > 0 && (
                      <TouchableOpacity
                        style={styles.collapseAllButton}
                        onPress={() => setExpandedPaths({})}
                      >
                        <Text style={{ color: theme.primary, fontFamily: 'Poppins-Medium', fontSize: 12 }}>
                          Collapse All
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {organizeClaimsForDisplay(selectedCredential.claims).map(({ key, value, index }) =>
                    renderClaimItem(key, value, index)
                  )}

                  {/* Empty state for no claims */}
                  {organizeClaimsForDisplay(selectedCredential.claims).length === 0 && (
                    <View style={[styles.emptyClaimsContainer, { backgroundColor: theme.darker }]}>
                      <Ionicons name="document-text-outline" size={32} color={theme.textSecondary} />
                      <Text style={[styles.emptyClaimsText, { color: theme.textSecondary }]}>
                        No readable claims found in this credential
                      </Text>
                    </View>
                  )}
                </ScrollView>
              )}

              <TouchableOpacity
                style={[styles.closeModalButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  setClaimsModalVisible(false);
                  setExpandedPaths({});
                }}
              >
                <Text style={[styles.closeModalButtonText, { color: theme.text }]}>Close</Text>
              </TouchableOpacity>
            </Animatable.View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
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
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  collapseAllButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.3)',
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
  // Swipe instruction banner
  instructionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  instructionText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginLeft: 8,
  },
  // Swipe delete action styles
  deleteAction: {
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: '100%',
    borderRadius: 16,
    marginLeft: 8,
  },
  deleteActionText: {
    color: 'white',
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    marginTop: 4,
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
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 24,
    minHeight: '80%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  modalTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
  },
  closeButton: {
    padding: 8,
  },
  closeModalButton: {
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 16,
  },
  closeModalButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
  },

  // Claims styles
  claimsScrollView: {
    flex: 1,
    marginTop: 16,
  },
  claimsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  credentialMetaSection: {
    marginBottom: 16,
  },
  metadataCard: {
    borderRadius: 12,
    padding: 16,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metadataLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    marginLeft: 8,
    marginRight: 8,
  },
  metadataValue: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    flex: 1,
  },
  claimItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  claimNestedItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  claimKey: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    marginBottom: 4,
  },
  claimValue: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  nestedValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  claimNestedValue: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginRight: 4,
  },
  emptyClaimsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyClaimsText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },

  // Nested content styles
  nestedContent: {
    paddingLeft: 16,
    marginLeft: 8,
    marginBottom: 8,
    borderLeftWidth: 2,
  },
  arrayItem: {
    marginTop: 8,
    marginBottom: 4,
  },
  arrayItemIndex: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    marginBottom: 4,
    marginLeft: 4,
  },
  simpleArrayItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  }
});