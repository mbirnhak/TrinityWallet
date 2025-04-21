import { StyleSheet, TouchableOpacity, Text, View, Platform, StatusBar, Alert } from 'react-native';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import LogService from '@/services/LogService';
import { requestCredential } from '../../services/Transactions/credentialIssuance';

export default function PinAuth() {
  // Hide the tab bar when this screen is focused
  useEffect(() => {
    // This is the key to hiding the tab bar
    router.setParams({ hideTabBar: true });
    
    return () => {
      router.setParams({ hideTabBar: false });
    };
  }, []);
  const params = useLocalSearchParams();
  const { callback, selectedIds } = params;
  
  const { theme, isDarkMode } = useTheme();
  const { signIn } = useAuth();
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinAttempts, setPinAttempts] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const MAX_PIN_ATTEMPTS = 3;
  const pinDisplayRef = useRef();
  
  // Initialize LogService
  const logService = LogService.getInstance();
  
  useEffect(() => {
    const initLogService = async () => {
      try {
        await logService.initialize();
      } catch (error) {
        console.error('Error initializing LogService:', error);
      }
    };
    
    initLogService();
    
    return () => {
      logService.close();
    };
  }, []);
  
  // Trigger shake animation when pin error changes
  useEffect(() => {
    if (pinError && pinDisplayRef.current) {
      pinDisplayRef.current.shake(500);
    }
  }, [pinError]);
  
  // Handle PIN input
  const handlePinInput = useCallback((number) => {
    if (isProcessing) return;
    
    setPin((currentPin) => {
      const newPin = currentPin + number;
      
      // Automatically verify when PIN is complete
      if (newPin.length === 6) {
        setTimeout(() => validatePin(newPin), 200);
      }
      
      return newPin;
    });
  }, [isProcessing]);
  
  // Handle PIN delete
  const handlePinDelete = useCallback(() => {
    if (isProcessing) return;
    
    setPin((currentPin) => {
      if (currentPin.length > 0) {
        return currentPin.slice(0, -1);
      }
      return currentPin;
    });
  }, [isProcessing]);
  
  // Handle going back
  const handleGoBack = () => {
    if (isProcessing) return;
    router.back();
  };
  
  // Validate PIN
  const validatePin = async (inputPin) => {
    try {
      setIsProcessing(true);
      
      // Log PIN authentication attempt
      await logService.createLog({
        transaction_type: 'authentication',
        status: 'pending',
        details: 'Attempting PIN authentication for credential request'
      });
      
      // Use the existing authentication service from your app
      const isValid = await signIn(inputPin);
      
      if (isValid) {
        // Log successful authentication
        await logService.createLog({
          transaction_type: 'authentication',
          status: 'success',
          details: 'PIN authentication successful for credential request'
        });
        
        if (callback === 'request-credentials' && selectedIds) {
          try {
            // Parse the selected credential IDs
            const credentialIds = JSON.parse(selectedIds);
            
            // Initialize LogService for this operation
            await logService.initialize();
            
            // Log the credential request initiation
            await logService.createLog({
              transaction_type: 'credential_issuance',
              status: 'pending',
              details: `Requesting ${credentialIds.length} credential(s)`,
              relying_party: 'EU Issuer'
            });
            
            // Pass the selected credential IDs to the request function
            const response = await requestCredential(credentialIds);
            
            if (response === 'Error') {
              Alert.alert('Error', 'Failed to request credentials. Please try again later.');
              router.back();
              return;
            }
            
            // Log success
            await logService.createLog({
              transaction_type: 'credential_issuance',
              status: 'success',
              details: `Successfully requested ${credentialIds.length} credential(s)`
            });
            
            // Success alert
            Alert.alert(
              'Success', 
              'Your credential request has been submitted successfully',
              [{ text: 'OK', onPress: () => router.back() }]
            );
          } catch (error) {
            console.error('Error requesting credentials:', error);
            
            // Try to log the error
            try {
              await logService.createLog({
                transaction_type: 'credential_issuance',
                status: 'failed',
                details: `Error requesting credentials: ${error.message || 'Unknown error'}`,
                relying_party: 'EU Issuer'
              });
            } catch (logError) {
              console.error('Error logging credential request failure:', logError);
            }
            
            Alert.alert(
              'Error',
              'Failed to request credentials. Please try again later.',
              [{ text: 'OK', onPress: () => router.back() }]
            );
          }
        } else {
          // If no callback specified, just go back
          router.back();
        }
      } else {
        // Log failed authentication
        const newAttempts = pinAttempts + 1;
        setPinAttempts(newAttempts);
        
        await logService.createLog({
          transaction_type: 'authentication',
          status: 'failed',
          details: `PIN authentication failed for credential request. Attempt ${newAttempts} of ${MAX_PIN_ATTEMPTS}`
        });
        
        // Show error message based on attempts
        if (newAttempts >= MAX_PIN_ATTEMPTS) {
          setPinError(`Too many failed attempts. Please try again later.`);
          setTimeout(() => {
            router.back();
          }, 2000);
        } else {
          setPinError(`Incorrect PIN. ${MAX_PIN_ATTEMPTS - newAttempts} attempts remaining.`);
          setPin('');
        }
      }
    } catch (error) {
      console.error('PIN validation error:', error);
      
      // Log error
      await logService.createLog({
        transaction_type: 'authentication',
        status: 'failed',
        details: `PIN validation error: ${error instanceof Error ? error.message : String(error)}`
      });
      
      setPinError('An error occurred. Please try again.');
      setPin('');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Pre-render keypad buttons to prevent re-renders
  const keypadButtons = Array(12).fill(0).map((_, index) => {
    let key;
    if (index === 9) key = '';
    else if (index === 10) key = 0;
    else if (index === 11) key = '⌫';
    else key = index + 1;
    
    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.keypadButton,
          key === '' && styles.keypadButtonDisabled,
          typeof key === 'number' && {
            backgroundColor: isDarkMode ? theme.surface : '#F2F2F7',
            borderColor: theme.border
          }
        ]}
        onPress={() => {
          if (key === '⌫') {
            handlePinDelete();
          } else if (key !== '') {
            handlePinInput(key.toString());
          }
        }}
        disabled={key === '' || isProcessing}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.keypadButtonText,
          { color: theme.text },
          key === '⌫' && { color: theme.primary }
        ]}>
          {key}
        </Text>
      </TouchableOpacity>
    );
  });
  
  return (
    <>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.dark} />
      <LinearGradient
        colors={isDarkMode ? 
          [theme.dark, theme.background] : 
          ['#F2F2F6', '#FFFFFF']
        }
        style={styles.container}
      >
        {/* Simple Header with Divider */}
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleGoBack}
            disabled={isProcessing}
          >
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerText, { color: theme.text }]}>Authenticate</Text>
          <View style={[styles.divider, { 
            backgroundColor: isDarkMode ? 
              'rgba(255, 255, 255, 0.2)' : 
              'rgba(0, 0, 0, 0.1)' 
          }]} />
        </View>

        <View style={styles.content}>
          {/* PIN container section */}
          <View style={styles.pinContainer}>
            <Animatable.View 
              ref={pinDisplayRef}
              style={styles.pinDisplayWrapper}
            >
              <View style={styles.pinDisplay}>
                {[...Array(6)].map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.pinDot,
                      { borderColor: theme.primary },
                      i < pin.length && { backgroundColor: theme.primary }
                    ]}
                  />
                ))}
              </View>
            </Animatable.View>

            {pinError ? (
              <Animatable.Text 
                style={[styles.errorText, { color: '#FF3B30' }]}
                animation="fadeIn"
                duration={300}
              >
                {pinError}
              </Animatable.Text>
            ) : null}

            <View style={styles.keypad}>
              {keypadButtons}
            </View>
          </View>
        </View>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header with divider
  headerContainer: {
    width: '100%',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 15,
    alignItems: 'center',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: Platform.OS === 'ios' ? 60 : 40,
    zIndex: 10,
  },
  headerText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 32,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    width: '85%',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  // Updated PIN container styles for vertical stretching
  pinContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingBottom: 10,
  },
  pinDisplayWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  pinDisplay: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  pinDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    marginHorizontal: 10,
    backgroundColor: 'transparent',
  },
  errorText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  
  // Keypad Styles - exactly matching login.tsx
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '95%',
    maxWidth: 360,
    marginBottom: 30,
    flex: 0.8,
  },
  keypadButton: {
    width: '31%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: '1%',
    marginVertical: '5%',
    borderRadius: 45,
    borderWidth: 1,
  },
  keypadButtonDisabled: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  keypadButtonText: {
    fontSize: 30,
    fontFamily: 'Poppins-Regular',
  },
});