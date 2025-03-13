import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Определение интерфейса для контекста темы
interface ThemeContextType {
  isDarkMode: boolean; // Состояние темной темы
  toggleDarkMode: (value?: boolean) => Promise<void>; // Функция переключения темы
}

// Создание контекста с необязательным значением (undefined)
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Провайдер контекста темы
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false); // Состояние темной темы

  // Загрузка сохраненной темы при монтировании компонента
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('darkMode');
        setIsDarkMode(savedTheme === 'true'); // Устанавливаем состояние на основе сохраненной темы
      } catch (error) {
        console.error('Ошибка чтения темы:', error);
      }
    };

    loadTheme(); // Вызываем функцию загрузки темы
  }, []);

  // Сохранение выбранной темы
  const toggleDarkMode = async (value?: boolean) => {
    const newValue = value ?? !isDarkMode; // Если значение не передано, инвертируем текущее состояние
    setIsDarkMode(newValue); // Обновляем состояние

    try {
      await AsyncStorage.setItem('darkMode', String(newValue)); // Сохраняем новое значение в AsyncStorage
    } catch (error) {
      console.error('Ошибка сохранения темы:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Хук для использования контекста темы
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext); // Получаем контекст

  if (!context) {
    throw new Error('useTheme должен использоваться внутри ThemeProvider');
  }

  return context;
};