import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
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
  const { theme, isDarkMode } = useTheme();
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
  }, [theme]);

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
          { borderColor: theme.border },
          isSelected && [styles.selectedCard, { borderColor: theme.primary }],
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
                { color: theme.text },
                !credential.available && { color: theme.textSecondary }
              ]}>
                {credential.name}
              </Text>
              <Text style={[styles.credentialDescription, { color: theme.textSecondary }]}>
                {credential.description}
              </Text>
              <Text style={[styles.issueDate, { color: theme.textSecondary }]}>
                {credential.available ? formatDate(credential.timestamp) : 'Not issued'}
              </Text>
            </View>
            
            <View style={styles.radioContainer}>
              <View style={[
                styles.radioOuter, 
                { borderColor: theme.border },
                isSelected && { borderColor: theme.primary },
                !credential.available && { borderColor: theme.textSecondary, opacity: 0.5 }
              ]}>
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
      <View style={[styles.header, { 
        backgroundColor: theme.dark, 
        borderBottomColor: theme.border 
      }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Present Credentials</Text>
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
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Select a Credential</Text>
          <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
            Choose the credential you would like to present. Only one credential can be presented at a time.
          </Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading credentials...</Text>
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

          <View style={[styles.infoContainer, { backgroundColor: theme.darker }]}>
            <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              Unavailable credentials need to be requested before they can be presented
            </Text>
          </View>
        </Animatable.View>
      </ScrollView>

      <View style={[styles.bottomContainer, { 
        borderTopColor: theme.border,
        backgroundColor: theme.dark
      }]}>
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
            <Text style={[styles.buttonText, { color: theme.text }]}>Present Credential</Text>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
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
    marginBottom: 8,
  },
  instructionText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginBottom: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  loadingText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
  },
  credentialsContainer: {
    gap: 16,
  },
  credentialCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  selectedCard: {
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
  },
  credentialDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    marginTop: 2,
  },
  issueDate: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  infoText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  bottomContainer: {
    padding: 20,
    borderTopWidth: 1,
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
  }
});