import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { theme } from './_layout';
import { CredentialStorage, StoredCredential } from '../../services/credentialStorageTemp';

interface Credential {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  available: boolean;
  timestamp: number | undefined;
}

type IconiconsProps = React.ComponentProps<typeof Ionicons>;

export default function PresentCredentials() {
  const [selectedCredential, setSelectedCredential] = useState<string | null>(null);
  const [availableCredentials, setAvailableCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCredentialAvailability = async () => {
      try {
        const metadata = await CredentialStorage.getMetadata();
        
        // Prepare credentials based on available types
        const credentials: Credential[] = [
          { 
            id: 'pid_sdjwt', 
            type: 'jwt_vc',
            name: 'PID (SD-JWT)', 
            description: 'Present your personal identity',
            icon: 'person-outline',
            color: theme.primary,
            available: !!metadata?.jwt_vc,
            timestamp: metadata?.timestamp
          },
          { 
            id: 'pid_mdoc', 
            type: 'mdoc',
            name: 'PID (mDOC)', 
            description: 'Present your personal identity (mDOC format)', 
            icon: 'card-outline',
            color: '#FF9500', // Apple's orange
            available: !!metadata?.mdoc,
            timestamp: metadata?.timestamp
          },
          { 
            id: 'trinity_library', 
            type: 'jwt_vc',
            name: 'Trinity Library', 
            description: 'Access library services',
            icon: 'library-outline',
            color: '#5E5CE6', // Apple's purple
            available: !!metadata?.jwt_vc, // Same as PID for now
            timestamp: metadata?.timestamp
          }
        ];
        
        setAvailableCredentials(credentials);
      } catch (error) {
        console.error('Error fetching credential availability:', error);
        Alert.alert(
          'Error',
          'Failed to fetch credential information. Please try again.',
          [{ text: 'OK' }]
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCredentialAvailability();
  }, []);

  const handleCredentialSelection = (credential: Credential) => {
    if (!credential.available) {
      Alert.alert(
        'Credential Unavailable',
        `The ${credential.name} credential is not available. Please request it first.`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    setSelectedCredential(credential.id === selectedCredential ? null : credential.id);
  };

  const handlePresentCredential = () => {
    if (!selectedCredential) {
      Alert.alert('No Selection', 'Please select a credential to present');
      return;
    }

    // This is a placeholder for the actual credential presentation functionality
    Alert.alert(
      'Present Credential',
      'This feature will be implemented in a future update.',
      [{ text: 'OK' }]
    );
  };

  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return 'Not issued';
    
    const date = new Date(timestamp);
    return `Issued: ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  };

  interface CredentialProps {
    credential: Credential;
  }

  const CredentialCard = ({ credential }: CredentialProps) => {
    const isSelected = selectedCredential === credential.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.credentialCard, 
          isSelected && styles.selectedCard,
          !credential.available && styles.unavailableCard
        ]}
        onPress={() => handleCredentialSelection(credential)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[theme.surface, theme.darker]}
          style={styles.cardGradient}
        >
          <View style={styles.cardContent}>
            <View style={[
              styles.iconContainer, 
              { backgroundColor: credential.color + '20' },
              !credential.available && styles.disabledIcon
            ]}>
              <Ionicons 
                name={credential.icon as IconiconsProps['name']} 
                size={24} 
                color={credential.available ? credential.color : theme.textSecondary} 
              />
            </View>
            
            <View style={styles.cardTextContainer}>
              <Text style={[
                styles.credentialName,
                !credential.available && styles.disabledText
              ]}>
                {credential.name}
              </Text>
              <Text style={styles.credentialDescription}>
                {credential.description}
              </Text>
              <Text style={styles.issueDate}>
                {credential.available ? formatDate(credential.timestamp) : 'Not issued'}
              </Text>
            </View>
            
            <View style={styles.radioContainer}>
              <View style={[
                styles.radioOuter, 
                isSelected && styles.radioOuterSelected,
                !credential.available && styles.radioOuterDisabled
              ]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Present Credentials</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animatable.View 
          animation="fadeIn" 
          duration={800} 
          style={styles.contentContainer}
        >
          <Text style={styles.sectionTitle}>Select a Credential</Text>
          <Text style={styles.instructionText}>
            Choose the credential you would like to present. Only one credential can be presented at a time.
          </Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading credentials...</Text>
            </View>
          ) : (
            <View style={styles.credentialsContainer}>
              {availableCredentials.map(credential => (
                <CredentialCard 
                  key={credential.id} 
                  credential={credential} 
                />
              ))}
            </View>
          )}

          <View style={styles.infoContainer}>
            <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
            <Text style={styles.infoText}>
              Unavailable credentials need to be requested before they can be presented
            </Text>
          </View>
        </Animatable.View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.presentButton,
            !selectedCredential && styles.disabledButton
          ]}
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
            <Text style={styles.buttonText}>Present Credential</Text>
            <Ionicons name="arrow-forward" size={20} color={theme.text} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.dark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.dark,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: theme.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  contentContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: theme.text,
    marginBottom: 8,
  },
  instructionText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  loadingText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: theme.textSecondary,
  },
  credentialsContainer: {
    gap: 16,
  },
  credentialCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.border,
  },
  selectedCard: {
    borderColor: theme.primary,
    borderWidth: 2,
  },
  unavailableCard: {
    opacity: 0.7,
  },
  cardGradient: {
    borderRadius: 15,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  disabledIcon: {
    opacity: 0.5,
  },
  cardTextContainer: {
    flex: 1,
  },
  credentialName: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    color: theme.text,
  },
  disabledText: {
    color: theme.textSecondary,
  },
  credentialDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 2,
  },
  issueDate: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  radioContainer: {
    padding: 4,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: theme.primary,
  },
  radioOuterDisabled: {
    borderColor: theme.textSecondary,
    opacity: 0.5,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.primary,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.darker,
    padding: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  infoText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: theme.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  bottomContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  presentButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
  },
  buttonText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    color: theme.text,
  }
});