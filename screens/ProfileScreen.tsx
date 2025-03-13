// screens/ProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../ThemeContext';

export default function ProfileScreen() {
  const [group, setGroup] = useState<string>(''); // Состояние для группы
  const { isDarkMode, toggleDarkMode } = useTheme(); // Получаем тему из контекста

  // Загрузка сохраненной группы при монтировании компонента
  useEffect(() => {
    const loadGroup = async () => {
      try {
        const savedGroup = await AsyncStorage.getItem('userGroup');
        if (savedGroup) {
          setGroup(savedGroup);
        }
      } catch (error) {
        console.error('Ошибка чтения группы:', error);
      }
    };
    loadGroup();
  }, []);

  // Сохранение группы
  const handleSaveGroup = async () => {
    if (!group.trim()) {
      alert('Пожалуйста, введите название группы.');
      return;
    }
    try {
      await AsyncStorage.setItem('userGroup', group);
      alert(`Группа ${group} сохранена.`);
    } catch (error) {
      console.error('Ошибка сохранения группы:', error);
      alert('Не удалось сохранить группу.');
    }
  };

  // Динамические стили в зависимости от темы
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: isDarkMode ? '#121212' : '#ffffff',
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 20,
      color: isDarkMode ? '#e0e0e0' : '#333333',
    },
    input: {
      height: 40,
      width: '80%',
      borderColor: isDarkMode ? '#333333' : '#cccccc',
      borderWidth: 1,
      borderRadius: 5,
      paddingHorizontal: 10,
      marginBottom: 20,
      backgroundColor: isDarkMode ? '#2a2a2a' : '#ffffff',
      color: isDarkMode ? '#e0e0e0' : '#333333',
    },
    button: {
      backgroundColor: isDarkMode ? '#0056b3' : '#007BFF',
      padding: 10,
      borderRadius: 5,
      alignItems: 'center',
    },
    buttonText: {
      color: '#ffffff',
      fontWeight: 'bold',
    },
    switchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 20,
    },
    switchText: {
      fontSize: 16,
      marginRight: 10,
      color: isDarkMode ? '#e0e0e0' : '#333333',
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <Text style={dynamicStyles.title}>Введите вашу группу</Text>
      <TextInput
        style={dynamicStyles.input}
        placeholder="Например, 41ИС"
        value={group}
        onChangeText={setGroup}
      />
      <TouchableOpacity style={dynamicStyles.button} onPress={handleSaveGroup}>
        <Text style={dynamicStyles.buttonText}>Сохранить</Text>
      </TouchableOpacity>
      {/* Ползунок для переключения темы */}
      <View style={dynamicStyles.switchContainer}>
        <Text style={dynamicStyles.switchText}>Темная тема</Text>
        <Switch
          value={isDarkMode}
          onValueChange={toggleDarkMode}
          trackColor={{ false: '#767577', true: '#007BFF' }}
          thumbColor={isDarkMode ? '#ffffff' : '#f4f3f4'}
        />
      </View>
    </View>
  );
}