import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Card type definitions with enhanced color schemes
const CARD_CONFIGS: Record<string, {
  title: string;
  icon: string;
  gradientColors: string[];
  textColor: string;
  buttonGradient?: string[];
  buttonTextColor?: string;
  iconBackgroundColor?: string;
}> = {
  pid: {
    title: 'Personal ID',
    icon: 'person-outline',
    gradientColors: ['#4F6CF7', '#2541C9', '#1A237E'],
    textColor: '#FFFFFF',
    buttonGradient: ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)'],
    buttonTextColor: '#FFFFFF',
    iconBackgroundColor: 'rgba(255,255,255,0.15)',
  },
  msisdn: {
    title: 'Mobile Number',
    icon: 'call-outline',
    gradientColors: ['#FF8A65', '#D84315', '#BF360C'],
    textColor: '#FFFFFF',
    buttonGradient: ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)'],
    buttonTextColor: '#FFFFFF',
    iconBackgroundColor: 'rgba(255,255,255,0.15)',
  },
  ehic: {
    title: 'Health Insurance',
    icon: 'medical-outline',
    gradientColors: ['#26A69A', '#00796B', '#004D40'],
    textColor: '#FFFFFF',
    buttonGradient: ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)'],
    buttonTextColor: '#FFFFFF',
    iconBackgroundColor: 'rgba(255,255,255,0.15)',
  },
  age_over: {
    title: 'Age Verification',
    icon: 'shield-checkmark-outline',
    gradientColors: ['#9C27B0', '#6A1B9A', '#4A148C'],
    textColor: '#FFFFFF',
    buttonGradient: ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)'],
    buttonTextColor: '#FFFFFF',
    iconBackgroundColor: 'rgba(255,255,255,0.15)',
  },
  iban: {
    title: 'Bank Account',
    icon: 'cash-outline',
    gradientColors: ['#2C2C2E', '#1C1C1E', '#0C0C0E'],
    textColor: '#FFFFFF',
    buttonGradient: ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)'],
    buttonTextColor: '#FFFFFF',
    iconBackgroundColor: 'rgba(255,255,255,0.15)',
  },
  health_id: {
    title: 'Health ID',
    icon: 'fitness-outline',
    gradientColors: ['#42A5F5', '#0D47A1', '#082A74'],
    textColor: '#FFFFFF',
    buttonGradient: ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)'],
    buttonTextColor: '#FFFFFF',
    iconBackgroundColor: 'rgba(255,255,255,0.15)',
  },
  tax: {
    title: 'Tax ID',
    icon: 'document-text-outline',
    gradientColors: ['#5C6BC0', '#303F9F', '#1A237E'],
    textColor: '#FFFFFF',
    buttonGradient: ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)'],
    buttonTextColor: '#FFFFFF',
    iconBackgroundColor: 'rgba(255,255,255,0.15)',
  },
  pda1: {
    title: 'Driving License',
    icon: 'car-outline',
    gradientColors: ['#FFA726', '#E65100', '#BF360C'],
    textColor: '#FFFFFF',
    buttonGradient: ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)'],
    buttonTextColor: '#FFFFFF',
    iconBackgroundColor: 'rgba(255,255,255,0.15)',
  },
  por: {
    title: 'Place of Residence',
    icon: 'home-outline',
    gradientColors: ['#78909C', '#455A64', '#263238'],
    textColor: '#FFFFFF',
    buttonGradient: ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)'],
    buttonTextColor: '#FFFFFF',
    iconBackgroundColor: 'rgba(255,255,255,0.15)',
  },
  student_id: {
    // Apple Card aesthetic for Student ID
    title: 'Student ID',
    icon: 'school-outline',
    gradientColors: ['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.7)'],
    textColor: '#FFFFFF',
    buttonGradient: ['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.2)'],
    buttonTextColor: '#FFFFFF',
    iconBackgroundColor: 'rgba(255,255,255,0.2)',
  },
  default: {
    title: 'Generic Credential',
    icon: 'document-outline',
    gradientColors: ['#757575', '#424242', '#212121'],
    textColor: '#FFFFFF',
    buttonGradient: ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)'],
    buttonTextColor: '#FFFFFF',
    iconBackgroundColor: 'rgba(255,255,255,0.15)',
  }
};

