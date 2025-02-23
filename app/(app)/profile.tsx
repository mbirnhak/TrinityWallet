import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    ScrollView,
    Alert,
    Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from './_layout';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Animated } from 'react-native';

function Profile() {
    const { signOut } = useAuth();
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [showAboutModal, setShowAboutModal] = useState(false);

    const handleSignOut = async () => {
        try {
            await signOut();
            router.replace('/login');
        } catch (error) {
            Alert.alert(
                'Error',
                'Failed to sign out. Please try again.',
                [{ text: 'OK' }]
            );
        }
    };

    return (
        <ScrollView 
            style={styles.container}
            showsVerticalScrollIndicator={false}
        >
            <Animatable.View 
                animation="fadeIn" 
                duration={1000} 
                style={styles.content}
            >
                <LinearGradient
                    colors={['rgba(10, 132, 255, 0.1)', 'transparent']}
                    style={styles.profileHeader}
                >
                    <View style={styles.avatarContainer}>
                        <LinearGradient
                            colors={[theme.primary, theme.primaryDark]}
                            style={styles.avatarGradient}
                        >
                            <Ionicons name="person" size={60} color={theme.text} />
                        </LinearGradient>
                    </View>
                    <Text style={styles.userName}>Shivanshu Dwivedi</Text>
                    <Text style={styles.userEmail}>sdwivedi@trincoll.edu</Text>
                </LinearGradient>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Wallet Management</Text>
                    <TouchableOpacity 
                        style={styles.button}
                        onPress={() => Alert.alert('Coming Soon', 'Backup feature will be available in future updates.')}
                    >
                        <LinearGradient
                            colors={[theme.surface, theme.darker]}
                            style={styles.buttonContent}
                        >
                            <Ionicons name="cloud-upload-outline" size={24} color={theme.primary} />
                            <Text style={styles.buttonText}>Backup Wallet</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.button}
                        onPress={() => Alert.alert('Coming Soon', 'Restore feature will be available in future updates.')}
                    >
                        <LinearGradient
                            colors={[theme.surface, theme.darker]}
                            style={styles.buttonContent}
                        >
                            <Ionicons name="cloud-download-outline" size={24} color={theme.primary} />
                            <Text style={styles.buttonText}>Restore Wallet</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Support & Information</Text>
                    <TouchableOpacity 
                        style={styles.button}
                        onPress={() => setShowHelpModal(true)}
                    >
                        <LinearGradient
                            colors={[theme.surface, theme.darker]}
                            style={styles.buttonContent}
                        >
                            <Ionicons name="help-circle-outline" size={24} color={theme.primary} />
                            <Text style={styles.buttonText}>Help & Support</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.button}
                        onPress={() => setShowAboutModal(true)}
                    >
                        <LinearGradient
                            colors={[theme.surface, theme.darker]}
                            style={styles.buttonContent}
                        >
                            <Ionicons name="information-circle-outline" size={24} color={theme.primary} />
                            <Text style={styles.buttonText}>About</Text>
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
                        <Animated.View style={styles.signOutContent}>
                            <Ionicons name="log-out-outline" size={24} color={theme.error} />
                            <Text style={[styles.buttonText, styles.signOutText]}>Sign Out</Text>
                            <View style={styles.signOutBorder} />
                        </Animated.View>
                    </LinearGradient>
                </TouchableOpacity>
            </Animatable.View>

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
                            <Text style={styles.modalTitle}>Help & Support</Text>
                            <Text style={styles.modalText}>
                                For support inquiries, please contact:{'\n\n'}
                                <Text style={styles.modalHighlight}>sdwivedi@trincoll.edu</Text>{'\n'}
                                <Text style={styles.modalHighlight}>+1 (860) 209 7055</Text>{'\n\n'}
                                Hours: Mon-Fri, 9 AM - 6 PM EST
                            </Text>
                            <TouchableOpacity 
                                style={styles.modalButton}
                                onPress={() => setShowHelpModal(false)}
                            >
                                <Text style={styles.modalButtonText}>Close</Text>
                            </TouchableOpacity>
                        </LinearGradient>
                    </Animatable.View>
                </View>
            </Modal>

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
                            <Text style={styles.modalTitle}>About Trinity Wallet</Text>
                            <Text style={styles.modalText}>
                                Trinity Wallet is an eDIAS compliant digital wallet designed for secure 
                                and efficient management of your digital credentials.{'\n\n'}
                                Features:{'\n'}
                                • Secure credential storage{'\n'}
                                • Biometric authentication{'\n'}
                                • PIN protection{'\n'}
                                • Backup and restore capabilities{'\n\n'}
                                <Text style={styles.versionText}>Version 1.0.0</Text>
                            </Text>
                            <TouchableOpacity 
                                style={styles.modalButton}
                                onPress={() => setShowAboutModal(false)}
                            >
                                <Text style={styles.modalButtonText}>Close</Text>
                            </TouchableOpacity>
                        </LinearGradient>
                    </Animatable.View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.dark,
    },
    content: {
        padding: 20,
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
        borderColor: theme.border,
    },
    userName: {
        fontFamily: 'Poppins-Bold',
        fontSize: 24,
        color: theme.text,
        marginBottom: 5,
    },
    userEmail: {
        fontFamily: 'Poppins-Regular',
        fontSize: 16,
        color: theme.textSecondary,
    },
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontFamily: 'Poppins-Bold',
        fontSize: 18,
        color: theme.text,
        marginBottom: 15,
        marginLeft: 5,
        textAlign: 'center',
    },
    button: {
        marginBottom: 10,
        borderRadius: 15,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.border,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
    },
    buttonText: {
        fontFamily: 'Poppins-Bold',
        color: theme.text,
        flex: 1,
        fontSize: 16,
        marginLeft: -24,
        textAlign: 'center',

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
        color: theme.text,
        marginBottom: 20,
        textAlign: 'center',
    },
    modalText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 16,
        color: theme.textSecondary,
        marginBottom: 20,
        lineHeight: 24,
        textAlign: 'center',
    },
    modalHighlight: {
        color: theme.primary,
        fontFamily: 'Poppins-Medium',
    },
    versionText: {
        color: theme.textSecondary,
        fontStyle: 'italic',
    },
    modalButton: {
        backgroundColor: theme.primary,
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalButtonText: {
        fontFamily: 'Poppins-Bold',
        color: theme.text,
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
        backgroundColor: theme.dark,
        borderRadius: 13,
    },
    signOutText: {
        color: theme.error,
        fontSize: 18,
        textAlign: 'center',
        flex: 1,      // Add this
        marginLeft: -24, // Add this to offset the icon space
    },
    signOutBorder: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 13,
        borderWidth: 1,
        borderColor: 'rgba(255, 69, 58, 0.3)',
    },
});


export default Profile;