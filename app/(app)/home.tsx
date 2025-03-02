import { View, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { theme } from './_layout';

// Placeholder log data
const PLACEHOLDER_LOGS = [
  { id: 1, type: 'issuance', credential: 'PID (SD-JWT)', date: new Date(2025, 2, 1, 10, 30), status: 'success' },
  { id: 2, type: 'presentation', credential: 'Trinity Library', date: new Date(2025, 2, 1, 9, 15), status: 'success' },
  { id: 3, type: 'presentation', credential: 'PID (mDOC)', date: new Date(2025, 1, 28, 14, 22), status: 'success' },
  { id: 4, type: 'issuance', credential: 'Trinity Door Lock', date: new Date(2025, 1, 28, 11, 5), status: 'success' },
  { id: 5, type: 'presentation', credential: 'PID (SD-JWT)', date: new Date(2025, 1, 27, 16, 40), status: 'failed' },
  { id: 6, type: 'access', credential: 'Main Office Door', date: new Date(2025, 1, 27, 14, 15), status: 'success' },
  { id: 7, type: 'transaction', credential: 'Library Book', date: new Date(2025, 1, 26, 11, 30), status: 'success' },
];

export default function Dashboard() {
  const [recentLogs, setRecentLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    // In a real implementation, this would fetch actual logs from storage or API
    setRecentLogs(PLACEHOLDER_LOGS.slice(0, 5));
  }, []);

  const navigateTo = (route) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.push(route);
    }, 300);
  };

  // Function to get icon based on action type
  const getActionIcon = (type) => {
    switch (type) {
      case 'issuance':
        return 'key-outline';
      case 'presentation':
        return 'id-card-outline';
      case 'backup':
        return 'cloud-upload-outline';
      case 'restore':
        return 'cloud-download-outline';
      case 'signature':
        return 'create-outline';
      case 'access':
        return 'log-in-outline';
      case 'transaction':
        return 'book-outline';
      default:
        return 'ellipsis-horizontal-outline';
    }
  };

  // Component for section header
  const SectionHeader = ({ title, icon }) => (
    <View style={styles.categoryHeader}>
      <View style={styles.categoryTitleContainer}>
        <Ionicons name={icon} size={20} color={theme.primary} />
        <Text style={styles.categoryTitle}>{title}</Text>
      </View>
      <View style={styles.categoryDivider} />
    </View>
  );

  // Component for action buttons
  const ActionButton = ({ icon, title, onPress, color = theme.primary, iconProvider = 'Ionicons' }) => (
    <TouchableOpacity 
      style={styles.actionButton}
      onPress={onPress}
      disabled={isLoading}
    >
      <LinearGradient
        colors={[theme.surface, theme.darker]}
        style={styles.actionGradient}
      >
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          {iconProvider === 'Ionicons' && <Ionicons name={icon} size={24} color={color} />}
          {iconProvider === 'MaterialIcons' && <MaterialIcons name={icon} size={24} color={color} />}
          {iconProvider === 'MaterialCommunityIcons' && <MaterialCommunityIcons name={icon} size={24} color={color} />}
        </View>
        <Text style={styles.actionTitle}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  // Component for log items
  const LogItem = ({ log }) => (
    <Animatable.View 
      animation="fadeIn" 
      duration={500}
      style={styles.logItem}
    >
      <View style={styles.logIconContainer}>
        <View style={[
          styles.logIcon, 
          { backgroundColor: log.status === 'success' ? theme.primary + '20' : theme.error + '20' }
        ]}>
          <Ionicons 
            name={getActionIcon(log.type)} 
            size={16} 
            color={log.status === 'success' ? theme.primary : theme.error} 
          />
        </View>
      </View>
      <View style={styles.logContent}>
        <Text style={styles.logTitle}>
          {log.type === 'issuance' ? 'Issued: ' : 
           log.type === 'presentation' ? 'Presented: ' :
           log.type === 'access' ? 'Accessed: ' :
           log.type === 'transaction' ? 'Transaction: ' : ''}
          <Text style={styles.logHighlight}>{log.credential}</Text>
        </Text>
        <Text style={styles.logTime}>
          {log.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {log.date.toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.logStatus}>
        <Ionicons 
          name={log.status === 'success' ? 'checkmark-circle' : 'close-circle'} 
          size={16} 
          color={log.status === 'success' ? theme.success : theme.error} 
        />
      </View>
    </Animatable.View>
  );

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Animatable.View 
        animation="fadeIn" 
        duration={1000} 
        style={styles.contentContainer}
      >
        <LinearGradient
          colors={['rgba(10, 132, 255, 0.1)', 'transparent']}
          style={styles.gradientHeader}
        >
          <Text style={styles.welcomeText}>Trinity Wallet</Text>
          <Text style={styles.subtitleText}>Secure Digital Identity</Text>
        </LinearGradient>

        {/* Credentials & Wallet Section */}
        <SectionHeader title="Credentials & Wallet" icon="card-outline" />
        <View style={styles.actionsGrid}>
          <ActionButton 
            icon="key" 
            title="Request Credentials" 
            onPress={() => navigateTo('/request-credentials')}
          />
          <ActionButton 
            icon="id-card" 
            title="Present Credentials"
            onPress={() => navigateTo('/present-credentials')}
            color={theme.accent}
          />
          <ActionButton 
            icon="wallet" 
            title="Credentials"
            onPress={() => router.navigate('/(app)/credentials')}
            color="#FF9500" // Apple's orange
          />
          <ActionButton 
            icon="create" 
            title="E-Signature"
            onPress={() => alert('Coming soon')}
            color="#5E5CE6" // Apple's purple
          />
        </View>

        {/* Transactions & Access Section */}
        <SectionHeader title="Transactions & Access" icon="swap-horizontal-outline" />
        <View style={styles.actionsGrid}>
          <ActionButton 
            icon="meeting-room" 
            title="Unlock Door"
            onPress={() => alert('Door unlocked successfully')}
            color="#FF375F" // Apple's pink
            iconProvider="MaterialIcons"
          />
          <ActionButton 
            icon="book" 
            title="Issue Book"
            onPress={() => alert('Book issued successfully')}
            color="#30D158" // Apple's green
          />
        </View>

        {/* Security & Backup Section */}
        <SectionHeader title="Security & Backup" icon="shield-checkmark-outline" />
        <View style={styles.actionsGrid}>
          <ActionButton 
            icon="cloud-upload" 
            title="Backup"
            onPress={() => alert('Backup feature will be available soon')}
            color="#64D2FF" // Apple's blue
          />
          <ActionButton 
            icon="cloud-download" 
            title="Restore"
            onPress={() => alert('Restore feature will be available soon')}
            color="#30D158" // Apple's green
          />
        </View>

        <View style={styles.logsContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="time-outline" size={22} color={theme.primary} />
              <Text style={styles.sectionTitle}>Recent Activity</Text>
            </View>
            <TouchableOpacity onPress={() => navigateTo('/logs')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentLogs.map(log => (
            <LogItem key={log.id} log={log} />
          ))}
        </View>
      </Animatable.View>
      
      {/* Loading overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <Animatable.View animation="pulse" easing="ease-out" iterationCount="infinite">
            <Ionicons name="sync-outline" size={32} color={theme.primary} />
          </Animatable.View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.dark,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 40,
  },
  gradientHeader: {
    width: '100%',
    paddingVertical: 20,
    alignItems: 'center',
    borderRadius: 15,
    marginBottom: 30,
  },
  welcomeText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 32,
    color: theme.text,
    textAlign: 'center',
  },
  subtitleText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: theme.textSecondary,
    marginTop: 8,
  },
  categoryHeader: {
    marginBottom: 15,
    marginTop: 5,
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: theme.text,
    marginLeft: 8,
  },
  categoryDivider: {
    height: 1,
    backgroundColor: theme.border,
    width: '100%',
    opacity: 0.3,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  actionButton: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionGradient: {
    padding: 15,
    borderRadius: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 14,
    color: theme.text,
    textAlign: 'center',
  },
  logsContainer: {
    backgroundColor: theme.darker,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: theme.text,
    marginLeft: 8,
  },
  viewAllText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: theme.primary,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  logIconContainer: {
    marginRight: 12,
  },
  logIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logContent: {
    flex: 1,
  },
  logTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: theme.text,
  },
  logHighlight: {
    color: theme.primary,
  },
  logTime: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  logStatus: {
    paddingLeft: 10,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
});