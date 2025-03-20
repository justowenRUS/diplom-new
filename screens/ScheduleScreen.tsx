import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useTheme } from '../ThemeContext';
import moment from 'moment-timezone';
import { Ionicons } from '@expo/vector-icons';

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
  const [groups, setGroups] = useState<string[]>([]);
  const [semesterInfo, setSemesterInfo] = useState<string>('');
  const [weekRange, setWeekRange] = useState<string>('');
  const [isModalVisible, setModalVisible] = useState(false); // Для модального окна
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
      const fileContent = await FileSystem.readAsStringAsync(FILE_URI, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const workbook = XLSX.read(fileContent, { type: 'base64' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonSheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      await FileSystem.writeAsStringAsync(JSON_FILE_URI, JSON.stringify(jsonSheetData));
      return jsonSheetData;
    } catch (error) {
      console.error('Ошибка при скачивании/конвертации:', error);
      Alert.alert('Ошибка', 'Не удалось обработать файл.');
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

  const extractGroups = (jsonSheetData: any[][]): string[] => {
    const groupRow = jsonSheetData[2] || [];
    const groupsList: string[] = [];
    for (let i = 2; i < groupRow.length; i += 2) {
      const groupName = groupRow[i]?.toString().trim();
      if (groupName && groupName !== 'Каб' && groupName !== 'Каб.') {
        groupsList.push(groupName);
      }
    }
    return groupsList;
  };

  const extractSemesterInfo = (jsonSheetData: any[][]): string => {
    const headerRow = jsonSheetData[0]?.[0]?.toString() || '';
    const semesterMatch = headerRow.match(/(\d+-Й СЕМЕСТР \d{4}-\d{4})/i);
    if (semesterMatch) {
      return semesterMatch[1].toLowerCase();
    }

    const currentMonth = moment().month();
    const currentYear = moment().year();
    let semester = currentMonth >= 1 && currentMonth <= 5 ? '2-й семестр' : '1-й семестр';
    let academicYearStart = currentMonth >= 8 ? currentYear : currentYear - 1;
    let academicYearEnd = academicYearStart + 1;

    return `${semester} ${academicYearStart}-${academicYearEnd}`;
  };

  const extractWeekRange = (jsonSheetData: any[][]): string => {
    const headerRow = jsonSheetData[0]?.[0]?.toString() || '';
    const cleanedHeader = headerRow.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    const weekRangeMatch = cleanedHeader.match(/с (\d{1,2}) по (\d{1,2}) (\w+) (\d{4})/i);
    if (weekRangeMatch) {
      const startDay = weekRangeMatch[1];
      const endDay = weekRangeMatch[2];
      const month = weekRangeMatch[3].toLowerCase();
      const year = weekRangeMatch[4];
      return `с ${startDay} по ${endDay} ${month} ${year}`;
    }

    return 'Диапазон дат не указан';
  };

  const parseGroupSchedule = (jsonSheetData: unknown[], selectedGroup: string): Lesson[] | null => {
    if (!jsonSheetData) return null;

    const sheetData = jsonSheetData as any[][];
    let groupIndex = -1;
    for (let i = 2; i < (sheetData[2]?.length || 0); i += 2) {
      const cellValue = sheetData[2]?.[i]?.toString().trim();
      if (cellValue?.toLowerCase() === selectedGroup.toLowerCase()) {
        groupIndex = i;
        break;
      }
    }

    if (groupIndex === -1) {
      Alert.alert('Ошибка', `Группа ${selectedGroup} не найдена`);
      return null;
    }

    const schedule: Lesson[] = [];
    let currentDay: string | null = null;

    for (let row = 3; row < sheetData.length; row++) {
      const dayOfWeek = sheetData[row][0]?.toString().trim();
      const lesson = sheetData[row][groupIndex]?.toString().trim() || '';
      const cabinet = sheetData[row][groupIndex + 1]?.toString().trim() || '';

      if (dayOfWeek && dayOfWeek !== currentDay) {
        currentDay = dayOfWeek;
        schedule.push({ day: currentDay, lessons: [] });
      }
      if (lesson) {
        const lessonWithCabinet = cabinet ? `${lesson} (Каб. ${cabinet})` : lesson;
        schedule[schedule.length - 1].lessons.push(lessonWithCabinet);
      }
    }

    return schedule;
  };

  const checkAndUpdateSchedule = async () => {
    try {
      const currentLink = await AsyncStorage.getItem('currentScheduleLink');
      const newLink = await fetchScheduleLinkFor4123Course();

      if (newLink !== currentLink) {
        await AsyncStorage.setItem('currentScheduleLink', newLink);
        const jsonSheetData = await downloadAndConvertToJSON(newLink);
        if (jsonSheetData) {
          const availableGroups = extractGroups(jsonSheetData);
          setGroups(availableGroups);
          const semester = extractSemesterInfo(jsonSheetData);
          setSemesterInfo(semester);
          const week = extractWeekRange(jsonSheetData);
          setWeekRange(week);
          if (group && availableGroups.includes(group)) {
            const parsedSchedule = parseGroupSchedule(jsonSheetData, group);
            if (parsedSchedule) setCellValues(parsedSchedule);
          } else if (availableGroups.length > 0) {
            setGroup(availableGroups[0]);
          }
        }
      }
    } catch (error) {
      console.error('Ошибка при проверке обновлений:', error);
      Alert.alert('Ошибка', 'Не удалось обновить расписание');
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
        checkAndUpdateSchedule();
        scheduleDailyCheck();
      }, msUntilNextCheck);

      return () => clearTimeout(timeoutId);
    };

    checkAndUpdateSchedule();
    scheduleDailyCheck();

    return () => {};
  }, []);

  useEffect(() => {
    const initializeSchedule = async () => {
      try {
        const savedGroup = await AsyncStorage.getItem('userGroup');
        let jsonSheetData = await loadFromJSON();
        if (!jsonSheetData) {
          const xlsxUrl = await fetchScheduleLinkFor4123Course();
          jsonSheetData = await downloadAndConvertToJSON(xlsxUrl);
        }

        if (jsonSheetData) {
          const availableGroups = extractGroups(jsonSheetData);
          setGroups(availableGroups);
          const semester = extractSemesterInfo(jsonSheetData);
          setSemesterInfo(semester);
          const week = extractWeekRange(jsonSheetData);
          setWeekRange(week);

          const initialGroup =
            savedGroup && availableGroups.includes(savedGroup.trim())
              ? savedGroup.trim()
              : availableGroups[0] || null;

          setGroup(initialGroup);
          if (initialGroup) {
            const parsedSchedule = parseGroupSchedule(jsonSheetData, initialGroup);
            if (parsedSchedule) setCellValues(parsedSchedule);
          }
        }
      } catch (error) {
        console.error('Ошибка инициализации:', error);
        Alert.alert('Ошибка', 'Не удалось загрузить расписание');
      } finally {
        setLoading(false);
      }
    };
    initializeSchedule();
  }, []);

  const handleGroupChange = async (selectedGroup: string) => {
    setGroup(selectedGroup);
    await AsyncStorage.setItem('userGroup', selectedGroup);
    const jsonSheetData = await loadFromJSON();
    if (jsonSheetData) {
      const parsedSchedule = parseGroupSchedule(jsonSheetData, selectedGroup);
      if (parsedSchedule) setCellValues(parsedSchedule);
    }
    setModalVisible(false);
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#1A1A1A' : '#F5F5F5',
      paddingTop: 40,
    },
    subHeader: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    subHeaderText: {
      fontSize: 16,
      color: isDarkMode ? '#AAAAAA' : '#777777',
    },
    pickerContainer: {
      marginHorizontal: 16,
      marginBottom: 20,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#2D2D2D' : '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? '#3D3D3D' : '#E0E0E0',
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    pickerButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    pickerText: {
      fontSize: 16,
      color: isDarkMode ? '#FFFFFF' : '#333333',
    },
    refreshButton: {
      padding: 10,
    },
    content: {
      paddingHorizontal: 16,
    },
    dayContainer: {
      marginBottom: 24,
    },
    dayTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: isDarkMode ? '#FFFFFF' : '#333333',
      marginBottom: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    card: {
      backgroundColor: isDarkMode ? '#2D2D2D' : '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.1 : 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    cardIcon: {
      marginRight: 12,
    },
    cardText: {
      fontSize: 16,
      color: isDarkMode ? '#D1D1D1' : '#555555',
      flex: 1,
      lineHeight: 22,
    },
    loadingText: {
      fontSize: 18,
      textAlign: 'center',
      color: isDarkMode ? '#FFFFFF' : '#333333',
      marginTop: 20,
    },
    noDataText: {
      fontSize: 16,
      textAlign: 'center',
      color: isDarkMode ? '#AAAAAA' : '#777777',
      marginTop: 20,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      backgroundColor: isDarkMode ? '#2D2D2D' : '#FFFFFF',
      marginHorizontal: 20,
      borderRadius: 12,
      maxHeight: '50%',
    },
    modalItem: {
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#3D3D3D' : '#E0E0E0',
    },
    modalItemText: {
      fontSize: 16,
      color: isDarkMode ? '#FFFFFF' : '#333333',
    },
  });

  return (
    <ScrollView style={dynamicStyles.container}>
      <View style={dynamicStyles.subHeader}>
        <Text style={dynamicStyles.subHeaderText}>
          {weekRange || 'Диапазон дат не указан'}
        </Text>
        <Text style={dynamicStyles.subHeaderText}>
          {semesterInfo || 'Семестр не указан'}
        </Text>
      </View>

      {loading ? (
        <Text style={dynamicStyles.loadingText}>Загрузка...</Text>
      ) : (
        <>
          {groups.length > 0 && (
            <View style={dynamicStyles.pickerContainer}>
              <TouchableOpacity
                style={dynamicStyles.pickerButton}
                onPress={() => setModalVisible(true)}
              >
                <Text style={dynamicStyles.pickerText}>
                  {group || 'Выберите группу'}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={isDarkMode ? '#FFFFFF' : '#333333'}
                />
              </TouchableOpacity>
              <TouchableOpacity style={dynamicStyles.refreshButton} onPress={checkAndUpdateSchedule}>
                <Ionicons name="refresh" size={24} color={isDarkMode ? '#FFFFFF' : '#333333'} />
              </TouchableOpacity>
            </View>
          )}
          <View style={dynamicStyles.content}>
            {group ? (
              cellValues.length > 0 ? (
                cellValues.map((day, index) => (
                  <View key={index} style={dynamicStyles.dayContainer}>
                    <Text style={dynamicStyles.dayTitle}>{day.day}</Text>
                    {day.lessons.map((lesson, lessonIndex) => (
                      <View key={lessonIndex} style={dynamicStyles.card}>
                        <Ionicons
                          name="time-outline"
                          size={20}
                          color={isDarkMode ? '#AAAAAA' : '#777777'}
                          style={dynamicStyles.cardIcon}
                        />
                        <Text style={dynamicStyles.cardText}>{lesson}</Text>
                      </View>
                    ))}
                  </View>
                ))
              ) : (
                <Text style={dynamicStyles.noDataText}>
                  Расписание для группы {group} не найдено
                </Text>
              )
            ) : (
              <Text style={dynamicStyles.noDataText}>Выберите группу</Text>
            )}
          </View>
        </>
      )}

      {/* Модальное окно для выбора группы */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={dynamicStyles.modalContainer}>
          <View style={dynamicStyles.modalContent}>
            <FlatList
              data={groups}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleGroupChange(item)}
                  style={dynamicStyles.modalItem}
                >
                  <Text style={dynamicStyles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}