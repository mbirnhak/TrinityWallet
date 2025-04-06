import { 
    View, 
    StyleSheet, 
    Text, 
    TouchableOpacity, 
    Modal,
    Platform,
    SafeAreaView,
    StatusBar,
    Image,
  } from 'react-native';
  import * as Animatable from 'react-native-animatable';
  import { LinearGradient } from 'expo-linear-gradient';
  import { Ionicons } from '@expo/vector-icons';
  import { useState, useEffect } from 'react';
  import { router, Stack } from 'expo-router';
  import { useTheme } from '@/context/ThemeContext';
  
  // Mock library credential - in a real app, this would come from your credentials store
  const libraryCredential = {
    id: 'cred-lib-123',
    type: 'LibraryMembership',
    issuer: 'Trinity College Library',
    issuanceDate: '2024-09-01T10:30:45Z',
    expirationDate: '2025-09-01T10:30:45Z',
    credentialSubject: {
      id: 'user123',
      name: 'Shivanshu Dwivedi',
      membershipId: 'TCL-2024-7890',
      status: 'active',
      borrowingPrivilege: 'extended',
      maxBooksAllowed: 10
    }
  };
  
  const LibraryRental = () => {
    const { theme, isDarkMode } = useTheme();
    const [showQRCode, setShowQRCode] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState(null);
  
    // Simulate verification process
    useEffect(() => {
      if (showQRCode && !verificationStatus) {
        setVerificationStatus('pending');
        
        // Simulate a verification process happening
        const simulateVerification = setTimeout(() => {
          // 80% chance of success for demo purposes
          const success = Math.random() > 0.2;
          setVerificationStatus(success ? 'success' : 'failed');
        }, 5000);
        
        return () => clearTimeout(simulateVerification);
      }
    }, [showQRCode, verificationStatus]);
  
    // Reset the flow
    const resetFlow = () => {
      setVerificationStatus(null);
      setShowQRCode(false);
    };
  
    return (
      <>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={[styles.container, { backgroundColor: theme.dark }]}>
          {/* Header with back button */}
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
            <Text style={[styles.headerTitle, { color: theme.text }]}>Library Rental</Text>
            <View style={{ width: 24 }} />
          </View>
  
          <Animatable.View 
            animation="fadeIn" 
            duration={800} 
            style={styles.content}
          >
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
                    <Text style={[styles.cardTitle, { color: theme.text }]}>
                      Trinity College Library
                    </Text>
                    <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                      Membership
                    </Text>
                  </View>
                </View>
  
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
  
                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Member ID</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                      {libraryCredential.credentialSubject.membershipId}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Status</Text>
                    <View style={[styles.statusBadge, { backgroundColor: '#30D158' + '20' }]}>
                      <Text style={[styles.statusText, { color: '#30D158' }]}>Active</Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Expires</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                      {new Date(libraryCredential.expirationDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Books Allowed</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                      {libraryCredential.credentialSubject.maxBooksAllowed}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
  
              {/* Present Button */}
              <TouchableOpacity
                style={[styles.presentButton, { backgroundColor: theme.primary }]}
                onPress={() => setShowQRCode(true)}
              >
                <Ionicons name="qr-code-outline" size={20} color={theme.text} style={styles.buttonIcon} />
                <Text style={[styles.buttonText, { color: theme.text }]}>
                  Present Membership
                </Text>
              </TouchableOpacity>
  
              {/* Info box */}
              <View style={[styles.infoBox, { backgroundColor: theme.darker }]}>
                <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
                <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                  Show this QR code to the librarian to verify your membership and borrow books.
                </Text>
              </View>
            </View>
          </Animatable.View>
  
          {/* QR Code Modal */}
          <Modal
            visible={showQRCode}
            transparent={true}
            animationType="slide"
            onRequestClose={resetFlow}
          >
            <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
              <View style={[styles.modalContent, { backgroundColor: theme.dark }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>
                    {verificationStatus === null ? 'Scan QR Code' : 
                     verificationStatus === 'pending' ? 'Verifying...' :
                     verificationStatus === 'success' ? 'Verification Successful' : 'Verification Failed'}
                  </Text>
                  <TouchableOpacity onPress={resetFlow}>
                    <Ionicons name="close" size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.qrContainer}>
                  {verificationStatus === null || verificationStatus === 'pending' ? (
                    <>
                      <View style={[styles.qrCodeBox, { backgroundColor: 'white', borderColor: theme.border }]}>
                        {/* Simulated QR code with icon */}
                        <View style={styles.mockQrCode}>
                          <Ionicons name="qr-code" size={150} color="black" />
                        </View>
                      </View>
                      <Text style={[styles.qrInstructions, { color: theme.textSecondary }]}>
                        Have the librarian scan this code to verify your library membership
                      </Text>
                      {verificationStatus === 'pending' && (
                        <Animatable.View animation="pulse" easing="ease-out" iterationCount="infinite" style={styles.loadingIndicator}>
                          <Ionicons name="sync-outline" size={32} color={theme.primary} />
                        </Animatable.View>
                      )}
                    </>
                  ) : verificationStatus === 'success' ? (
                    <View style={styles.resultContainer}>
                      <View style={[styles.successIcon, { backgroundColor: theme.success + '20' }]}>
                        <Ionicons name="checkmark-circle" size={60} color={theme.success} />
                      </View>
                      <Text style={[styles.resultTitle, { color: theme.text }]}>Membership Verified</Text>
                      <Text style={[styles.resultMessage, { color: theme.textSecondary }]}>
                        Your library membership has been verified. The librarian can now issue the book to you.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.resultContainer}>
                      <View style={[styles.failedIcon, { backgroundColor: theme.error + '20' }]}>
                        <Ionicons name="close-circle" size={60} color={theme.error} />
                      </View>
                      <Text style={[styles.resultTitle, { color: theme.text }]}>Verification Failed</Text>
                      <Text style={[styles.resultMessage, { color: theme.textSecondary }]}>
                        There was a problem verifying your library membership. Please try again or contact library staff.
                      </Text>
                    </View>
                  )}
                </View>
                
                {verificationStatus && (
                  <TouchableOpacity 
                    style={[styles.doneButton, { 
                      backgroundColor: verificationStatus === 'success' ? theme.success : theme.primary 
                    }]}
                    onPress={resetFlow}
                  >
                    <Text style={[styles.doneButtonText, { color: theme.text }]}>
                      {verificationStatus === 'success' ? 'Done' : 'Try Again'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </>
    );
  };
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
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
      padding: 4,
    },
    headerTitle: {
      fontFamily: 'Poppins-Bold',
      fontSize: 18,
    },
    content: {
      flex: 1,
    },
    mainContent: {
      padding: 20,
    },
    title: {
      fontFamily: 'Poppins-Bold',
      fontSize: 26,
      marginBottom: 10,
    },
    description: {
      fontFamily: 'Poppins-Regular',
      fontSize: 16,
      marginBottom: 24,
      lineHeight: 22,
    },
    credentialCard: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      marginBottom: 24,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    logoContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    cardTitleContainer: {
      flex: 1,
    },
    cardTitle: {
      fontFamily: 'Poppins-Bold',
      fontSize: 18,
      marginBottom: 4,
    },
    cardSubtitle: {
      fontFamily: 'Poppins-Regular',
      fontSize: 14,
    },
    divider: {
      height: 1,
      width: '100%',
      marginBottom: 16,
    },
    cardDetails: {
      gap: 12,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    detailLabel: {
      fontFamily: 'Poppins-Medium',
      fontSize: 14,
    },
    detailValue: {
      fontFamily: 'Poppins-Medium',
      fontSize: 14,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      fontFamily: 'Poppins-Medium',
      fontSize: 12,
    },
    presentButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 16,
      marginBottom: 24,
    },
    buttonIcon: {
      marginRight: 8,
    },
    buttonText: {
      fontFamily: 'Poppins-Bold',
      fontSize: 16,
    },
    infoBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 16,
      borderRadius: 12,
    },
    infoText: {
      fontFamily: 'Poppins-Regular',
      fontSize: 14,
      marginLeft: 10,
      flex: 1,
      lineHeight: 20,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalContent: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: Platform.OS === 'ios' ? 40 : 20,
      height: '75%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontFamily: 'Poppins-Bold',
      fontSize: 20,
    },
    qrContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    qrCodeBox: {
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      marginBottom: 16,
    },
    mockQrCode: {
      width: 200,
      height: 200,
      justifyContent: 'center',
      alignItems: 'center',
    },
    qrInstructions: {
      fontFamily: 'Poppins-Regular',
      fontSize: 14,
      textAlign: 'center',
      paddingHorizontal: 20,
      lineHeight: 20,
    },
    loadingIndicator: {
      marginTop: 24,
    },
    resultContainer: {
      alignItems: 'center',
      padding: 20,
    },
    successIcon: {
      width: 100,
      height: 100,
      borderRadius: 50,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    failedIcon: {
      width: 100,
      height: 100,
      borderRadius: 50,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    resultTitle: {
      fontFamily: 'Poppins-Bold',
      fontSize: 22,
      marginBottom: 12,
      textAlign: 'center',
    },
    resultMessage: {
      fontFamily: 'Poppins-Regular',
      fontSize: 16,
      textAlign: 'center',
      lineHeight: 24,
    },
    doneButton: {
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: 'center',
    },
    doneButtonText: {
      fontFamily: 'Poppins-Bold',
      fontSize: 16,
    },
  });
  
  export default LibraryRental;