const CredentialCard = ({ type, isAvailable, timestamp, onPress, onDelete, theme }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;

  const cardConfig = CARD_CONFIGS[type] || CARD_CONFIGS.default;

  const handlePress = () => {
    if (!isAvailable) return;
    setIsExpanded(prev => !prev);
    Animated.spring(expandAnim, {
      toValue: isExpanded ? 0 : 1,
      tension: 50,
      friction: 12,
      useNativeDriver: false,
    }).start();
  };

  const handleViewDetails = () => onPress && onPress();
  const handleDelete = () => onDelete && onDelete();

  const cardHeight = expandAnim.interpolate({ inputRange: [0,1], outputRange: [220, 380] });
  const cardScale = expandAnim.interpolate({ inputRange: [0,1], outputRange: [1,1.02] });

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return 'Invalid date'; }
  };

  const isStudentId = type === 'student_id';

  const renderExpandedContent = () => (
    <Animatable.View animation="fadeIn" duration={400} style={styles.details}>
      <View style={[styles.divider, { backgroundColor: cardConfig.textColor, opacity: 0.5 }]} />
      <View style={styles.detailsRow}>
        <Text style={[styles.detailsLabel, { color: cardConfig.textColor }]}>ISSUED</Text>
        <Text style={[styles.detailsValue, { color: cardConfig.textColor }]}>{formatDate(timestamp)}</Text>
      </View>
      <View style={styles.detailsRow}>
        <Text style={[styles.detailsLabel, { color: cardConfig.textColor }]}>EXPIRES</Text>
        <Text style={[styles.detailsValue, { color: cardConfig.textColor }]}>
          {formatDate(new Date(new Date(timestamp).setFullYear(new Date(timestamp).getFullYear() + 5)).toString())}
        </Text>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { 
            backgroundColor: isStudentId ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.15)',
            borderColor: isStudentId ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)',
            borderWidth: 1
          }]}
          onPress={handleViewDetails}
        >
          <Ionicons name="eye-outline" size={18} color={cardConfig.buttonTextColor || cardConfig.textColor} />
          <Text style={[styles.buttonText, { color: cardConfig.buttonTextColor || cardConfig.textColor }]}>View Details</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
          <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Animatable.View>
  );

  // Different rendering for Student ID to allow full image coverage
  if (isStudentId) {
    return (
      <Animated.View style={[
        styles.cardContainer,
        { height: cardHeight, transform: [{ scale: cardScale }], opacity: isAvailable ? 1 : 0.6 }
      ]}>
        <TouchableOpacity activeOpacity={0.95} onPress={handlePress} style={styles.touchable} disabled={!isAvailable}>
          <View style={styles.studentIdContainer}>
            <Image
              source={require('@/assets/images/banty.jpeg')}
              style={styles.fullCoverImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.85)']}
              style={styles.studentIdOverlay}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <View style={styles.studentIdContent}>
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <View style={[styles.iconContainer, { backgroundColor: cardConfig.iconBackgroundColor || 'rgba(255,255,255,0.2)' }]}>
                    <Ionicons name={cardConfig.icon} size={24} color={cardConfig.textColor} style={styles.icon} />
                  </View>
                  <View>
                    <Text style={[styles.title, { color: cardConfig.textColor }]}>{cardConfig.title}</Text>
                    <Text style={[styles.subtitle, { color: cardConfig.textColor }]}>
                      {isAvailable ? 'Valid' : 'Unavailable'}
                    </Text>
                  </View>
                </View>
                <View style={styles.headerActions}>
                  <TouchableOpacity onPress={handleViewDetails} style={[styles.iconButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Ionicons name="eye-outline" size={18} color={cardConfig.textColor} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDelete} style={[styles.iconButton, { backgroundColor: 'rgba(255,59,48,0.3)' }]}>
                    <Ionicons name="trash-outline" size={18} color={cardConfig.textColor} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.typeContainer}>
                <Text style={[styles.typeText, { color: cardConfig.textColor }]}>
                  {type.toUpperCase().replace('_',' ')}
                </Text>
              </View>
              {isExpanded && isAvailable && renderExpandedContent()}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Standard card rendering for other types
  return (
    <Animated.View style={[
      styles.cardContainer,
      { height: cardHeight, transform: [{ scale: cardScale }], opacity: isAvailable ? 1 : 0.6 }
    ]}>
      <TouchableOpacity activeOpacity={0.95} onPress={handlePress} style={styles.touchable} disabled={!isAvailable}>
        <LinearGradient
          colors={isAvailable ? cardConfig.gradientColors : ['#9E9E9E','#616161','#424242']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.cardContent}
        >
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.iconContainer, { backgroundColor: cardConfig.iconBackgroundColor || 'rgba(255,255,255,0.15)' }]}>
                <Ionicons name={cardConfig.icon} size={24} color={cardConfig.textColor} style={styles.icon} />
              </View>
              <View>
                <Text style={[styles.title, { color: cardConfig.textColor }]}>{cardConfig.title}</Text>
                <Text style={[styles.subtitle, { color: cardConfig.textColor }]}>
                  {isAvailable ? 'Valid' : 'Unavailable'}
                </Text>
              </View>
            </View>
            {isAvailable && (
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={handleViewDetails} style={[styles.iconButton, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                  <Ionicons name="eye-outline" size={18} color={cardConfig.textColor} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDelete} style={[styles.iconButton, { backgroundColor: 'rgba(255,59,48,0.2)' }]}>
                  <Ionicons name="trash-outline" size={18} color={cardConfig.textColor} />
                </TouchableOpacity>
              </View>
            )}
          </View>
          <View style={styles.typeContainer}>
            <Text style={[styles.typeText, { color: cardConfig.textColor }]}> {type.toUpperCase().replace('_',' ')} </Text>
          </View>
          {isExpanded && isAvailable && renderExpandedContent()}
          <View style={styles.cardChip} />
          <View style={[styles.cardPattern, { backgroundColor: `${cardConfig.textColor}10` }]} />
          <View style={[styles.cardPatternTwo, { backgroundColor: `${cardConfig.textColor}08` }]} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: { 
    width: '100%', 
    marginVertical: 10, 
    borderRadius: 24, 
    overflow: 'hidden', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 10, 
    elevation: 8 
  },
  touchable: { flex: 1 },
  cardContent: { 
    flex: 1, 
    padding: 22, 
    borderRadius: 24, 
    position: 'relative',
    overflow: 'hidden'
  },
  // Student ID specific styles
  studentIdContainer: {
    flex: 1,
    position: 'relative',
    borderRadius: 24,
    overflow: 'hidden'
  },
  fullCoverImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 24
  },
  studentIdOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 24
  },
  studentIdContent: {
    flex: 1,
    padding: 22,
    position: 'relative',
    zIndex: 2
  },
  // Common styles
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    zIndex: 3
  },
  titleRow: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  icon: {
    textAlign: 'center',
  },
  title: { 
    fontFamily: 'Poppins-Bold', 
    fontSize: 22,
    letterSpacing: -0.5
  },
  subtitle: { 
    fontFamily: 'Poppins-Medium', 
    fontSize: 16, 
    opacity: 0.8, 
    marginTop: -2 
  },
  headerActions: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  iconButton: { 
    marginLeft: 8, 
    padding: 4,
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  typeContainer: { 
    marginTop: 35,
    zIndex: 3
  },
  typeText: { 
    fontFamily: 'Poppins-Bold', 
    fontSize: 28, 
    letterSpacing: 1.5, 
    opacity: 0.95 
  },
  details: { 
    marginTop: 25,
    zIndex: 3,
    paddingBottom: 30 // Add padding at the bottom for expanded content
  },
  divider: { 
    height: 1, 
    marginVertical: 12 
  },
  detailsRow: { 
    marginTop: 8,
    marginBottom: 4
  },
  detailsLabel: { 
    fontFamily: 'Poppins-Medium', 
    fontSize: 12, 
    opacity: 0.7, 
    marginBottom: -2
  },
  detailsValue: { 
    fontFamily: 'Poppins-Bold', 
    fontSize: 16 
  },
  buttonContainer: { 
    marginTop: 22, 
    flexDirection: 'column', 
    gap: 10,
    zIndex: 3
  },
  actionButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 14, 
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  deleteButton: { 
    backgroundColor: 'rgba(255,59,48,0.9)',
    marginBottom: 5 // Extra margin at the bottom to ensure visibility
  },
  buttonText: { 
    fontFamily: 'Poppins-Bold', 
    fontSize: 16, 
    marginLeft: 8 
  },
  cardChip: { 
    position: 'absolute', 
    width: 38, 
    height: 28, 
    backgroundColor: 'rgba(255,255,255,0.25)', 
    borderRadius: 6,
    top: 100,
    left: 22,
    zIndex: 2
  },
  cardPattern: { 
    position: 'absolute', 
    width: 220, 
    height: 280, 
    borderRadius: 110, 
    bottom: -80, 
    right: -60,
    zIndex: 1
  },
  cardPatternTwo: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    top: -30,
    right: 80,
    zIndex: 1
  }
});

export default CredentialCard;