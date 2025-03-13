// ScheduleScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useTheme } from '../ThemeContext';
import moment from 'moment-timezone';

const FILE_NAME = 'schedule_4123_course.xlsx';
const FILE_URI = `${FileSystem.documentDirectory}${FILE_NAME}`;
const JSON_FILE_NAME = 'schedule.json';
const JSON_FILE_URI = `${FileSystem.documentDirectory}${JSON_FILE_NAME}`;

interface Lesson {
  day: string;
  lessons: string[];
}

export default function ScheduleScreen() {
  const [cellValues, setCellValues] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<string | null>(null);
  const { isDarkMode } = useTheme();

  const fetchScheduleLinkFor4123Course = async (): Promise<string> => {
    try {
      const response = await axios.get('https://spo-13.mskobr.ru/uchashimsya/raspisanie-kanikuly');
      const html = response.data;
      const regex = /<a\s+[^>]*href="([^"]+\.xlsx)"[^>]*><span[^>]*><strong>4,1,2,3курс<\/strong><\/span><\/a>/i;
      const match = html.match(regex);
      if (!match || !match[1]) {
        throw new Error('Ссылка на файл для "4,1,2,3 курса" не найдена');
      }
      return new URL(match[1], 'https://spo-13.mskobr.ru').toString();
    } catch (error) {
      console.error('Ошибка при поиске ссылки:', error);
      throw error;
    }
  };

  const downloadAndConvertToJSON = async (xlsxUrl: string): Promise<any[][] | null> => {
    try {
      setLoading(true);
      await FileSystem.downloadAsync(xlsxUrl, FILE_URI);
      console.log('Файл успешно скачан:', FILE_URI);
      
      const fileContent = await FileSystem.readAsStringAsync(FILE_URI, { 
        encoding: FileSystem.EncodingType.Base64 
      });
      const workbook = XLSX.read(fileContent, { type: 'base64' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonSheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      
      await FileSystem.writeAsStringAsync(JSON_FILE_URI, JSON.stringify(jsonSheetData));
      console.log('Файл успешно конвертирован в JSON');
      
      return jsonSheetData;
    } catch (error) {
      console.error('Ошибка при скачивании/конвертации:', error);
      Alert.alert('Ошибка', 'Не удалось обработать файл. Проверьте подключение к интернету.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const loadFromJSON = async (): Promise<any[][] | null> => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(JSON_FILE_URI);
      if (fileInfo.exists) {
        const fileContent = await FileSystem.readAsStringAsync(JSON_FILE_URI);
        return JSON.parse(fileContent) as any[][];
      }
      return null;
    } catch (error) {
      console.error('Ошибка при загрузке JSON:', error);
      return null;
    }
  };

  const parseGroupSchedule = (jsonSheetData: unknown[]): Lesson[] | null => {
    if (!jsonSheetData || !group) return null;
    
    const sheetData = jsonSheetData as any[][];
    
    let groupIndex = -1;
    for (let i = 2; i < (sheetData[2]?.length || 0); i++) {
      const cellValue = sheetData[2]?.[i]?.toString().trim();
      if (cellValue?.toLowerCase() === group.toLowerCase()) {
        groupIndex = i;
        break;
      }
    }
    
    if (groupIndex === -1) {
      Alert.alert('Ошибка', `Группа ${group} не найдена`);
      return null;
    }

    const schedule: Lesson[] = [];
    let currentDay: string | null = null;
    
    for (let row = 3; row < Math.min(47, sheetData.length); row++) {
      const dayOfWeek = sheetData[row][0]?.toString().trim();
      const lesson = sheetData[row][groupIndex]?.toString().trim() || '';
      
      if (dayOfWeek && dayOfWeek !== currentDay) {
        currentDay = dayOfWeek;
        schedule.push({ day: currentDay, lessons: [] });
      }
      if (lesson) {
        schedule[schedule.length - 1].lessons.push(lesson);
      }
    }
    
    return schedule;
  };

  const checkAndUpdateSchedule = async () => {
    try {
      const currentLink = await AsyncStorage.getItem('currentScheduleLink');
      const newLink = await fetchScheduleLinkFor4123Course();
      
      if (newLink !== currentLink) {
        console.log('Обнаружено обновление расписания');
        await AsyncStorage.setItem('currentScheduleLink', newLink);
        const jsonSheetData = await downloadAndConvertToJSON(newLink);
        if (jsonSheetData && group) {
          const parsedSchedule = parseGroupSchedule(jsonSheetData);
          if (parsedSchedule) {
            setCellValues(parsedSchedule);
          }
        }
      } else {
        console.log('Расписание актуально');
      }
    } catch (error) {
      console.error('Ошибка при проверке обновлений:', error);
      Alert.alert('Ошибка', 'Не удалось проверить обновления расписания');
    }
  };

  useEffect(() => {
    const scheduleDailyCheck = () => {
      const now = moment.tz('Europe/Moscow');
      const nextCheck = moment.tz('Europe/Moscow')
        .set({ hour: 17, minute: 0, second: 0, millisecond: 0 });
      
      if (now.isAfter(nextCheck)) {
        nextCheck.add(1, 'day');
      }
      
      const msUntilNextCheck = nextCheck.diff(now);
      
      const timeoutId = setTimeout(() => {
        console.log('Проверка обновлений в 17:00 по Москве');
        checkAndUpdateSchedule();
        scheduleDailyCheck();
      }, msUntilNextCheck);

      return () => clearTimeout(timeoutId);
    };

    // Запускаем первую проверку сразу при монтировании
    checkAndUpdateSchedule();
    scheduleDailyCheck();

    return () => {};
  }, []);

  useEffect(() => {
    const checkGroupPeriodically = async () => {
      try {
        const savedGroup = await AsyncStorage.getItem('userGroup');
        if (savedGroup !== group) {
          setGroup(savedGroup?.trim() || null);
        }
      } catch (error) {
        console.error('Ошибка при проверке группы:', error);
      }
    };
    const intervalId = setInterval(checkGroupPeriodically, 1000);
    return () => clearInterval(intervalId);
  }, [group]);

  useEffect(() => {
    const initializeSchedule = async () => {
      try {
        const savedGroup = await AsyncStorage.getItem('userGroup');
        if (savedGroup) {
          setGroup(savedGroup.trim());
        }

        let jsonSheetData = await loadFromJSON();
        if (!jsonSheetData) {
          const xlsxUrl = await fetchScheduleLinkFor4123Course();
          jsonSheetData = await downloadAndConvertToJSON(xlsxUrl);
        }

        if (jsonSheetData && group) {
          const parsedSchedule = parseGroupSchedule(jsonSheetData);
          if (parsedSchedule) {
            setCellValues(parsedSchedule);
          }
        }
      } catch (error) {
        console.error('Ошибка инициализации:', error);
        Alert.alert('Ошибка', 'Не удалось инициализировать расписание');
      } finally {
        setLoading(false);
      }
    };
    initializeSchedule();
  }, [group]);

  const dynamicStyles = StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: 10,
      backgroundColor: isDarkMode ? '#121212' : '#ffffff',
    },
    dayContainer: {
      marginBottom: 20,
    },
    dayTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 5,
      color: isDarkMode ? '#e0e0e0' : '#333333',
    },
    card: {
      backgroundColor: isDarkMode ? '#2a2a2a' : '#ffffff',
      padding: 15,
      borderRadius: 8,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 4,
    },
    cardText: {
      fontSize: 16,
      color: isDarkMode ? '#e0e0e0' : '#555555',
    },
    text: {
      fontSize: 16,
      textAlign: 'center',
      color: isDarkMode ? '#e0e0e0' : '#333333',
    },
  });

  return (
    <ScrollView style={dynamicStyles.container}>
      {loading ? (
        <Text style={dynamicStyles.text}>Загрузка...</Text>
      ) : group ? (
        cellValues.length > 0 ? (
          cellValues.map((day, index) => (
            <View key={index} style={dynamicStyles.dayContainer}>
              <Text style={dynamicStyles.dayTitle}>{day.day}</Text>
              {day.lessons.map((lesson, lessonIndex) => (
                <View key={lessonIndex} style={dynamicStyles.card}>
                  <Text style={dynamicStyles.cardText}>{lesson}</Text>
                </View>
              ))}
            </View>
          ))
        ) : (
          <Text style={dynamicStyles.text}>Расписание для вашей группы не найдено.</Text>
        )
      ) : (
        <Text style={dynamicStyles.text}>Пожалуйста, укажите группу в настройках.</Text>
      )}
    </ScrollView>
  );
}