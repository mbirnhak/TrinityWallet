import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    ScrollView,
    Alert,
    Modal,
    SafeAreaView,
    StatusBar,
    Platform,
    Switch,
    TextInput,
    Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Animated } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

function Profile() {
    const { signOut } = useAuth();
    const { theme, isDarkMode, toggleTheme } = useTheme();
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [showEditNameModal, setShowEditNameModal] = useState(false);
    const [userName, setUserName] = useState('Shivanshu Dwivedi');
    const [newName, setNewName] = useState('');
    const [profileImage, setProfileImage] = useState(null);

    // Load saved name and profile image when component mounts
    useEffect(() => {
        const loadProfileData = async () => {
            try {
                const savedName = await AsyncStorage.getItem('user_name');
                if (savedName) {
                    setUserName(savedName);
                }
                
                const savedImage = await AsyncStorage.getItem('profile_image');
                if (savedImage) {
                    setProfileImage(savedImage);
                }
            } catch (error) {
                console.error('Error loading profile data:', error);
            }
        };
        
        loadProfileData();
    }, []);

    const handleSignOut = async () => {
        try {
            await signOut();
            router.replace('../login');
        } catch (error) {
            Alert.alert(
                'Error',
                'Failed to sign out. Please try again.',
                [{ text: 'OK' }]
            );
        }
    };

    const handleEditName = () => {
        setNewName(userName);
        setShowEditNameModal(true);
    };

    const handleSaveName = async () => {
        if (newName.trim()) {
            setUserName(newName.trim());
            setShowEditNameModal(false);
            
            // Save to AsyncStorage
            try {
                await AsyncStorage.setItem('user_name', newName.trim());
            } catch (error) {
                console.error('Error saving name:', error);
            }
        } else {
            Alert.alert('Invalid Name', 'Please enter a valid name.');
        }
    };

    const handlePickImage = async () => {
        // Request permission to access photos
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow access to your photo library to change your profile picture.');
            return;
        }
        
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });
        
        if (!result.canceled && result.assets && result.assets.length > 0) {
            const selectedAsset = result.assets[0];
            setProfileImage(selectedAsset.uri);
            
            // Save to AsyncStorage
            try {
                await AsyncStorage.setItem('profile_image', selectedAsset.uri);
            } catch (error) {
                console.error('Error saving profile image:', error);
            }
        }
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.dark }]}>
            <StatusBar 
                barStyle={isDarkMode ? "light-content" : "dark-content"} 
                backgroundColor={theme.dark} 
            />
            <ScrollView 
                style={[styles.container, { backgroundColor: theme.dark }]}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <Animatable.View 
                    animation="fadeIn" 
                    duration={1000} 
                    style={styles.content}
                >
                    <LinearGradient
                        colors={[`${theme.primary}10`, 'transparent']}
                        style={styles.profileHeader}
                    >
                        <TouchableOpacity 
                            style={styles.avatarContainer}
                            onPress={handlePickImage}
                        >
                            <LinearGradient
                                colors={[theme.primary, theme.primaryDark]}
                                style={[styles.avatarGradient, { borderColor: theme.border }]}
                            >
                                {profileImage ? (
                                    <Image 
                                        source={{ uri: profileImage }} 
                                        style={styles.profileImage} 
                                    />
                                ) : (
                                    <Ionicons name="person" size={60} color={theme.text} />
                                )}
                                <View style={styles.cameraIconContainer}>
                                    <Ionicons name="camera" size={18} color={theme.text} />
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                        <View style={styles.nameContainer}>
                            <Text style={[styles.userName, { color: theme.text }]}>{userName}</Text>
                            <TouchableOpacity 
                                style={styles.editNameButton}
                                onPress={handleEditName}
                            >
                                <Ionicons name="pencil" size={18} color={theme.primary} />
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>

                    {/* Appearance Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
                        <TouchableOpacity 
                            style={[styles.button, { borderColor: theme.border }]}
                            activeOpacity={1}
                        >
                            <LinearGradient
                                colors={[theme.surface, theme.darker]}
                                style={styles.buttonContent}
                            >
                                <Ionicons 
                                    name={isDarkMode ? "moon" : "sunny"} 
                                    size={24} 
                                    color={theme.primary} 
                                />
                                <Text style={[styles.buttonText, { 
                                    color: theme.text,
                                    marginLeft: 15,
                                    textAlign: 'left'
                                }]}>
                                    {isDarkMode ? "Dark Mode" : "Light Mode"}
                                </Text>
                                <Switch
                                    trackColor={{ false: "#3e3e3e", true: `${theme.primary}50` }}
                                    thumbColor={isDarkMode ? theme.primary : "#f4f3f4"}
                                    ios_backgroundColor="#3e3e3e"
                                    onValueChange={toggleTheme}
                                    value={isDarkMode}
                                    style={styles.switch}
                                />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Wallet Management</Text>
                        <TouchableOpacity 
                            style={[styles.button, { borderColor: theme.border }]}
                            onPress={() => Alert.alert('Coming Soon', 'Backup feature will be available in future updates.')}
                        >
                            <LinearGradient
                                colors={[theme.surface, theme.darker]}
                                style={styles.buttonContent}
                            >
                                <Ionicons name="cloud-upload-outline" size={24} color={theme.primary} />
                                <Text style={[styles.buttonText, { color: theme.text }]}>Backup Wallet</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.button, { borderColor: theme.border }]}
                            onPress={() => Alert.alert('Coming Soon', 'Restore feature will be available in future updates.')}
                        >
                            <LinearGradient
                                colors={[theme.surface, theme.darker]}
                                style={styles.buttonContent}
                            >
                                <Ionicons name="cloud-download-outline" size={24} color={theme.primary} />
                                <Text style={[styles.buttonText, { color: theme.text }]}>Restore Wallet</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Support & Information</Text>
                        <TouchableOpacity 
                            style={[styles.button, { borderColor: theme.border }]}
                            onPress={() => setShowHelpModal(true)}
                        >
                            <LinearGradient
                                colors={[theme.surface, theme.darker]}
                                style={styles.buttonContent}
                            >
                                <Ionicons name="help-circle-outline" size={24} color={theme.primary} />
                                <Text style={[styles.buttonText, { color: theme.text }]}>Help & Support</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.button, { borderColor: theme.border }]}
                            onPress={() => setShowAboutModal(true)}
                        >
                            <LinearGradient
                                colors={[theme.surface, theme.darker]}
                                style={styles.buttonContent}
                            >
                                <Ionicons name="information-circle-outline" size={24} color={theme.primary} />
                                <Text style={[styles.buttonText, { color: theme.text }]}>About</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity 
                        style={[styles.button, styles.signOutButton]}
                        onPress={handleSignOut}
                    >
                        <LinearGradient
                            colors={['rgba(255, 69, 58, 0.1)', 'rgba(255, 69, 58, 0.2)']}
                            style={styles.signOutGradient}
                        >
                            <Animated.View style={[styles.signOutContent, { backgroundColor: theme.dark }]}>
                                <Ionicons name="log-out-outline" size={24} color={theme.error} />
                                <Text style={[styles.buttonText, styles.signOutText, { color: theme.error }]}>Sign Out</Text>
                                <View style={[styles.signOutBorder, { borderColor: 'rgba(255, 69, 58, 0.3)' }]} />
                            </Animated.View>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animatable.View>

                {/* Help & Support Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={showHelpModal}
                    onRequestClose={() => setShowHelpModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <Animatable.View 
                            animation="slideInUp"
                            duration={300}
                            style={styles.modalContent}
                        >
                            <LinearGradient
                                colors={[theme.surface, theme.darker]}
                                style={styles.modalGradient}
                            >
                                <Text style={[styles.modalTitle, { color: theme.text }]}>Help & Support</Text>
                                <Text style={[styles.modalText, { color: theme.textSecondary }]}>
                                    For support inquiries, please contact:{'\n\n'}
                                    <Text style={[styles.modalHighlight, { color: theme.primary }]}>sdwivedi@trincoll.edu</Text>{'\n'}
                                    <Text style={[styles.modalHighlight, { color: theme.primary }]}>+1 (860) 209 7055</Text>{'\n\n'}
                                    Hours: Mon-Fri, 9 AM - 6 PM EST
                                </Text>
                                <TouchableOpacity 
                                    style={[styles.modalButton, { backgroundColor: theme.primary }]}
                                    onPress={() => setShowHelpModal(false)}
                                >
                                    <Text style={[styles.modalButtonText, { color: theme.text }]}>Close</Text>
                                </TouchableOpacity>
                            </LinearGradient>
                        </Animatable.View>
                    </View>
                </Modal>

                {/* About Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={showAboutModal}
                    onRequestClose={() => setShowAboutModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <Animatable.View 
                            animation="slideInUp"
                            duration={300}
                            style={styles.modalContent}
                        >
                            <LinearGradient
                                colors={[theme.surface, theme.darker]}
                                style={styles.modalGradient}
                            >
                                <Text style={[styles.modalTitle, { color: theme.text }]}>About Trinity Wallet</Text>
                                <Text style={[styles.modalText, { color: theme.textSecondary }]}>
                                    Trinity Wallet is an eDIAS compliant digital wallet designed for secure 
                                    and efficient management of your digital credentials.{'\n\n'}
                                    Features:{'\n'}
                                    • Secure credential storage{'\n'}
                                    • Biometric authentication{'\n'}
                                    • PIN protection{'\n'}
                                    • Backup and restore capabilities{'\n\n'}
                                    <Text style={[styles.versionText, { color: theme.textSecondary }]}>Version 1.0.0</Text>
                                </Text>
                                <TouchableOpacity 
                                    style={[styles.modalButton, { backgroundColor: theme.primary }]}
                                    onPress={() => setShowAboutModal(false)}
                                >
                                    <Text style={[styles.modalButtonText, { color: theme.text }]}>Close</Text>
                                </TouchableOpacity>
                            </LinearGradient>
                        </Animatable.View>
                    </View>
                </Modal>

                {/* Edit Name Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={showEditNameModal}
                    onRequestClose={() => setShowEditNameModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <Animatable.View 
                            animation="slideInUp"
                            duration={300}
                            style={styles.modalContent}
                        >
                            <LinearGradient
                                colors={[theme.surface, theme.darker]}
                                style={styles.modalGradient}
                            >
                                <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Name</Text>
                                <TextInput
                                    style={[styles.nameInput, { 
                                        color: theme.text,
                                        backgroundColor: theme.darker,
                                        borderColor: theme.border
                                    }]}
                                    value={newName}
                                    onChangeText={setNewName}
                                    placeholder="Enter your name"
                                    placeholderTextColor={theme.textSecondary}
                                />
                                <View style={styles.modalButtonsRow}>
                                    <TouchableOpacity 
                                        style={[styles.modalButton, styles.cancelButton, { borderColor: theme.border }]}
                                        onPress={() => setShowEditNameModal(false)}
                                    >
                                        <Text style={{ color: theme.textSecondary, fontFamily: 'Poppins-Medium' }}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.modalButton, { backgroundColor: theme.primary }]}
                                        onPress={handleSaveName}
                                    >
                                        <Text style={[styles.modalButtonText, { color: theme.text }]}>Save</Text>
                                    </TouchableOpacity>
                                </View>
                            </LinearGradient>
                        </Animatable.View>
                    </View>
                </Modal>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    content: {
        padding: 20,
        paddingTop: Platform.OS === 'ios' ? 10 : 20,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 30,
        padding: 20,
        borderRadius: 20,
    },
    avatarContainer: {
        marginBottom: 15,
        alignItems: 'center',
    },
    avatarGradient: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        position: 'relative',
    },
    profileImage: {
        width: 116,
        height: 116,
        borderRadius: 58,
    },
    cameraIconContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userName: {
        fontFamily: 'Poppins-Bold',
        fontSize: 24,
        marginBottom: 5,
    },
    editNameButton: {
        marginLeft: 10,
        marginBottom: 5,
    },
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontFamily: 'Poppins-Bold',
        fontSize: 18,
        marginBottom: 15,
        marginLeft: 5,
        textAlign: 'center',
    },
    button: {
        marginBottom: 10,
        borderRadius: 15,
        overflow: 'hidden',
        borderWidth: 1,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
    },
    buttonText: {
        fontFamily: 'Poppins-Bold',
        flex: 1,
        fontSize: 16,
        marginLeft: -24,
        textAlign: 'center',
    },
    switch: {
        marginLeft: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    modalGradient: {
        padding: 20,
    },
    modalTitle: {
        fontFamily: 'Poppins-Bold',
        fontSize: 24,
        marginBottom: 20,
        textAlign: 'center',
    },
    modalText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 16,
        marginBottom: 20,
        lineHeight: 24,
        textAlign: 'center',
    },
    modalHighlight: {
        fontFamily: 'Poppins-Medium',
    },
    versionText: {
        fontStyle: 'italic',
    },
    modalButton: {
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        flex: 1,
    },
    modalButtonText: {
        fontFamily: 'Poppins-Bold',
        fontSize: 16,
    },
    signOutButton: {
        marginTop: 30,
        marginBottom: 40,
        borderWidth: 0,
    },
    signOutGradient: {
        borderRadius: 15,
        padding: 2,
    },
    signOutContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 13,
    },
    signOutText: {
        fontSize: 18,
        textAlign: 'center',
        flex: 1,
        marginLeft: -24,
    },
    signOutBorder: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 13,
        borderWidth: 1,
    },
    nameInput: {
        fontFamily: 'Poppins-Regular',
        fontSize: 16,
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 20,
    },
    modalButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
    },
});

export default Profile;