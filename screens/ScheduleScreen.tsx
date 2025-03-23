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
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
  startPair: number;
}

interface ScheduleScreenProps {
  isTeacherMode: boolean; // Тип для пропса
}

export default function ScheduleScreen({ isTeacherMode }: ScheduleScreenProps) {
  const [cellValues, setCellValues] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<string | null>(null);
  const [teacher, setTeacher] = useState<string | null>(null);
  const [groups, setGroups] = useState<string[]>([]);
  const [teachers, setTeachers] = useState<string[]>([]);
  const [semesterInfo, setSemesterInfo] = useState<string>('');
  const [weekRange, setWeekRange] = useState<string>('');
  const [isModalVisible, setModalVisible] = useState(false);
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

  const extractTeachers = (jsonSheetData: any[][]): string[] => {
    const teachersSet = new Set<string>();
    for (let row = 3; row < jsonSheetData.length; row++) {
      for (let col = 2; col < jsonSheetData[row].length; col += 2) {
        const lesson = jsonSheetData[row][col]?.toString().trim();
        if (lesson) {
          const parts = lesson.split(' ');
          const possibleTeacher = parts.slice(-2).join(' ');
          if (/^[А-ЯЁ][а-яё]+\s[А-ЯЁ]\.[А-ЯЁ]\.$/.test(possibleTeacher)) {
            teachersSet.add(possibleTeacher);
          }
        }
      }
    }
    return Array.from(teachersSet);
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
    
    const weekRangeMatch = cleanedHeader.match(/с\s*(\d{1,2})\s*по\s*(\d{1,2})\s*([а-яё]+)\s*(\d{4})\s*года?/i);
    
    if (weekRangeMatch) {
      const startDay = weekRangeMatch[1];
      const endDay = weekRangeMatch[2];
      const month = weekRangeMatch[3].toLowerCase();
      const year = weekRangeMatch[4];
      return `с ${startDay} по ${endDay} ${month} ${year}`;
    }
  
    return 'Диапазон дат не указан';
  };

  const parseGroupSchedule = (jsonSheetData: any[][], selectedGroup: string): Lesson[] | null => {
    let groupIndex = -1;
    for (let i = 2; i < (jsonSheetData[2]?.length || 0); i += 2) {
      const cellValue = jsonSheetData[2]?.[i]?.toString().trim();
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
    let lessonsForDay: string[] = [];
  
    for (let row = 3; row < jsonSheetData.length; row++) {
      const dayOfWeek = jsonSheetData[row][0]?.toString().trim();
      const lesson = jsonSheetData[row][groupIndex]?.toString().trim() || '';
      const cabinet = jsonSheetData[row][groupIndex + 1]?.toString().trim() || '';
  
      if (dayOfWeek && dayOfWeek !== currentDay) {
        if (currentDay && lessonsForDay.length > 0) {
          const formattedLessons: string[] = [];
          let lessonIndex = 0;
          let startPair = 1;
  
          // Проверяем, есть ли "Классный час"
          if (lessonsForDay[0]?.includes('Классный час')) {
            formattedLessons.push(lessonsForDay[0]);
            lessonIndex = 1;
            startPair = 1; // После "Классного часа" начинаем с первой пары
          }
  
          // Проверяем пропущенные пары в начале дня
          while (lessonIndex < lessonsForDay.length) {
            const lesson1 = lessonsForDay[lessonIndex];
            const lesson2 = lessonsForDay[lessonIndex + 1] || '';
            if (!lesson1 && !lesson2) {
              lessonIndex += 2;
              startPair++;
            } else {
              break; // Если есть хотя бы один урок в паре, начинаем с этой пары
            }
          }
  
          // Группируем остальные уроки в пары
          for (let i = lessonIndex; i < lessonsForDay.length; i += 2) {
            const lesson1 = lessonsForDay[i];
            const lesson2 = lessonsForDay[i + 1] || '';
            if (lesson1 || lesson2) {
              if (lesson1 && lesson2 && lesson1 === lesson2) {
                formattedLessons.push(lesson1);
              } else if (lesson1 && lesson2) {
                formattedLessons.push(`${lesson1} / ${lesson2}`);
              } else {
                formattedLessons.push(lesson1 || lesson2);
              }
            }
          }
          schedule.push({ day: currentDay, lessons: formattedLessons, startPair });
        }
        currentDay = dayOfWeek;
        lessonsForDay = [];
      }
  
      if (lesson) {
        const lessonWithCabinet = cabinet ? `${lesson} (Каб. ${cabinet})` : lesson;
        lessonsForDay.push(lessonWithCabinet);
      } else {
        lessonsForDay.push('');
      }
    }
  
    if (currentDay && lessonsForDay.length > 0) {
      const formattedLessons: string[] = [];
      let lessonIndex = 0;
      let startPair = 1;
  
      if (lessonsForDay[0]?.includes('Классный час')) {
        formattedLessons.push(lessonsForDay[0]);
        lessonIndex = 1;
        startPair = 1; // После "Классного часа" начинаем с первой пары
      }
  
      while (lessonIndex < lessonsForDay.length) {
        const lesson1 = lessonsForDay[lessonIndex];
        const lesson2 = lessonsForDay[lessonIndex + 1] || '';
        if (!lesson1 && !lesson2) {
          lessonIndex += 2;
          startPair++;
        } else {
          break;
        }
      }
  
      for (let i = lessonIndex; i < lessonsForDay.length; i += 2) {
        const lesson1 = lessonsForDay[i];
        const lesson2 = lessonsForDay[i + 1] || '';
        if (lesson1 || lesson2) {
          if (lesson1 && lesson2 && lesson1 === lesson2) {
            formattedLessons.push(lesson1);
          } else if (lesson1 && lesson2) {
            formattedLessons.push(`${lesson1} / ${lesson2}`);
          } else {
            formattedLessons.push(lesson1 || lesson2);
          }
        }
      }
      schedule.push({ day: currentDay, lessons: formattedLessons, startPair });
    }
  
    return schedule;
  };

  const parseTeacherSchedule = (jsonSheetData: any[][], selectedTeacher: string): Lesson[] | null => {
    const schedule: Lesson[] = [];
    let currentDay: string | null = null;
    let lessonsForDay: { lesson: string; groups: string[] }[][] = []; // Массив уроков для каждого слота
  
    for (let row = 3; row < jsonSheetData.length; row++) {
      const dayOfWeek = jsonSheetData[row][0]?.toString().trim();
      const lessonsInRow: { lesson: string; groups: string[] }[] = [];
  
      // Собираем все уроки для текущего временного слота
      for (let col = 2; col < jsonSheetData[row].length; col += 2) {
        const lesson = jsonSheetData[row][col]?.toString().trim() || '';
        const cabinet = jsonSheetData[row][col + 1]?.toString().trim() || '';
        const groupName = jsonSheetData[2][col]?.toString().trim() || '';
  
        if (lesson.includes(selectedTeacher)) {
          const lessonWithDetails = `${lesson} (Каб. ${cabinet || 'не указан'})`;
          const existingLesson = lessonsInRow.find(item => item.lesson === lessonWithDetails);
          if (existingLesson) {
            existingLesson.groups.push(groupName);
          } else {
            lessonsInRow.push({ lesson: lessonWithDetails, groups: [groupName] });
          }
        }
      }
  
      // Если начинается новый день
      if (dayOfWeek && dayOfWeek !== currentDay) {
        // Сохраняем предыдущий день, если он есть
        if (currentDay && lessonsForDay.length > 0) {
          const formattedLessons: string[] = [];
          let lessonIndex = 0;
          let startPair = 1;
  
          // Проверяем "Классный час"
          if (lessonsForDay[0]?.[0]?.lesson?.includes('Классный час')) {
            const classHour = lessonsForDay[0][0];
            const groupsStr = classHour.groups.length > 1 ? `Группы: ${classHour.groups.join(', ')}` : `Группа: ${classHour.groups[0]}`;
            formattedLessons.push(`${classHour.lesson} (${groupsStr})`);
            lessonIndex = 1;
            startPair = 1;
          }
  
          // Пропускаем пустые пары
          while (lessonIndex < lessonsForDay.length) {
            const lessons1 = lessonsForDay[lessonIndex] || [];
            const lessons2 = lessonsForDay[lessonIndex + 1] || [];
            if (lessons1.length === 0 && lessons2.length === 0) {
              lessonIndex += 2;
              startPair++;
            } else {
              break;
            }
          }
  
          // Группируем уроки в пары
          for (let i = lessonIndex; i < lessonsForDay.length; i += 2) {
            const lessons1 = lessonsForDay[i] || [];
            const lessons2 = lessonsForDay[i + 1] || [];
  
            // Собираем все уроки для текущей пары
            const combinedLessons: { lesson: string; groups: string[] }[] = [...lessons1, ...lessons2];
  
            // Группируем уроки по их содержимому (предмет, преподаватель, кабинет)
            const groupedLessons: { [key: string]: string[] } = {};
            for (const lesson of combinedLessons) {
              if (!groupedLessons[lesson.lesson]) {
                groupedLessons[lesson.lesson] = [];
              }
              groupedLessons[lesson.lesson].push(...lesson.groups);
            }
  
            // Форматируем уроки
            const pairLessons: string[] = [];
            for (const lessonCore in groupedLessons) {
              const groups = [...new Set(groupedLessons[lessonCore])]; // Убираем дубликаты групп
              const groupsStr = groups.length > 1 ? `Группы: ${groups.join(', ')}` : `Группа: ${groups[0]}`;
              pairLessons.push(`${lessonCore} (${groupsStr})`);
            }
  
            if (pairLessons.length > 0) {
              formattedLessons.push(pairLessons.join(' / '));
            }
          }
  
          if (formattedLessons.length > 0) {
            schedule.push({ day: currentDay, lessons: formattedLessons, startPair });
          }
        }
        currentDay = dayOfWeek;
        lessonsForDay = [];
      }
  
      // Добавляем все уроки для текущего слота
      lessonsForDay.push(lessonsInRow);
    }
  
    // Обрабатываем последний день
    if (currentDay && lessonsForDay.length > 0) {
      const formattedLessons: string[] = [];
      let lessonIndex = 0;
      let startPair = 1;
  
      if (lessonsForDay[0]?.[0]?.lesson?.includes('Классный час')) {
        const classHour = lessonsForDay[0][0];
        const groupsStr = classHour.groups.length > 1 ? `Группы: ${classHour.groups.join(', ')}` : `Группа: ${classHour.groups[0]}`;
        formattedLessons.push(`${classHour.lesson} (${groupsStr})`);
        lessonIndex = 1;
        startPair = 1;
      }
  
      while (lessonIndex < lessonsForDay.length) {
        const lessons1 = lessonsForDay[lessonIndex] || [];
        const lessons2 = lessonsForDay[lessonIndex + 1] || [];
        if (lessons1.length === 0 && lessons2.length === 0) {
          lessonIndex += 2;
          startPair++;
        } else {
          break;
        }
      }
  
      for (let i = lessonIndex; i < lessonsForDay.length; i += 2) {
        const lessons1 = lessonsForDay[i] || [];
        const lessons2 = lessonsForDay[i + 1] || [];
  
        const combinedLessons: { lesson: string; groups: string[] }[] = [...lessons1, ...lessons2];
  
        const groupedLessons: { [key: string]: string[] } = {};
        for (const lesson of combinedLessons) {
          if (!groupedLessons[lesson.lesson]) {
            groupedLessons[lesson.lesson] = [];
          }
          groupedLessons[lesson.lesson].push(...lesson.groups);
        }
  
        const pairLessons: string[] = [];
        for (const lessonCore in groupedLessons) {
          const groups = [...new Set(groupedLessons[lessonCore])];
          const groupsStr = groups.length > 1 ? `Группы: ${groups.join(', ')}` : `Группа: ${groups[0]}`;
          pairLessons.push(`${lessonCore} (${groupsStr})`);
        }
  
        if (pairLessons.length > 0) {
          formattedLessons.push(pairLessons.join(' / '));
        }
      }
  
      if (formattedLessons.length > 0) {
        schedule.push({ day: currentDay, lessons: formattedLessons, startPair });
      }
    }
  
    if (schedule.length === 0) {
      Alert.alert('Ошибка', `Учитель ${selectedTeacher} не найден в расписании`);
      return null;
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
          const availableTeachers = extractTeachers(jsonSheetData);parseGroupSchedule
          setGroups(availableGroups);
          setTeachers(availableTeachers);
          setSemesterInfo(extractSemesterInfo(jsonSheetData));
          setWeekRange(extractWeekRange(jsonSheetData));

          if (isTeacherMode && teacher && availableTeachers.includes(teacher)) {
            const parsedSchedule = parseTeacherSchedule(jsonSheetData, teacher);
            if (parsedSchedule) setCellValues(parsedSchedule);
          } else if (!isTeacherMode && group && availableGroups.includes(group)) {
            const parsedSchedule = parseGroupSchedule(jsonSheetData, group);
            if (parsedSchedule) setCellValues(parsedSchedule);
          } else {
            setGroup(availableGroups[0] || null);
            setTeacher(availableTeachers[0] || null);
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
        const savedKey = isTeacherMode ? 'userTeacher' : 'userGroup';
        const savedValue = await AsyncStorage.getItem(savedKey);
        let jsonSheetData = await loadFromJSON();
        if (!jsonSheetData) {
          const xlsxUrl = await fetchScheduleLinkFor4123Course();
          jsonSheetData = await downloadAndConvertToJSON(xlsxUrl);
        }

        if (jsonSheetData) {
          const availableGroups = extractGroups(jsonSheetData);
          const availableTeachers = extractTeachers(jsonSheetData);
          setGroups(availableGroups);
          setTeachers(availableTeachers);
          setSemesterInfo(extractSemesterInfo(jsonSheetData));
          setWeekRange(extractWeekRange(jsonSheetData));

          if (isTeacherMode) {
            const initialTeacher =
              savedValue && availableTeachers.includes(savedValue.trim())
                ? savedValue.trim()
                : availableTeachers[0] || null;
            setTeacher(initialTeacher);
            if (initialTeacher) {
              const parsedSchedule = parseTeacherSchedule(jsonSheetData, initialTeacher);
              if (parsedSchedule) setCellValues(parsedSchedule);
            }
          } else {
            const initialGroup =
              savedValue && availableGroups.includes(savedValue.trim())
                ? savedValue.trim()
                : availableGroups[0] || null;
            setGroup(initialGroup);
            if (initialGroup) {
              const parsedSchedule = parseGroupSchedule(jsonSheetData, initialGroup);
              if (parsedSchedule) setCellValues(parsedSchedule);
            }
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
  }, [isTeacherMode]);

  const handleSelectionChange = async (selectedValue: string) => {
    if (isTeacherMode) {
      setTeacher(selectedValue);
      await AsyncStorage.setItem('userTeacher', selectedValue);
      const jsonSheetData = await loadFromJSON();
      if (jsonSheetData) {
        const parsedSchedule = parseTeacherSchedule(jsonSheetData, selectedValue);
        if (parsedSchedule) setCellValues(parsedSchedule);
      }
    } else {
      setGroup(selectedValue);
      await AsyncStorage.setItem('userGroup', selectedValue);
      const jsonSheetData = await loadFromJSON();
      if (jsonSheetData) {
        const parsedSchedule = parseGroupSchedule(jsonSheetData, selectedValue);
        if (parsedSchedule) setCellValues(parsedSchedule);
      }
    }
    setModalVisible(false);
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#1A1A1A' : '#F5F5F5',
      paddingBottom: 200,
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
        <Text style={dynamicStyles.subHeaderText}>{weekRange}</Text>
        <Text style={dynamicStyles.subHeaderText}>{semesterInfo}</Text>
      </View>
  
      {loading ? (
        <Text style={dynamicStyles.loadingText}>Загрузка...</Text>
      ) : (
        <>
          {(isTeacherMode ? teachers : groups).length > 0 && (
            <View style={dynamicStyles.pickerContainer}>
              <TouchableOpacity
                style={dynamicStyles.pickerButton}
                onPress={() => setModalVisible(true)}
              >
                <Text style={dynamicStyles.pickerText}>
                  {isTeacherMode
                    ? teacher || 'Выберите преподавателя'
                    : group || 'Выберите группу'}
                </Text>
                <Ionicons
                  name="chevron-down"parseGroupSchedule
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
            {(isTeacherMode ? teacher : group) ? (
              cellValues.length > 0 ? (
                cellValues.map((day, index) => {
                  let pairCounter = day.startPair - 1; // Начинаем счётчик с учётом пропущенных пар
  
                  return (
                    <View key={index} style={dynamicStyles.dayContainer}>
                      <Text style={dynamicStyles.dayTitle}>{day.day}</Text>
                      {day.lessons.map((lesson, lessonIndex) => {
                        if (!lesson) return null;
  
                        const isClassHour = lesson.includes('Классный час');
                        let label;
  
                        if (isClassHour) {
                          label = 'Классный час';
                        } else {
                          pairCounter++;
                          const pairLabels = [
                            'Первая пара',
                            'Вторая пара',
                            'Третья пара',
                            'Четвёртая пара',
                            'Пятая пара',
                            'Шестая пара',
                          ];
                          label = pairLabels[pairCounter - 1] || `Пара ${pairCounter}`;
                        }
  
                        return (
                          <View key={lessonIndex}>
                            <Text style={[dynamicStyles.dayTitle, { fontSize: 16, marginBottom: 8 }]}>
                              {label}
                            </Text>
                            <View style={dynamicStyles.card}>
                              <Ionicons
                                name="time-outline"
                                size={20}
                                color={isDarkMode ? '#AAAAAA' : '#777777'}
                                style={dynamicStyles.cardIcon}
                              />
                              <Text style={dynamicStyles.cardText}>{lesson}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  );
                })
              ) : (
                <Text style={dynamicStyles.noDataText}>
                  Расписание для{' '}
                  {isTeacherMode ? `преподавателя ${teacher}` : `группы ${group}`} не найдено
                </Text>
              )
            ) : (
              <Text style={dynamicStyles.noDataText}>
                {isTeacherMode ? 'Выберите преподавателя' : 'Выберите группу'}
              </Text>
            )}
          </View>
        </>
      )}
  
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={dynamicStyles.modalContainer}>
          <View style={dynamicStyles.modalContent}>
            <FlatList
              data={isTeacherMode ? teachers : groups}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelectionChange(item)}
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