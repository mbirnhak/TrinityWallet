import { View, ScrollView, StyleSheet, Text, TouchableOpacity, TextInput, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import LogService from '@/services/LogService';
import { Log } from '@/db/schema';

export default function Logs() {
  const { theme, isDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Record<string, boolean>>({
    credential_issuance: true,
    credential_presentation: true,
    authentication: true,
    signature: true,
    error: true
  });
  const [selectedStatus, setSelectedStatus] = useState<Record<string, boolean>>({
    success: true,
    failed: true,
    pending: true
  });
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Get LogService instance
  const logService = LogService.getInstance();

  // Load logs when component mounts
  useEffect(() => {
    loadLogs();
  }, []);

  // Function to load logs
  const loadLogs = async () => {
    try {
      setLoading(true);
      const logData = await logService.getLogs();
      
      // Sort logs by timestamp, most recent first
      const sortedLogs = logData.sort((a, b) => b.transaction_datetime - a.transaction_datetime);
      setLogs(sortedLogs);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadLogs();
  };

  // Function to get appropriate icon based on log type
  const getLogIcon = (type: string) => {
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

  // Convert Unix timestamp to readable date
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return `${date.toLocaleDateString()} • ${date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`;
  };

  // Filter logs based on search and filters
  const filteredLogs = useMemo(() => {
    return logs
      .filter(log => {
        // Check if log type is selected
        if (!selectedTypes[log.transaction_type]) return false;
        
        // Check if status is selected
        if (!selectedStatus[log.status]) return false;
        
        // Apply search query filter
        if (searchQuery.trim() === '') return true;
        
        const query = searchQuery.toLowerCase();
        return (
          (log.details?.toLowerCase().includes(query) || false) ||
          log.transaction_type.toLowerCase().includes(query) ||
          (log.relying_party?.toLowerCase().includes(query) || false)
        );
      });
      // Logs are already sorted by date in loadLogs function
  }, [searchQuery, selectedTypes, selectedStatus, logs]);

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
  const renderLogItem = ({ item }: { item: Log }) => (
    <Animatable.View 
      animation="fadeIn" 
      duration={300}
      style={[styles.logItem, { borderColor: theme.border, backgroundColor: theme.darker }]}
    >
      <View style={styles.logHeader}>
        <View style={styles.logIconContainer}>
          <View style={[
            styles.logIcon, 
            { backgroundColor: getStatusColor(item.status) + '20' }
          ]}>
            <Ionicons 
              name={getLogIcon(item.transaction_type)} 
              size={16} 
              color={getStatusColor(item.status)} 
            />
          </View>
        </View>
        
        <View style={styles.logTitleContainer}>
          <Text style={[styles.logTitle, { color: theme.text }]}>
            <Text style={[styles.logType, { color: theme.primary }]}>
              {formatTransactionType(item.transaction_type)}:
            </Text> {item.relying_party || 'System'}
          </Text>
          
          <Text style={[styles.logDate, { color: theme.textSecondary }]}>
            {formatTimestamp(item.transaction_datetime)}
          </Text>
        </View>
        
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusIndicator, 
            { backgroundColor: getStatusColor(item.status) }
          ]}>
            <Text style={[styles.statusText, { color: theme.dark }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.logDetailsContainer}>
        <Text style={[styles.logDetails, { color: theme.textSecondary }]}>{item.details || 'No details provided'}</Text>
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
        { borderColor: isActive ? color : theme.border },
        isActive && { backgroundColor: color + '30' }
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.filterPillText, 
        { color: isActive ? color : theme.textSecondary }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.dark }]}>
      <View style={[styles.header, { backgroundColor: theme.dark }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Activity Logs</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.searchContainer, { borderBottomColor: theme.border }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: theme.darker, borderColor: theme.border }]}>
          <Ionicons name="search" size={18} color={theme.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
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
      
      <View style={[styles.filtersContainer, { borderBottomColor: theme.border }]}>
        <Text style={[styles.filterLabel, { color: theme.text }]}>Transaction Type:</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPills}
        >
          <FilterPill 
            label="Issuance" 
            isActive={selectedTypes.credential_issuance} 
            onPress={() => toggleTypeFilter('credential_issuance')}
            color={theme.primary}
          />
          <FilterPill 
            label="Presentation" 
            isActive={selectedTypes.credential_presentation} 
            onPress={() => toggleTypeFilter('credential_presentation')}
            color="#5E5CE6" // Apple's purple
          />
          <FilterPill 
            label="Authentication" 
            isActive={selectedTypes.authentication} 
            onPress={() => toggleTypeFilter('authentication')}
            color="#64D2FF" // Apple's blue
          />
          <FilterPill 
            label="E-Signature" 
            isActive={selectedTypes.signature} 
            onPress={() => toggleTypeFilter('signature')}
            color="#FF2D55" // Apple's pink
          />
          <FilterPill 
            label="Error" 
            isActive={selectedTypes.error} 
            onPress={() => toggleTypeFilter('error')}
            color={theme.error} // Error color
          />
        </ScrollView>
        
        <Text style={[styles.filterLabel, { color: theme.text }]}>Status:</Text>
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

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading logs...</Text>
        </View>
      ) : filteredLogs.length > 0 ? (
        <FlatList
          data={filteredLogs}
          renderItem={renderLogItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.logsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.primary]}
            />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color={theme.textSecondary} />
          <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>No logs found</Text>
          <Text style={[styles.emptyStateSubtext, { color: theme.textSecondary }]}>
            Try adjusting your filters or search query
          </Text>
          <TouchableOpacity 
            style={[styles.refreshButton, { backgroundColor: theme.primary }]} 
            onPress={loadLogs}
          >
            <Text style={[styles.refreshButtonText, { color: theme.dark }]}>Refresh</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filterLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
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
    marginRight: 8,
  },
  filterPillText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
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
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  logHeader: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
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
  },
  logType: {
    fontFamily: 'Poppins-Bold',
  },
  logDate: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
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
  },
  logDetailsContainer: {
    padding: 12,
  },
  logDetails: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
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
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    marginTop: 8,
    opacity: 0.8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    marginTop: 12,
  },
  refreshButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  refreshButtonText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 14,
  },
});