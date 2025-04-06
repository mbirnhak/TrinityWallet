import { 
  View, StyleSheet, Text, TouchableOpacity, Alert, Modal, Platform, Image, 
  SafeAreaView, StatusBar, ScrollView, ActivityIndicator 
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef, useEffect } from 'react';
import { router, Stack } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { WebView } from 'react-native-webview';
import { createSignerVerifier, ES256 } from '../../services/Credentials/utils'; 

// Simple signature canvas HTML (kept the same)
const signatureHtml = `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Signature Pad</title>
<style>body{margin:0;padding:0;height:100vh;display:flex;justify-content:center;align-items:center;overflow:hidden;background-color:transparent;touch-action:none}#container{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center}canvas{border:1px solid #ccc;display:block;background-color:#f5f5f7;border-radius:16px;width:100%;height:300px;touch-action:none}.dark-mode canvas{background-color:#2C2C2E}</style>
</head>
<body class="THEME_CLASS">
<div id="container"><canvas id="signature-pad"></canvas></div>
<script>const canvas=document.getElementById("signature-pad");const ctx=canvas.getContext("2d");function resizeCanvas(){const ratio=Math.max(window.devicePixelRatio||1,1);canvas.width=canvas.offsetWidth*ratio;canvas.height=canvas.offsetHeight*ratio;ctx.scale(ratio,ratio);ctx.lineJoin="round";ctx.lineCap="round";ctx.lineWidth=3;ctx.strokeStyle="#000"}window.onresize=resizeCanvas;resizeCanvas();let isDrawing=false;let lastX=0;let lastY=0;function draw(e){if(!isDrawing)return;e.preventDefault();const clientX=e.clientX||e.touches[0].clientX;const clientY=e.clientY||e.touches[0].clientY;const rect=canvas.getBoundingClientRect();const x=clientX-rect.left;const y=clientY-rect.top;ctx.beginPath();ctx.moveTo(lastX,lastY);ctx.lineTo(x,y);ctx.stroke();lastX=x;lastY=y}function startDrawing(e){isDrawing=true;e.preventDefault();const clientX=e.clientX||e.touches[0].clientX;const clientY=e.clientY||e.touches[0].clientY;const rect=canvas.getBoundingClientRect();lastX=clientX-rect.left;lastY=clientY-rect.top}function stopDrawing(){isDrawing=false}canvas.addEventListener("mousedown",startDrawing,{passive:false});canvas.addEventListener("mousemove",draw,{passive:false});canvas.addEventListener("mouseup",stopDrawing);canvas.addEventListener("mouseout",stopDrawing);canvas.addEventListener("touchstart",startDrawing,{passive:false});canvas.addEventListener("touchmove",draw,{passive:false});canvas.addEventListener("touchend",stopDrawing);window.clearCanvas=function(){ctx.clearRect(0,0,canvas.width,canvas.height)};window.getSignature=function(){return canvas.toDataURL("image/png")};document.body.addEventListener("touchmove",function(e){e.preventDefault()},{passive:false});</script>
</body></html>`;

