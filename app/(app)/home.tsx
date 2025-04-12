import { View, ScrollView, StyleSheet, Text, TouchableOpacity, SafeAreaView, StatusBar, Platform, ActivityIndicator } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { Href, router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import CommonHeader from '../../components/Header';
import LogService from '@/services/LogService';
import { Log } from '@/db/schema';

// Define types for the icon names
type IconiconsProps = React.ComponentProps<typeof Ionicons>;
type MaterialIconsProps = React.ComponentProps<typeof MaterialIcons>;
type MaterialCommunityIconsProps = React.ComponentProps<typeof MaterialCommunityIcons>;

export default function Dashboard() {
  const { theme, isDarkMode } = useTheme();
  const [recentLogs, setRecentLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(true);

  // Initialize LogService
  const logService = LogService.getInstance();

  useEffect(() => {
    // Load recent logs when component mounts
    loadRecentLogs();

    // Cleanup function
    return () => {
      logService.close();
    };
  }, []);

  const loadRecentLogs = async () => {
    try {
      setLogsLoading(true);
      await logService.initialize();
      const logs = await logService.getLogs();
      
      // Sort logs by timestamp (most recent first) and get top 5
      const sortedLogs = logs
        .sort((a, b) => b.transaction_datetime - a.transaction_datetime)
        .slice(0, 5);
        
      setRecentLogs(sortedLogs);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const navigateTo = (route: Href) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.push(route);
    }, 300);
  };

  // Function to get icon based on action type
  const getActionIcon = (type: string): IconiconsProps['name'] => {
    switch (type) {
      case 'credential_issuance':
        return 'key-outline';
      case 'credential_presentation':
        return 'id-card-outline';
      case 'authentication':
        return 'lock-closed-outline';
      case 'signature':
        return 'create-outline';
      case 'error':
        return 'alert-circle-outline';
      default:
        return 'ellipsis-horizontal-outline';
    }
  };

  // Format transaction type for display
  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'credential_issuance':
        return 'Credential Issuance';
      case 'credential_presentation':
        return 'Credential Presentation';
      case 'authentication':
        return 'Authentication';
      case 'signature':
        return 'E-Signature';
      case 'error':
        return 'Error';
      default:
        return type.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
    }
  };

  // Format Unix timestamp to readable date
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return `${date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} • ${date.toLocaleDateString()}`;
  };

  // Function to get appropriate color based on status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return theme.success;
      case 'failed':
        return theme.error;
      case 'pending':
        return '#FF9500'; // Apple's orange
      default:
        return theme.textSecondary;
    }
  };

  interface SectionHeaderProps {
    title: string;
    icon: IconiconsProps['name'];
  }

  // Component for section header
  const SectionHeader = ({ title, icon }: SectionHeaderProps) => (
    <View style={styles.categoryHeader}>
      <View style={styles.categoryTitleContainer}>
        <Ionicons name={icon} size={20} color={theme.primary} />
        <Text style={[styles.categoryTitle, { color: theme.text }]}>{title}</Text>
      </View>
      <View style={[styles.categoryDivider, { backgroundColor: theme.border }]} />
    </View>
  );

  interface ActionButtonProps {
    icon: string;
    title: string;
    onPress: () => void;
    color?: string;
    iconProvider?: 'Ionicons' | 'MaterialIcons' | 'MaterialCommunityIcons';
  }

  // Component for action buttons
  const ActionButton = ({ icon, title, onPress, color = theme.primary, iconProvider = 'Ionicons' }: ActionButtonProps) => (
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
          {iconProvider === 'Ionicons' && <Ionicons name={icon as IconiconsProps['name']} size={24} color={color} />}
          {iconProvider === 'MaterialIcons' && <MaterialIcons name={icon as MaterialIconsProps['name']} size={24} color={color} />}
          {iconProvider === 'MaterialCommunityIcons' && <MaterialCommunityIcons name={icon as MaterialCommunityIconsProps['name']} size={24} color={color} />}
        </View>
        <Text style={[styles.actionTitle, { color: theme.text }]}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  // Component for log items
  interface LogItemProps {
    log: Log;
  }

  // Component for log items
  const LogItem = ({ log }: LogItemProps) => (
    <Animatable.View
      animation="fadeIn"
      duration={500}
      style={[styles.logItem, { borderBottomColor: theme.border }]}
    >
      <View style={styles.logIconContainer}>
        <View style={[
          styles.logIcon,
          { backgroundColor: getStatusColor(log.status) + '20' }
        ]}>
          <Ionicons
            name={getActionIcon(log.transaction_type)}
            size={16}
            color={getStatusColor(log.status)}
          />
        </View>
      </View>
      <View style={styles.logContent}>
        <Text style={[styles.logTitle, { color: theme.text }]}>
          {formatTransactionType(log.transaction_type)}: 
          <Text style={[styles.logHighlight, { color: theme.primary }]}> {log.relying_party || 'System'}</Text>
        </Text>
        <Text style={[styles.logTime, { color: theme.textSecondary }]}>
          {formatTimestamp(log.transaction_datetime)}
        </Text>
      </View>
      <View style={styles.logStatus}>
        <Ionicons
          name={log.status === 'success' ? 'checkmark-circle' : log.status === 'pending' ? 'time-outline' : 'close-circle'}
          size={16}
          color={getStatusColor(log.status)}
        />
      </View>
    </Animatable.View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.dark }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.dark} />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.dark }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <CommonHeader title="Trinity Wallet" />
        
        <Animatable.View
          animation="fadeIn"
          duration={1000}
          style={styles.contentContainer}
        >
          {/* Main content with tighter spacing */}
          <View style={styles.mainContent}>
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
                color="#5E5CE6" // Apple's purple
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
                onPress={() => navigateTo('/e-sign')}
                color="#FF2D55" // Apple's pink
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
                title="Library Rental"
                onPress={() => navigateTo('/library-rental')}
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

            <View style={[styles.logsContainer, { backgroundColor: theme.darker, borderColor: theme.border }]}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="time-outline" size={22} color={theme.primary} />
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Activity</Text>
                </View>
                <TouchableOpacity onPress={() => navigateTo('/logs')}>
                  <Text style={[styles.viewAllText, { color: theme.primary }]}>View All</Text>
                </TouchableOpacity>
              </View>

              {logsLoading ? (
                <View style={styles.logsLoadingContainer}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={[styles.logsLoadingText, { color: theme.textSecondary }]}>Loading...</Text>
                </View>
              ) : recentLogs.length > 0 ? (
                recentLogs.map(log => (
                  <LogItem key={log.id} log={log} />
                ))
              ) : (
                <View style={styles.noLogsContainer}>
                  <Text style={[styles.noLogsText, { color: theme.textSecondary }]}>No activity logs found</Text>
                  <TouchableOpacity onPress={loadRecentLogs}>
                    <Text style={[styles.refreshText, { color: theme.primary }]}>Refresh</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
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
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  mainContent: {
    paddingHorizontal: 4,
  },
  categoryHeader: {
    marginBottom: 10,
    marginTop: 10,
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    marginLeft: 8,
  },
  categoryDivider: {
    height: 1,
    width: '100%',
    opacity: 0.3,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    width: '48%',
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionGradient: {
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 14,
    textAlign: 'center',
  },
  logsContainer: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginTop: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    marginLeft: 8,
  },
  viewAllText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  logIconContainer: {
    marginRight: 12,
  },
  logIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logContent: {
    flex: 1,
  },
  logTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  logHighlight: {
    fontFamily: 'Poppins-Medium',
  },
  logTime: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
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
  logsLoadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logsLoadingText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginLeft: 8,
  },
  noLogsContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noLogsText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginBottom: 8,
  },
  refreshText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});