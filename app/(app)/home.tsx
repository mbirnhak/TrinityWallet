import { View, ScrollView, StyleSheet, Text, TouchableOpacity, SafeAreaView, StatusBar, Platform } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { Href, router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { BlurView } from 'expo-blur';
import CommonHeader from '../../components/Header';

// Define types for the icon names
type IconiconsProps = React.ComponentProps<typeof Ionicons>;
type MaterialIconsProps = React.ComponentProps<typeof MaterialIcons>;
type MaterialCommunityIconsProps = React.ComponentProps<typeof MaterialCommunityIcons>;

interface LogItem {
  id: number;
  type: string;
  credential: string;
  date: Date;
  status: string;
}

// Placeholder log data
const PLACEHOLDER_LOGS: LogItem[] = [
  { id: 1, type: 'issuance', credential: 'PID (SD-JWT)', date: new Date(2025, 2, 1, 10, 30), status: 'success' },
  { id: 2, type: 'presentation', credential: 'Trinity Library', date: new Date(2025, 2, 1, 9, 15), status: 'success' },
  { id: 3, type: 'presentation', credential: 'PID (mDOC)', date: new Date(2025, 1, 28, 14, 22), status: 'success' },
  { id: 4, type: 'issuance', credential: 'Trinity Door Lock', date: new Date(2025, 1, 28, 11, 5), status: 'success' },
  { id: 5, type: 'presentation', credential: 'PID (SD-JWT)', date: new Date(2025, 1, 27, 16, 40), status: 'failed' },
  { id: 6, type: 'access', credential: 'Main Office Door', date: new Date(2025, 1, 27, 14, 15), status: 'success' },
  { id: 7, type: 'transaction', credential: 'Library Book', date: new Date(2025, 1, 26, 11, 30), status: 'success' },
];

export default function Dashboard() {
  const { theme, isDarkMode } = useTheme();
  const [recentLogs, setRecentLogs] = useState<LogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // In a real implementation, this would fetch actual logs from storage or API
    setRecentLogs(PLACEHOLDER_LOGS.slice(0, 5));
  }, []);

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
    log: LogItem;
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
        <Text style={[styles.logTitle, { color: theme.text }]}>
          {log.type === 'issuance' ? 'Issued: ' :
            log.type === 'presentation' ? 'Presented: ' :
              log.type === 'access' ? 'Accessed: ' :
                log.type === 'transaction' ? 'Transaction: ' : ''}
          <Text style={[styles.logHighlight, { color: theme.primary }]}>{log.credential}</Text>
        </Text>
        <Text style={[styles.logTime, { color: theme.textSecondary }]}>
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
                onPress={() => navigateTo('/e-sign')}
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

              {recentLogs.map(log => (
                <LogItem key={log.id} log={log} />
              ))}
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
});