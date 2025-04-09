import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { requestCredential } from '../../services/Transactions/credentialIssuance';

export default function RequestCredentials() {
  const { theme, isDarkMode } = useTheme();
  const [selectedCredentials, setSelectedCredentials] = useState({});
  const [loading, setLoading] = useState(false);

  const credentials = [
    { 
      id: 'eu.europa.ec.eudi.pid_jwt_vc_json', 
      name: 'PID Test', 
      description: 'Personal Identity Document using SD-JWT format',
      icon: 'person-outline',
      color: theme.primary
    },
    { 
      id: 'eu.europa.ec.eudi.msisdn_sd_jwt_vc', 
      name: 'MSISDN', 
      description: 'Mobile Subscriber ISDN Number using SD-JWT format', 
      icon: 'call-outline',
      color: '#FF9500' // Apple's orange
    },
    { 
      id: 'eu.europa.ec.eudi.ehic_sd_jwt_vc', 
      name: 'EHIC', 
      description: 'European Health Insurance Card using SD-JWT format',
      icon: 'medical-outline',
      color: '#5E5CE6' // Apple's purple
    },
    { 
      id: 'eu.europa.ec.eudi.pseudonym_over18_sd_jwt_vc', 
      name: 'Age over 18 Pseudonym', 
      description: 'Age verification pseudonym using SD-JWT format',
      icon: 'calendar-outline',
      color: '#FF2D55' // Apple's pink
    },
    { 
      id: 'eu.europa.ec.eudi.iban_sd_jwt_vc', 
      name: 'IBAN', 
      description: 'International Bank Account Number using SD-JWT format',
      icon: 'card-outline',
      color: '#30B0C7' // Light blue
    },
    { 
      id: 'eu.europa.ec.eudi.hiid_sd_jwt_vc', 
      name: 'Health ID', 
      description: 'Health Insurance ID using SD-JWT format',
      icon: 'fitness-outline',
      color: '#34C759' // Apple's green
    },
    { 
      id: 'eu.europa.ec.eudi.tax_sd_jwt_vc', 
      name: 'Tax Number', 
      description: 'Tax identification number using SD-JWT format',
      icon: 'receipt-outline',
      color: '#AF52DE' // Purple
    }
  ];

  const toggleCredentialSelection = (credentialId) => {
    setSelectedCredentials(prev => ({
      ...prev,
      [credentialId]: !prev[credentialId]
    }));
  };

  const handleRequestCredentials = async () => {
    const selectedCount = Object.values(selectedCredentials).filter(Boolean).length;
    
    if (selectedCount === 0) {
      Alert.alert('No Selection', 'Please select at least one credential to request');
      return;
    }

    // Get array of selected credential IDs
    const selectedCredentialIds = Object.keys(selectedCredentials).filter(id => selectedCredentials[id]);

    try {
      setLoading(true);
      // Pass the selected credential IDs to the request function
      const response = await requestCredential(selectedCredentialIds);
      if (response === 'Error') {
        Alert.alert('Error', 'Failed to request credentials. Please try again later.');
        return;
      }
      Alert.alert(
        'Success', 
        'Your credential request has been submitted successfully',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error requesting credentials:', error);
      Alert.alert(
        'Error',
        'Failed to request credentials. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const CredentialCard = ({ credential }) => {
    const isSelected = !!selectedCredentials[credential.id];
    
    return (
      <TouchableOpacity
        style={[
          styles.credentialCard, 
          { borderColor: isSelected ? theme.primary : theme.border },
          isSelected && styles.selectedCard
        ]}
        onPress={() => toggleCredentialSelection(credential.id)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[theme.surface, theme.darker]}
          style={styles.cardGradient}
        >
          <View style={styles.cardContent}>
            <View style={[styles.iconContainer, { backgroundColor: credential.color + '20' }]}>
              <Ionicons name={credential.icon} size={24} color={credential.color} />
            </View>
            
            <View style={styles.cardTextContainer}>
              <Text style={[styles.credentialName, { color: theme.text }]}>{credential.name}</Text>
              <Text style={[styles.credentialDescription, { color: theme.textSecondary }]}>{credential.description}</Text>
            </View>
            
            <View style={styles.checkboxContainer}>
              <View style={[
                styles.checkbox, 
                isSelected ? 
                  { backgroundColor: theme.primary } : 
                  { borderColor: theme.border, backgroundColor: 'transparent' }
              ]}>
                {isSelected && <Ionicons name="checkmark" size={16} color={theme.text} />}
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
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Request Credentials</Text>
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
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Credentials</Text>
          <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
            Choose the credentials you would like to request. You can select multiple credentials.
          </Text>

          <View style={styles.credentialsContainer}>
            {credentials.map(credential => (
              <CredentialCard 
                key={credential.id} 
                credential={credential} 
              />
            ))}
          </View>
        </Animatable.View>
      </ScrollView>

      <View style={[styles.bottomContainer, { 
        borderTopColor: theme.border,
        backgroundColor: theme.dark
      }]}>
        <TouchableOpacity
          style={styles.requestButton}
          onPress={handleRequestCredentials}
          disabled={loading}
        >
          <LinearGradient
            colors={[theme.primary, theme.primaryDark]}
            style={styles.buttonGradient}
          >
            <Text style={[styles.buttonText, { color: theme.text }]}>
              {loading ? 'Requesting...' : 'Request Selected Credentials'}
            </Text>
            {!loading && <Ionicons name="arrow-forward" size={20} color={theme.text} />}
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
  checkboxContainer: {
    padding: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomContainer: {
    padding: 20,
    borderTopWidth: 1,
  },
  requestButton: {
    borderRadius: 16,
    overflow: 'hidden',
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