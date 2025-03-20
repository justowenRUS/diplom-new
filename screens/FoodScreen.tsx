import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { Ionicons } from '@expo/vector-icons';

// Интерфейс для базы калорийности
interface CalorieDatabase {
  [key: string]: number;
}

// Импортируем базу калорийности
const CALORIE_DATABASE: CalorieDatabase = require('./calorieDatabase.json');

// Функция расчета калорий
const calculateCalories = (description: string, size: string): number => {
  if (!description || !size) return 300;

  try {
    const totalWeight = parseInt(size) || 200;
    const ingredients = description.toLowerCase().split(', ');
    const weightPerIngredient = totalWeight / ingredients.length;
    let totalCalories = 0;

    ingredients.forEach(ingredient => {
      const trimmedIngredient = ingredient.trim();
      for (const [key, calories] of Object.entries(CALORIE_DATABASE)) {
        if (trimmedIngredient.includes(key)) {
          totalCalories += (weightPerIngredient / 100) * calories;
          break;
        }
      }
    });

    return Math.round(totalCalories) || 300;
  } catch (error) {
    console.error('Ошибка при расчете калорий:', error);
    return 300;
  }
};

const FoodScreen = () => {
  const [meals, setMeals] = useState<any[]>([]);
  const [currentDay, setCurrentDay] = useState('');
  const { isDarkMode } = useTheme();

  useEffect(() => {
    const fetchMeals = async () => {
      try {
        const jsonFile = require('./meals.json');
        const date = new Date(); // Сегодня: 20 марта 2025
        const referenceDate = new Date('2025-03-17'); // День 1
        const daysSinceReference = Math.floor(
          (date.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Цикл длится 14 дней
        const cycleLength = 14;
        const positionInCycle = daysSinceReference % cycleLength >= 0
          ? daysSinceReference % cycleLength
          : daysSinceReference % cycleLength + cycleLength;

        // Номер дня в цикле (1-14)
        const dayNumber = positionInCycle + 1;

        setCurrentDay(`День ${dayNumber}`);
        if (jsonFile && Array.isArray(jsonFile.meals)) {
          const data = jsonFile.meals.find(
            (meal: any) => meal.day === dayNumber.toString()
          );
          const mealsWithCalories = data?.meals.map((meal: any) => ({
            ...meal,
            calories: calculateCalories(meal.description, meal.size),
          }));
          setMeals(mealsWithCalories || []);
        } else {
          console.error('Файл meals.json не содержит массив meals');
        }
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
      }
    };
    fetchMeals();
  }, []);

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    if (!item || !item.meal || !item.description || !item.image_url) {
      console.log('Некорректные данные:', item);
      return null;
    }

    return (
      <View style={dynamicStyles(isDarkMode).mealContainer}>
        <TouchableOpacity activeOpacity={0.9}>
          <View
            style={[
              dynamicStyles(isDarkMode).gradient,
              { backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f0f0' },
            ]}
          >
            <Image
              source={{ uri: item.image_url }}
              style={dynamicStyles(isDarkMode).mealImage}
            />
            <View style={dynamicStyles(isDarkMode).mealInfo}>
              <View style={dynamicStyles(isDarkMode).mealHeader}>
                <Text style={dynamicStyles(isDarkMode).mealName}>
                  {item.meal}
                </Text>
              </View>
              <Text style={dynamicStyles(isDarkMode).mealDescription}>
                {item.description}
              </Text>
              <View style={dynamicStyles(isDarkMode).mealFooter}>
                <Text style={dynamicStyles(isDarkMode).mealWeight}>
                  {item.size || '200г'}
                </Text>
                <View style={dynamicStyles(isDarkMode).calorieBadge}>
                  <Ionicons
                    name="flame-outline"
                    size={16}
                    color={isDarkMode ? '#ffd700' : '#ff8c00'}
                  />
                  <Text style={dynamicStyles(isDarkMode).calorieText}>
                    {item.calories} ккал
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={dynamicStyles(isDarkMode).container}>
      {meals.length === 0 ? (
        <View style={dynamicStyles(isDarkMode).emptyContainer}>
          <Ionicons
            name="sad-outline"
            size={50}
            color={isDarkMode ? '#a1a1aa' : '#666'}
          />
          <Text style={dynamicStyles(isDarkMode).emptyText}>
            Сегодня выходной
          </Text>
        </View>
      ) : (
        <FlatList
          data={meals}
          keyExtractor={(item, index) => `meal-${index}`}
          renderItem={renderItem}
          contentContainerStyle={dynamicStyles(isDarkMode).listContent}
        />
      )}
    </View>
  );
};

const dynamicStyles = (isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#0d0d0d' : '#f0f2f5',
    },
    listContent: {
      padding: 16,
      paddingBottom: 100,
    },
    mealContainer: {
      marginBottom: 20,
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 15,
      elevation: 5,
    },
    gradient: {
      borderRadius: 20,
      overflow: 'hidden',
    },
    mealImage: {
      width: '100%',
      height: 220,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      resizeMode: 'cover',
    },
    mealInfo: {
      padding: 15,
    },
    mealHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    mealName: {
      fontSize: 22,
      fontWeight: '700',
      color: isDarkMode ? '#e0e0e0' : '#222',
      letterSpacing: 0.3,
    },
    mealDescription: {
      fontSize: 15,
      color: isDarkMode ? '#a1a1aa' : '#666',
      lineHeight: 22,
      marginBottom: 10,
    },
    mealFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    mealWeight: {
      fontSize: 16,
      fontWeight: '600',
      color: isDarkMode ? '#e0e0e0' : '#333',
    },
    calorieBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 15,
    },
    calorieText: {
      fontSize: 14,
      fontWeight: '600',
      color: isDarkMode ? '#ffd700' : '#ff8c00',
      marginLeft: 5,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 18,
      color: isDarkMode ? '#a1a1aa' : '#666',
      marginTop: 10,
    },
  });

export default FoodScreen;