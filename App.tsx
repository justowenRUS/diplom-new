import React, { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import fonts from './config/fonts';
import Navigation from './navigation';
import { ThemeProvider, useTheme } from './ThemeContext';

export default function App() {
  const [fontsLoaded] = useFonts(fonts);

  // Удаляем useEffect и checkForUpdates, так как EAS Update сам управляет обновлениями

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedStatusBar />
        <Navigation />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function ThemedStatusBar() {
  const { isDarkMode } = useTheme();
  return (
    <StatusBar
      style={isDarkMode ? 'light' : 'dark'}
      backgroundColor={isDarkMode ? '#121212' : '#ffffff'}
    />
  );
}