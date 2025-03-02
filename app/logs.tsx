import { View, ScrollView, StyleSheet, Text, TouchableOpacity, TextInput, FlatList } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState, useMemo } from 'react';
import { router } from 'expo-router';
import { theme } from './(app)/_layout';

// Log entry type definition
type LogEntry = {
  id: number;
  type: 'issuance' | 'presentation' | 'backup' | 'restore' | 'signature';
  credential: string;
  date: Date;
  status: 'success' | 'failed' | 'pending';
  details: string;
};

// Placeholder log data
const PLACEHOLDER_LOGS: LogEntry[] = [
  { id: 1, type: 'issuance', credential: 'PID (SD-JWT)', date: new Date(2025, 2, 1, 10, 30), status: 'success', details: 'Credential issued successfully' },
  { id: 2, type: 'presentation', credential: 'Trinity Library', date: new Date(2025, 2, 1, 9, 15), status: 'success', details: 'Credential presented to service provider' },
  { id: 3, type: 'presentation', credential: 'PID (mDOC)', date: new Date(2025, 1, 28, 14, 22), status: 'success', details: 'Credential presented to service provider' },
  { id: 4, type: 'issuance', credential: 'Trinity Door Lock', date: new Date(2025, 1, 28, 11, 5), status: 'success', details: 'Credential issued successfully' },
  { id: 5, type: 'presentation', credential: 'PID (SD-JWT)', date: new Date(2025, 1, 27, 16, 40), status: 'failed', details: 'Connection timed out' },
  { id: 6, type: 'backup', credential: 'All credentials', date: new Date(2025, 1, 26, 8, 30), status: 'success', details: 'Backup completed successfully' },
  { id: 7, type: 'presentation', credential: 'Trinity Library', date: new Date(2025, 1, 25, 13, 10), status: 'success', details: 'Credential presented to service provider' },
  { id: 8, type: 'issuance', credential: 'PID (SD-JWT)', date: new Date(2025, 1, 25, 10, 45), status: 'success', details: 'Credential issued successfully' },
  { id: 9, type: 'signature', credential: 'E-Signature', date: new Date(2025, 1, 24, 14, 30), status: 'success', details: 'Document signed successfully' },
  { id: 10, type: 'restore', credential: 'All credentials', date: new Date(2025, 1, 23, 9, 0), status: 'success', details: 'Restore completed successfully' },
  { id: 11, type: 'presentation', credential: 'Trinity Door Lock', date: new Date(2025, 1, 22, 8, 15), status: 'success', details: 'Credential presented to service provider' },
  { id: 12, type: 'presentation', credential: 'PID (mDOC)', date: new Date(2025, 1, 20, 16, 20), status: 'failed', details: 'Verifier service unavailable' },
];

