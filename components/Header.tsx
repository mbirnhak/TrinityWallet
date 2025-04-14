import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';

interface HeaderProps {
  title: string;
}

const CommonHeader: React.FC<HeaderProps> = ({ title }) => {
  const { theme, isDarkMode } = useTheme();
  
  return (
    <Animatable.View 
      animation="fadeInDown" 
      duration={800}
      style={styles.headerContainer}
    >
      <Text style={[styles.headerText, { color: theme.text }]}>{title}</Text>
      <View style={[styles.divider, { 
        backgroundColor: isDarkMode ? 
          'rgba(255, 255, 255, 0.2)' : 
          'rgba(0, 0, 0, 0.1)' 
      }]} />
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    paddingTop: Platform.OS === 'ios' ? 10 : 40,
    paddingBottom: 15,
    alignItems: 'center',
  },
  headerText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 32,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    width: '85%',
  },
});

export default CommonHeader;