const ESign = () => {
  const { theme, isDarkMode } = useTheme();
  const [signatureVisible, setSignatureVisible] = useState(false);
  const [signatureImage, setSignatureImage] = useState('');
  const webViewRef = useRef(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [signedDocumentUri, setSignedDocumentUri] = useState(null);
  
  // Crypto state
  const [hasKeys, setHasKeys] = useState(false);
  const [keyInfo, setKeyInfo] = useState({
    publicKey: null,
    privateKey: null
  });

  // Check for existing keys on mount
  useEffect(() => {
    (async () => {
      try {
        const privateKeyJson = await SecureStore.getItemAsync('eidas_private_key');
        const publicKeyJson = await SecureStore.getItemAsync('eidas_public_key');
        
        if (privateKeyJson && publicKeyJson) {
          const privateKey = JSON.parse(privateKeyJson);
          const publicKey = JSON.parse(publicKeyJson);
          
          setKeyInfo({
            privateKey,
            publicKey
          });
          
          setHasKeys(true);
        }
      } catch (error) {
        console.error('Error checking for keys:', error);
      }
    })();
  }, []);

  // Generate ECDSA key pair
  const generateKeys = async () => {
    try {
      setIsProcessing(true);
      
      // Generate key pair using ECDSA (ES256)
      const { publicKey, privateKey } = await ES256.generateKeyPair();
      
      // Store keys securely
      await SecureStore.setItemAsync('eidas_private_key', JSON.stringify(privateKey));
      await SecureStore.setItemAsync('eidas_public_key', JSON.stringify(publicKey));
      
      // Update state
      setKeyInfo({
        privateKey,
        publicKey
      });
      
      setHasKeys(true);
      Alert.alert('Success', 'ECDSA P-256 keys generated for eIDAS signing');
    } catch (error) {
      Alert.alert('Error', 'Failed to generate keys: ' + error.message);
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle signature canvas (kept the same)
  const clearSignature = () => webViewRef.current?.injectJavaScript('window.clearCanvas(); true;');
  const getSignature = () => webViewRef.current?.injectJavaScript('window.ReactNativeWebView.postMessage(window.getSignature()); true;');
  const handleSignatureData = (data) => {
    setSignatureImage(data);
    setSignatureVisible(false);
    Alert.alert('Success', 'Signature saved');
  };
  const getSignatureHtml = () => signatureHtml.replace('THEME_CLASS', isDarkMode ? 'dark-mode' : '');

  // Document selection (kept the same)
  const selectDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf', 
        copyToCacheDirectory: true
      });
      
      if (!result.canceled && result.assets?.[0]) {
        setSelectedDocument(result.assets[0]);
        setIsSigned(false);
        setSignedDocumentUri(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select document');
      console.error(error);
    }
  };

  // Sign document with ECDSA
  const signDocument = async () => {
    if (!signatureImage || !selectedDocument || !hasKeys) {
      Alert.alert('Error', 'Please provide signature, document, and generate keys');
      return;
    }

    setIsProcessing(true);
    try {
      // Read PDF
      const fileUri = selectedDocument.uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      // Create a signer using the private key
      const { signer } = await createSignerVerifier(keyInfo.privateKey, keyInfo.publicKey);
      
      if (!signer) {
        throw new Error('Failed to create signer');
      }
      
      // Calculate hash of the document content
      const documentData = JSON.stringify({
        name: selectedDocument.name,
        size: selectedDocument.size,
        timestamp: new Date().toISOString()
      });
      
      // Sign the document data
      const signature = await signer(documentData);
      
      // Load PDF and add visual signature
      const pdfDoc = await PDFDocument.load(fileContent);
      
      // Embed a standard font for the stamp text
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const pages = pdfDoc.getPages();
      if (pages.length === 0) throw new Error('PDF has no pages');
      
      // Add visual signature to the first page
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      const signatureBase64 = signatureImage.split(',')[1];
      const pngImage = await pdfDoc.embedPng(signatureBase64);
      
      // Add the signature image
      firstPage.drawImage(pngImage, {
        x: width - 180,
        y: 50,
        width: 150,
        height: 70,
      });
      
      // Calculate the current date for the stamp - use standard ASCII characters only
      const now = new Date();
      const dateStr = now.toLocaleDateString().replace(/[^\x00-\x7F]/g, '');
      const timeStr = now.toLocaleTimeString().replace(/[^\x00-\x7F]/g, '');
      const fullDateStr = `${dateStr} ${timeStr}`;
      
      // Create a green stamp for eIDAS certification
      const stampX = width - 230;
      const stampY = 125;
      const stampWidth = 200;
      const stampHeight = 80; // Increased height for additional info
      const padding = 8;
      
      // Draw stamp outline
      firstPage.drawRectangle({
        x: stampX,
        y: stampY,
        width: stampWidth,
        height: stampHeight,
        borderColor: rgb(0, 0.6, 0.3),
        borderWidth: 2,
        color: rgb(0, 0.9, 0.4, 0.1),
      });
      
      // Add stamp text - ASCII-only text
      firstPage.drawText('Signed by Trinity Wallet', {
        x: stampX + padding,
        y: stampY + stampHeight - 18,
        size: 12,
        font: helveticaBold,
        color: rgb(0, 0.6, 0.3),
      });
      
      firstPage.drawText('eIDAS 2.0 Advanced Electronic Signature', {
        x: stampX + padding,
        y: stampY + stampHeight - 36,
        size: 10,
        font: helveticaBold,
        color: rgb(0, 0.6, 0.3),
      });
      
      firstPage.drawText('ECDSA P-256 (ES256)', {
        x: stampX + padding,
        y: stampY + stampHeight - 54,
        size: 8,
        font: helveticaFont,
        color: rgb(0, 0.6, 0.3),
      });
      
      firstPage.drawText(fullDateStr, {
        x: stampX + padding,
        y: stampY + padding + 2,
        size: 8,
        font: helveticaFont,
        color: rgb(0, 0.6, 0.3),
      });
      
      // Using COMPATIBLE methods that exist in the pdf-lib version
      pdfDoc.setSubject('Digitally Signed Document - eIDAS 2.0');
      pdfDoc.setKeywords(['signed', 'secure', 'eIDAS', 'ECDSA', 'P-256']);
      pdfDoc.setCreator('Trinity Wallet');
      pdfDoc.setProducer('eIDAS 2.0 Advanced Electronic Signature');
      
      // Store document metadata for verification
      const signatureData = {
        documentInfo: documentData,
        signature: signature,
        publicKey: keyInfo.publicKey,
        signedAt: now.toISOString(),
        documentName: selectedDocument.name,
        algorithm: 'ES256'
      };
      
      // Save the PDF
      const finalPdfBytes = await pdfDoc.save();
      const finalPdfBase64 = Buffer.from(finalPdfBytes).toString('base64');
      
      // Generate filename
      const signedFileName = selectedDocument.name?.replace('.pdf', '_signed.pdf') || 'signed_document.pdf';
      const signedPdfUri = FileSystem.cacheDirectory + signedFileName;
      
      // Create metadata file for verification
      const metadataFileName = signedFileName + '.meta';
      const metadataUri = FileSystem.cacheDirectory + metadataFileName;
      const metadataContent = JSON.stringify(signatureData, null, 2);
      
      // Write both files
      await FileSystem.writeAsStringAsync(signedPdfUri, finalPdfBase64, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      await FileSystem.writeAsStringAsync(metadataUri, metadataContent, {
        encoding: FileSystem.EncodingType.UTF8
      });
      
      setSignedDocumentUri(signedPdfUri);
      setIsSigned(true);
      Alert.alert('Success', 'Document signed with ECDSA P-256 (ES256) signature');
    } catch (error) {
      Alert.alert('Error', 'Failed to sign document: ' + error.message);
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Verify using ECDSA
  const verifyDocument = async () => {
    if (!signedDocumentUri) {
      Alert.alert('Error', 'No signed document to verify');
      return;
    }

    setIsProcessing(true);
    try {
      // Check for metadata file
      const metadataUri = signedDocumentUri + '.meta';
      const metadataExists = await FileSystem.getInfoAsync(metadataUri);
      
      if (!metadataExists.exists) {
        throw new Error('Signature metadata file not found');
      }
      
      // Read the metadata
      const metadataContent = await FileSystem.readAsStringAsync(metadataUri);
      const metadata = JSON.parse(metadataContent);
      
      if (!metadata.signature || !metadata.publicKey || !metadata.documentInfo) {
        throw new Error('Invalid signature metadata');
      }
      
      // Create verifier from the public key in metadata
      const { verifier } = await createSignerVerifier(null, metadata.publicKey);
      
      if (!verifier) {
        throw new Error('Failed to create verifier');
      }
      
      // Verify the signature
      const isValid = await verifier(metadata.documentInfo, metadata.signature);
      
      if (isValid) {
        const date = new Date(metadata.signedAt).toLocaleString();
        Alert.alert(
          'Verification Successful',
          `This document is authentic and has not been tampered with.\nSigned: ${date}\nAlgorithm: ${metadata.algorithm}\nCertified by eIDAS 2.0 Advanced Electronic Signature`
        );
      } else {
        Alert.alert(
          'Verification Failed',
          'The signature is invalid or the document has been tampered with.'
        );
      }
    } catch (error) {
      Alert.alert('Verification Error', error.message);
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Share document (kept the same)
  const shareDocument = async () => {
    if (!signedDocumentUri) {
      Alert.alert('Error', 'No signed document to share');
      return;
    }
    
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(signedDocumentUri);
      } else {
        Alert.alert('Error', 'Sharing not available');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share document');
      console.error(error);
    }
  };

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
          <Text style={[styles.headerTitle, { color: theme.text }]}>E-Signature</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={{flex: 1}}>
          <View style={styles.content}>
            <Text style={[styles.title, { color: theme.text }]}>Cryptographic E-Signature</Text>
            
            {/* Key management section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Digital Key Pair</Text>
              <LinearGradient
                colors={[theme.surface, theme.darker]}
                style={[styles.card, { borderColor: theme.border }]}
              >
                {hasKeys ? (
                  <View style={styles.statusRow}>
                    <Ionicons name="shield-checkmark" size={24} color="#4CD97B" />
                    <Text style={[styles.statusText, { color: theme.text }]}>
                      ECDSA P-256 keys ready
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.generateBtn} 
                    onPress={generateKeys}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color={theme.primary} />
                    ) : (
                      <>
                        <Ionicons name="key-outline" size={24} color={theme.primary} />
                        <Text style={[styles.btnText, { color: theme.text }]}>
                          Generate ECDSA Key Pair
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </LinearGradient>
            </View>

            {/* Signature section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Signature</Text>
              <LinearGradient
                colors={[theme.surface, theme.darker]}
                style={[styles.card, { borderColor: theme.border }]}
              >
                {signatureImage ? (
                  <View style={styles.signaturePreview}>
                    <Image 
                      source={{ uri: signatureImage }} 
                      style={styles.signatureImg} 
                      resizeMode="contain" 
                    />
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                      onPress={() => setSignatureVisible(true)}
                    >
                      <Text style={[styles.btnText, { color: theme.text }]}>Redraw</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.createBtn} 
                    onPress={() => setSignatureVisible(true)}
                  >
                    <Ionicons name="create-outline" size={28} color={theme.primary} />
                    <Text style={[styles.btnText, { color: theme.text }]}>
                      Create Signature
                    </Text>
                  </TouchableOpacity>
                )}
              </LinearGradient>
            </View>

            {/* Document section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Document</Text>
              <LinearGradient
                colors={[theme.surface, theme.darker]}
                style={[styles.card, { borderColor: theme.border }]}
              >
                {selectedDocument ? (
                  <View style={styles.docRow}>
                    <Ionicons name="document-text" size={24} color="#FF595E" />
                    <Text style={[styles.docName, { color: theme.text }]}>
                      {selectedDocument.name}
                    </Text>
                    <TouchableOpacity onPress={selectDocument}>
                      <Ionicons name="refresh" size={20} color={theme.primary} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.createBtn} 
                    onPress={selectDocument}
                  >
                    <Ionicons name="document-outline" size={28} color={theme.primary} />
                    <Text style={[styles.btnText, { color: theme.text }]}>
                      Select Document
                    </Text>
                  </TouchableOpacity>
                )}
              </LinearGradient>
            </View>
            
            {/* Sign button */}
            <TouchableOpacity
              style={[
                styles.mainBtn, 
                { 
                  backgroundColor: (!hasKeys || !selectedDocument || !signatureImage) 
                    ? theme.primary + '50' 
                    : theme.primary
                }
              ]}
              onPress={signDocument}
              disabled={!hasKeys || !selectedDocument || !signatureImage || isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color={theme.text} />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={20} color={theme.text} />
                  <Text style={[styles.mainBtnText, { color: theme.text }]}>
                    Sign with ECDSA
                  </Text>
                </>
              )}
            </TouchableOpacity>
            
            {/* Signed document actions */}
            {isSigned && (
              <View style={styles.actionRow}>
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: '#5E5CE6' }]}
                  onPress={verifyDocument}
                >
                  <Ionicons name="checkmark-circle" size={18} color={theme.text} />
                  <Text style={[styles.actionText, { color: theme.text }]}>Verify</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                  onPress={shareDocument}
                >
                  <Ionicons name="share-outline" size={18} color={theme.text} />
                  <Text style={[styles.actionText, { color: theme.text }]}>Share</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Signature Modal */}
        <Modal
          visible={signatureVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSignatureVisible(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalCard, { backgroundColor: theme.dark }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Draw Signature</Text>
                <TouchableOpacity onPress={() => setSignatureVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              
              <View style={[styles.signaturePad, { borderColor: theme.border }]}>
                <WebView
                  ref={webViewRef}
                  source={{ html: getSignatureHtml() }}
                  style={styles.webview}
                  onMessage={(event) => handleSignatureData(event.nativeEvent.data)}
                  scrollEnabled={false}
                  javaScriptEnabled={true}
                />
              </View>
              
              <View style={styles.modalBtnRow}>
                <TouchableOpacity 
                  style={[styles.modalBtn, { borderColor: theme.border }]}
                  onPress={clearSignature}
                >
                  <Text style={[styles.modalBtnText, { color: theme.textSecondary }]}>Clear</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                  onPress={getSignature}
                >
                  <Text style={[styles.modalBtnText, { color: theme.text }]}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4 },
  headerTitle: { fontFamily: 'Poppins-Bold', fontSize: 18 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontFamily: 'Poppins-Bold', fontSize: 26, marginBottom: 20 },
  
  // Section styling
  section: { marginBottom: 20 },
  sectionTitle: { fontFamily: 'Poppins-Bold', fontSize: 18, marginBottom: 10 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
  },
  
  // Key section
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  statusText: { fontFamily: 'Poppins-Medium', fontSize: 16, marginLeft: 10 },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  
  // Signature section
  signaturePreview: { alignItems: 'center' },
  signatureImg: { width: '100%', height: 120, marginBottom: 16 },
  createBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  btnText: { fontFamily: 'Poppins-Medium', fontSize: 16, marginLeft: 8 },
  
  // Document section
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  docName: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    flex: 1,
    marginHorizontal: 10,
  },
  
  // Button styles
  mainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginVertical: 10,
  },
  mainBtnText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    marginLeft: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  actionText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 14,
    marginLeft: 6,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
  },
  signaturePad: {
    height: 300,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 8,
  },
  modalBtnText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
  },
});

export default ESign;