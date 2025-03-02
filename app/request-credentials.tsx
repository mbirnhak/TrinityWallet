import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { router } from 'expo-router';
import { theme } from './(app)/_layout';
import { requestCredential } from '../services/Transactions/credentialIssuance';

export default function RequestCredentials() {
  const [selectedCredentials, setSelectedCredentials] = useState({});
  const [loading, setLoading] = useState(false);

  const credentials = [
    { 
      id: 'pid_sdjwt', 
      name: 'PID (SD-JWT)', 
      description: 'Personal Identity Document using SD-JWT format',
      icon: 'person-outline',
      color: theme.primary
    },
    { 
      id: 'pid_mdoc', 
      name: 'PID (mDOC)', 
      description: 'Personal Identity Document using mDOC format', 
      icon: 'card-outline',
      color: '#FF9500' // Apple's orange
    },
    { 
      id: 'trinity_library', 
      name: 'Trinity Library', 
      description: 'Library access and book issuance credential',
      icon: 'library-outline',
      color: '#5E5CE6' // Apple's purple
    },
    { 
      id: 'trinity_door', 
      name: 'Trinity Door Lock', 
      description: 'Electronic door access for campus buildings',
      icon: 'key-outline',
      color: '#FF2D55' // Apple's pink
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

    try {
      setLoading(true);
      // For now, using the existing credential request function
      await requestCredential();
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
        style={[styles.credentialCard, isSelected && styles.selectedCard]}
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
              <Text style={styles.credentialName}>{credential.name}</Text>
              <Text style={styles.credentialDescription}>{credential.description}</Text>
            </View>
            
            <View style={styles.checkboxContainer}>
              <View style={[
                styles.checkbox, 
                isSelected ? { backgroundColor: theme.primary } : { borderColor: theme.border }
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Credentials</Text>
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
          <Text style={styles.sectionTitle}>Select Credentials</Text>
          <Text style={styles.instructionText}>
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

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.requestButton}
          onPress={handleRequestCredentials}
          disabled={loading}
        >
          <LinearGradient
            colors={[theme.primary, theme.primaryDark]}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>
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
    color: theme.text,
  },
  credentialDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: theme.textSecondary,
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
    borderTopColor: theme.border,
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
    color: theme.text,
  }
});