export default function Logs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Record<string, boolean>>({
    issuance: true,
    presentation: true,
    backup: true,
    restore: true,
    signature: true
  });
  const [selectedStatus, setSelectedStatus] = useState<Record<string, boolean>>({
    success: true,
    failed: true,
    pending: true
  });

  // Function to get appropriate icon based on log type
  const getLogIcon = (type: string) => {
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
      default:
        return 'document-outline';
    }
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

  // Filter logs based on search and filters
  const filteredLogs = useMemo(() => {
    return PLACEHOLDER_LOGS
      .filter(log => {
        // Check if log type is selected
        if (!selectedTypes[log.type]) return false;
        
        // Check if status is selected
        if (!selectedStatus[log.status]) return false;
        
        // Apply search query filter
        if (searchQuery.trim() === '') return true;
        
        const query = searchQuery.toLowerCase();
        return (
          log.credential.toLowerCase().includes(query) ||
          log.type.toLowerCase().includes(query) ||
          log.details.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date (newest first)
  }, [searchQuery, selectedTypes, selectedStatus]);

  // Toggle filter selection
  const toggleTypeFilter = (type: string) => {
    setSelectedTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const toggleStatusFilter = (status: string) => {
    setSelectedStatus(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  // Render a single log item
  const renderLogItem = ({ item }: { item: LogEntry }) => (
    <Animatable.View 
      animation="fadeIn" 
      duration={300}
      style={styles.logItem}
    >
      <View style={styles.logHeader}>
        <View style={styles.logIconContainer}>
          <View style={[
            styles.logIcon, 
            { backgroundColor: getStatusColor(item.status) + '20' }
          ]}>
            <Ionicons 
              name={getLogIcon(item.type)} 
              size={16} 
              color={getStatusColor(item.status)} 
            />
          </View>
        </View>
        
        <View style={styles.logTitleContainer}>
          <Text style={styles.logTitle}>
            <Text style={styles.logType}>
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}:
            </Text> {item.credential}
          </Text>
          
          <Text style={styles.logDate}>
            {item.date.toLocaleDateString()} • {item.date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
          </Text>
        </View>
        
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusIndicator, 
            { backgroundColor: getStatusColor(item.status) }
          ]}>
            <Text style={styles.statusText}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.logDetailsContainer}>
        <Text style={styles.logDetails}>{item.details}</Text>
      </View>
    </Animatable.View>
  );

  // Filter pill component
  const FilterPill = ({ 
    label, 
    isActive, 
    onPress, 
    color = theme.primary 
  }: { 
    label: string; 
    isActive: boolean; 
    onPress: () => void; 
    color?: string;
  }) => (
    <TouchableOpacity
      style={[
        styles.filterPill, 
        isActive && { backgroundColor: color + '30', borderColor: color }
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.filterPillText, 
        isActive && { color }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity Logs</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={18} color={theme.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search logs..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <View style={styles.filtersContainer}>
        <Text style={styles.filterLabel}>Transaction Type:</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPills}
        >
          <FilterPill 
            label="Issuance" 
            isActive={selectedTypes.issuance} 
            onPress={() => toggleTypeFilter('issuance')}
            color={theme.primary}
          />
          <FilterPill 
            label="Presentation" 
            isActive={selectedTypes.presentation} 
            onPress={() => toggleTypeFilter('presentation')}
            color="#5E5CE6" // Apple's purple
          />
          <FilterPill 
            label="Backup" 
            isActive={selectedTypes.backup} 
            onPress={() => toggleTypeFilter('backup')}
            color="#64D2FF" // Apple's blue
          />
          <FilterPill 
            label="Restore" 
            isActive={selectedTypes.restore} 
            onPress={() => toggleTypeFilter('restore')}
            color="#30D158" // Apple's green
          />
          <FilterPill 
            label="Signature" 
            isActive={selectedTypes.signature} 
            onPress={() => toggleTypeFilter('signature')}
            color="#FF9500" // Apple's orange
          />
        </ScrollView>
        
        <Text style={styles.filterLabel}>Status:</Text>
        <View style={styles.statusFilters}>
          <FilterPill 
            label="Success" 
            isActive={selectedStatus.success} 
            onPress={() => toggleStatusFilter('success')}
            color={theme.success}
          />
          <FilterPill 
            label="Failed" 
            isActive={selectedStatus.failed} 
            onPress={() => toggleStatusFilter('failed')}
            color={theme.error}
          />
          <FilterPill 
            label="Pending" 
            isActive={selectedStatus.pending} 
            onPress={() => toggleStatusFilter('pending')}
            color="#FF9500" // Apple's orange
          />
        </View>
      </View>

      {filteredLogs.length > 0 ? (
        <FlatList
          data={filteredLogs}
          renderItem={renderLogItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.logsList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color={theme.textSecondary} />
          <Text style={styles.emptyStateText}>No logs found</Text>
          <Text style={styles.emptyStateSubtext}>
            Try adjusting your filters or search query
          </Text>
        </View>
      )}
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.darker,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: theme.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: theme.text,
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  filterLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: theme.text,
    marginBottom: 8,
  },
  filterPills: {
    paddingRight: 16,
    paddingBottom: 12,
    gap: 8,
    flexDirection: 'row',
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginRight: 8,
  },
  filterPillText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: theme.textSecondary,
  },
  statusFilters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  logsList: {
    padding: 16,
  },
  logItem: {
    marginBottom: 16,
    backgroundColor: theme.darker,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.border,
  },
  logHeader: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
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
  logTitleContainer: {
    flex: 1,
  },
  logTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: theme.text,
  },
  logType: {
    fontFamily: 'Poppins-Bold',
    color: theme.primary,
  },
  logDate: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  statusContainer: {
    marginLeft: 8,
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 10,
    color: theme.dark,
  },
  logDetailsContainer: {
    padding: 12,
  },
  logDetails: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 18,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 50,
  },
  emptyStateText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 18,
    color: theme.textSecondary,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 8,
    opacity: 0.8,
  },
});