// App.tsx
import React, { useEffect } from 'react';
import { useFonts } from 'expo-font';
import * as Updates from 'expo-updates'; // Импортируем expo-updates
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import fonts from './config/fonts';
import Navigation from './navigation';
import { ThemeProvider, useTheme } from './ThemeContext'; // Импортируем ThemeProvider и useTheme

export default function App() {
  const [fontsLoaded] = useFonts(fonts);

  // Функция для проверки и применения обновлений
  const checkForUpdates = async () => {
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        Updates.reloadAsync(); // Перезагружаем приложение с новой версией
      }
    } catch (error) {
      console.error('Ошибка при проверке обновлений:', error);
    }
  };

  // Вызываем проверку обновлений при монтировании компонента
  useEffect(() => {
    checkForUpdates();
  }, []);

  // Если шрифты не загружены, показываем null
  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider> {/* Оборачиваем всё приложение ThemeProvider */}
        <ThemedStatusBar /> {/* Добавляем статусную строку с динамической темой */}
        <Navigation />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// Компонент для динамической статусной строки
function ThemedStatusBar() {
  const { isDarkMode } = useTheme(); // Получаем состояние темы
  return (
    <StatusBar
      style={isDarkMode ? 'light' : 'dark'} // Автоматически адаптируется к теме
      backgroundColor={isDarkMode ? '#121212' : '#ffffff'} // Фон статусной строки
    />
  );
}