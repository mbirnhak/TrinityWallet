import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal,
  Platform,
  SafeAreaView,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
// Import Barcode from the expo-barcode-generator library
import { Barcode } from 'expo-barcode-generator';



// Import services for credential retrieval
import { CredentialStorage } from '@/services/credentialStorage';
import { getDbEncryptionKey } from '@/services/Utils/crypto';
import { createSdJwt } from '@/services/Credentials/SdJwtVc';

const LibraryRental = () => {
  const { theme, isDarkMode } = useTheme();
  const [showBarcode, setShowBarcode] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [issuanceDate, setIssuanceDate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to retrieve student credential and extract student ID
  const fetchStudentCredential = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get database encryption key
      const dbEncryptionKey = await getDbEncryptionKey();
      
      // Initialize credential storage
      const storage = new CredentialStorage(dbEncryptionKey);
      
      // Retrieve student credential using the JSON path for vct
      const credential_string = await storage.retrieveCredentialByJsonPathValue('$.vct', 'trin.coll.student_id_sd_jwt_vc');
      
      if (!credential_string) {
        setError('No student credential found. Please make sure you have a student credential in your wallet.');
        setLoading(false);
        return;
      }
      
      // Parse the credential to extract student ID
      const sdJwt = await createSdJwt();
      const claims = await sdJwt.getClaims(credential_string);
      
      if (!claims || !claims.studentId) {
        setError('Student ID not found in credential.');
        setLoading(false);
        return;
      }
      
      // Set the student ID for display
      setStudentId(claims.studentId);
      
      // Store issuance date (iat) if available
      if (claims.iat) {
        // Convert Unix timestamp to Date object
        setIssuanceDate(new Date(claims.iat * 1000));
      }
      
    } catch (error) {
      console.error('Error fetching student credential:', error);
      setError('Failed to retrieve student credential. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load student credential on component mount
  useEffect(() => {
    fetchStudentCredential();
  }, [fetchStudentCredential]);

  // Function to reset modal state
  const resetModal = () => {
    setShowBarcode(false);
  };

  // Function to show barcode
  const handleShowBarcode = () => {
    setShowBarcode(true);
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.dark }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading student credentials...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.dark }]}>
        <View style={[styles.header, { backgroundColor: theme.dark, borderBottomColor: theme.border }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Library Access</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={50} color="#D32F2F" />
          <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={fetchStudentCredential}
          >
            <Text style={[styles.retryButtonText, { color: theme.text }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.container, { backgroundColor: theme.dark }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.dark, borderBottomColor: theme.border }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Library Rental</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Main Content */}
        <Animatable.View animation="fadeIn" duration={800} style={styles.content}>
          <View style={styles.mainContent}>
            <Text style={[styles.title, { color: theme.text }]}>Library Book Rental</Text>
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              Present your Trinity Library membership to the librarian to borrow a book.
            </Text>

            {/* Credential Card */}
            <LinearGradient
              colors={[theme.surface, theme.darker]}
              style={[styles.credentialCard, { borderColor: theme.border }]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.logoContainer, { backgroundColor: theme.primary + '20' }]}>
                  <Ionicons name="library" size={24} color={theme.primary} />
                </View>
                <View style={styles.cardTitleContainer}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>Trinity College Library</Text>
                  <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>Membership</Text>
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Member ID</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{studentId}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#30D15820' }]}>
                    <Text style={[styles.statusText, { color: '#30D158' }]}>Active</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Issuance Date</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {issuanceDate ? new Date(issuanceDate).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            {/* Present Membership Button */}
            <TouchableOpacity
              style={[styles.presentButton, { backgroundColor: theme.primary }]}
              onPress={handleShowBarcode}
            >
              <Ionicons name="barcode-outline" size={20} color={theme.text} style={styles.buttonIcon} />
              <Text style={[styles.buttonText, { color: theme.text }]}>Use for Library Access</Text>
            </TouchableOpacity>

            <View style={[styles.infoBox, { backgroundColor: theme.darker }]}>
              <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                Show the barcode below to the librarian to verify your library membership.
              </Text>
            </View>
          </View>
        </Animatable.View>

        {/* Barcode Modal */}
        <Modal
          visible={showBarcode}
          transparent={true}
          animationType="slide"
          onRequestClose={resetModal}
        >
          <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: theme.dark }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Your Membership Barcode</Text>
                <TouchableOpacity onPress={resetModal}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.barcodeContainer}>
                {/* Student ID barcode using real credentials */}
                {studentId && (
                  <Barcode
                    value={String(studentId)}
                    options={{ format: 'CODE39', background: '#fff', lineColor: '#000' }}
                  />
                )}
              </View>

              <TouchableOpacity 
                style={[styles.doneButton, { backgroundColor: theme.primary }]}
                onPress={resetModal}
              >
                <Text style={[styles.doneButtonText, { color: theme.text }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingTop: Platform.OS === 'ios' ? 10 : 40, 
    paddingBottom: 16, 
    borderBottomWidth: 1, 
  },
  backButton: { 
    padding: 4 
  },
  headerTitle: { 
    fontFamily: 'Poppins-Bold', 
    fontSize: 18 
  },
  content: { 
    flex: 1 
  },
  mainContent: { 
    padding: 20 
  },
  title: { 
    fontFamily: 'Poppins-Bold', 
    fontSize: 26, 
    marginBottom: 10 
  },
  description: { 
    fontFamily: 'Poppins-Regular', 
    fontSize: 16, 
    marginBottom: 24, 
    lineHeight: 22 
  },
  credentialCard: { 
    borderRadius: 16, 
    borderWidth: 1, 
    padding: 16, 
    marginBottom: 24 
  },
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  logoContainer: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  cardTitleContainer: { 
    flex: 1 
  },
  cardTitle: { 
    fontFamily: 'Poppins-Bold', 
    fontSize: 18, 
    marginBottom: 4 
  },
  cardSubtitle: { 
    fontFamily: 'Poppins-Regular', 
    fontSize: 14 
  },
  divider: { 
    height: 1, 
    width: '100%', 
    marginBottom: 16 
  },
  cardDetails: { 
    gap: 12 
  },
  detailRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  detailLabel: { 
    fontFamily: 'Poppins-Medium', 
    fontSize: 14 
  },
  detailValue: { 
    fontFamily: 'Poppins-Medium', 
    fontSize: 14 
  },
  statusBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  statusText: { 
    fontFamily: 'Poppins-Medium', 
    fontSize: 12 
  },
  presentButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 24 
  },
  buttonIcon: { 
    marginRight: 8 
  },
  buttonText: { 
    fontFamily: 'Poppins-Bold', 
    fontSize: 16 
  },
  infoBox: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    padding: 16, 
    borderRadius: 12 
  },
  infoText: { 
    fontFamily: 'Poppins-Regular', 
    fontSize: 14, 
    marginLeft: 10, 
    flex: 1, 
    lineHeight: 20 
  },
  modalContainer: { 
    flex: 1, 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    paddingHorizontal: 20, 
    paddingTop: 20, 
    paddingBottom: Platform.OS === 'ios' ? 40 : 20, 
    height: '75%' 
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  modalTitle: { 
    fontFamily: 'Poppins-Bold', 
    fontSize: 20 
  },
  barcodeContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  doneButton: { 
    paddingVertical: 14, 
    borderRadius: 16, 
    alignItems: 'center' 
  },
  doneButtonText: { 
    fontFamily: 'Poppins-Bold', 
    fontSize: 16 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 30,
  },
  retryButtonText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
  },
});

export default LibraryRental;