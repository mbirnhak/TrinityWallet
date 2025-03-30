import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define light and dark theme objects
export const lightTheme = {
  dark: '#FFFFFF',
  darker: '#F2F2F7',
  primary: '#007AFF',
  primaryDark: '#0062CC',
  secondary: '#5856D6',
  accent: '#FF9500',
  text: '#000000',
  textSecondary: '#3A3A3C',
  surface: '#F2F2F7',
  border: '#D1D1D6',
  error: '#FF3B30',
  success: '#34C759',
  background: '#FFFFFF',
};

export const darkTheme = {
  dark: '#000000',
  darker: '#1C1C1E',
  primary: '#0A84FF',
  primaryDark: '#0774E5',
  secondary: '#5E5CE6',
  accent: '#FF9F0A',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  surface: '#1C1C1E',
  border: '#38383A',
  error: '#FF453A',
  success: '#30D158',
  background: '#000000',
};

// Create the context
const ThemeContext = createContext({
  isDarkMode: true,
  theme: darkTheme,
  toggleTheme: () => {},
});

// Create a provider component
import { ReactNode } from 'react';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [theme, setTheme] = useState(darkTheme);

  // Load saved theme preference on initial load
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Save theme preference to AsyncStorage whenever it changes
  useEffect(() => {
    saveThemePreference();
  }, [isDarkMode]);

  const loadThemePreference = async () => {
    try {
      const value = await AsyncStorage.getItem('@theme_mode');
      if (value !== null) {
        const savedMode = value === 'dark';
        setIsDarkMode(savedMode);
        setTheme(savedMode ? darkTheme : lightTheme);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
  };

  const saveThemePreference = async () => {
    try {
      await AsyncStorage.setItem('@theme_mode', isDarkMode ? 'dark' : 'light');
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  // Toggle between light and dark themes
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    setTheme(!isDarkMode ? darkTheme : lightTheme);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook for using the theme
export const useTheme = () => useContext(ThemeContext);