import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Card type definitions
const CARD_CONFIGS = {
  pid: {
    title: 'Personal ID',
    icon: 'person-outline',
    gradientColors: ['#4F6CF7', '#2541C9', '#1A237E'],
    textColor: '#FFFFFF',
  },
  msisdn: {
    title: 'Mobile Number',
    icon: 'call-outline',
    gradientColors: ['#FF8A65', '#D84315', '#BF360C'],
    textColor: '#FFFFFF',
  },
  ehic: {
    title: 'Health Insurance Card',
    icon: 'medical-outline',
    gradientColors: ['#26A69A', '#00796B', '#004D40'],
    textColor: '#FFFFFF',
  },
  age_verification: {
    title: 'Age Verification',
    icon: 'shield-checkmark-outline',
    gradientColors: ['#9C27B0', '#6A1B9A', '#4A148C'],
    textColor: '#FFFFFF',
  },
  iban: {
    title: 'Bank Account',
    // Premium metallic finish like Apple Card
    icon: 'cash-outline',
    gradientColors: ['#D8D8D8', '#E8E8E8', '#FFFFFF'],
    textColor: '#000000',
  },
  health_id: {
    title: 'Health ID',
    icon: 'fitness-outline',
    gradientColors: ['#42A5F5', '#0D47A1', '#082A74'],
    textColor: '#FFFFFF',
  },
  tax: {
    title: 'Tax ID',
    icon: 'document-text-outline',
    gradientColors: ['#5C6BC0', '#303F9F', '#1A237E'],
    textColor: '#FFFFFF',
  },
  pda1: {
    title: 'Driving License',
    icon: 'car-outline',
    gradientColors: ['#FFA726', '#E65100', '#BF360C'],
    textColor: '#FFFFFF',
  },
  por: {
    title: 'Place of Residence',
    icon: 'home-outline',
    gradientColors: ['#78909C', '#455A64', '#263238'],
    textColor: '#FFFFFF',
  }
};

const CredentialCard = ({ type, isAvailable, timestamp, onPress, onDelete, theme }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;
  
  // Get card configuration or use defaults
  const cardConfig = CARD_CONFIGS[type] || {
    title: type.toUpperCase().replace('_', ' '),
    icon: 'card-outline',
    gradientColors: ['#757575', '#424242', '#212121'],
    textColor: '#FFFFFF',
  };
  
  const handlePress = () => {
    if (!isAvailable) return;
    
    setIsExpanded(!isExpanded);
    Animated.spring(expandAnim, {
      toValue: isExpanded ? 0 : 1,
      tension: 50,
      friction: 12,
      useNativeDriver: false,
    }).start();
  };

  const handleViewDetails = () => {
    onPress && onPress();
  };

  const handleDelete = () => {
    onDelete && onDelete();
  };

  const cardHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [220, 380] // Increased height to accommodate delete button
  });

  const cardScale = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.02]
  });
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Date not available';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      return 'Date format error';
    }
  };
  
  return (
    <Animated.View style={[
      styles.cardContainer,
      {
        height: cardHeight,
        transform: [{ scale: cardScale }],
        opacity: isAvailable ? 1 : 0.6
      }
    ]}>
      <TouchableOpacity 
        activeOpacity={0.95} 
        onPress={handlePress}
        style={styles.touchable}
        disabled={!isAvailable}
      >
        <LinearGradient
          colors={isAvailable ? cardConfig.gradientColors : ['#9E9E9E', '#616161', '#424242']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardContent}
        >
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons 
                name={cardConfig.icon} 
                size={28} 
                color={cardConfig.textColor} 
                style={styles.icon}
              />
              <View>
                <Text style={[
                  styles.title,
                  { color: cardConfig.textColor }
                ]}>
                  {cardConfig.title}
                </Text>
                <Text style={[
                  styles.subtitle,
                  { color: cardConfig.textColor }
                ]}>
                  {isAvailable ? 'Valid' : 'Not Available'}
                </Text>
              </View>
            </View>
            
            {isAvailable && (
              <Ionicons 
                name="checkmark-circle" 
                size={24} 
                color={cardConfig.textColor}
                style={{ opacity: 0.8 }}
              />
            )}
          </View>

          <View style={styles.typeContainer}>
            <Text style={[styles.typeText, { color: cardConfig.textColor }]}>
              {type.toUpperCase().replace('_', ' ')}
            </Text>
          </View>

          {isExpanded && isAvailable && (
            <Animatable.View 
              animation="fadeIn"
              duration={400}
              style={styles.details}
            >
              <View style={[styles.divider, { backgroundColor: cardConfig.textColor }]} />
              
              <View style={styles.detailsRow}>
                <Text style={[styles.detailsLabel, { color: cardConfig.textColor }]}>
                  ISSUED
                </Text>
                <Text style={[styles.detailsValue, { color: cardConfig.textColor }]}>
                  {formatDate(timestamp)}
                </Text>
              </View>

              {/* Button container for View and Delete buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[
                    styles.actionButton, 
                    { 
                      backgroundColor: type === 'iban' ? 
                        theme.primary : // For light cards, use theme color
                        'rgba(255, 255, 255, 0.2)' // For dark cards, use semi-transparent white
                    }
                  ]}
                  onPress={handleViewDetails}
                >
                  <Ionicons name="eye-outline" size={18} color={type === 'iban' ? '#FFFFFF' : cardConfig.textColor} />
                  <Text style={[
                    styles.buttonText, 
                    { 
                      color: type === 'iban' ? 
                        '#FFFFFF' : 
                        cardConfig.textColor 
                    }
                  ]}>
                    View Details
                  </Text>
                </TouchableOpacity>

                {/* New Delete Button */}
                <TouchableOpacity 
                  style={[
                    styles.actionButton, 
                    styles.deleteButton,
                    { 
                      backgroundColor: type === 'iban' ? 
                        theme.error : // For light cards, use theme color
                        'rgba(255, 100, 100, 0.3)' // For dark cards, use semi-transparent red
                    }
                  ]}
                  onPress={handleDelete}
                >
                  <Ionicons name="trash-outline" size={18} color={type === 'iban' ? '#FFFFFF' : cardConfig.textColor} />
                  <Text style={[
                    styles.buttonText, 
                    { 
                      color: type === 'iban' ? 
                        '#FFFFFF' : 
                        cardConfig.textColor 
                    }
                  ]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </Animatable.View>
          )}
          
          {/* Card embellishments */}
          <View style={styles.cardChip} />
          <View style={styles.cardPattern} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: '100%',
    marginVertical: 10,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  touchable: {
    flex: 1,
  },
  cardContent: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
  },
  subtitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    opacity: 0.8,
    marginTop: -2,
  },
  typeContainer: {
    marginTop: 30,
  },
  typeText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 28,
    letterSpacing: 2,
    opacity: 0.9,
  },
  details: {
    marginTop: 20,
  },
  divider: {
    height: 0.5,
    opacity: 0.3,
    marginVertical: 15,
  },
  detailsRow: {
    marginTop: 10,
  },
  detailsLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  detailsValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
  },
  // New styles for button container and buttons
  buttonContainer: {
    marginTop: 20,
    flexDirection: 'column',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
  },
  deleteButton: {
    // Specific styles for delete button
  },
  buttonText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    marginLeft: 8,
  },
  // Credit card embellishments
  cardChip: {
    position: 'absolute',
    width: 32,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    top: 90,
    left: 20,
  },
  cardPattern: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    bottom: -30,
    right: -30,
  },
});

export default CredentialCard;