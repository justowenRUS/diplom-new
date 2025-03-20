import React, { useEffect, useState } from 'react';
import { 
    View, 
    Text,
    Image, 
    FlatList, 
    StyleSheet 
} from 'react-native';
import { useTheme } from '../ThemeContext';

const FoodScreen = () => {
    const [meals, setMeals] = useState([]);
    const [currentDay, setCurrentDay] = useState('');
    const { isDarkMode } = useTheme();

    useEffect(() => {
        const fetchMeals = async () => {
            try {
                const jsonFile = require('./meals.json');
                const date = new Date();
                const dayOfWeek = date.getDay(); // 0 - воскресенье, 1 - понедельник, ..., 6 - суббота
                
                if (dayOfWeek === 0) {
                    // Воскресенье - пропускаем
                    setMeals([]);
                    setCurrentDay('Воскресенье - выходной');
                    return;
                }
        
                // Используем .getTime() для получения миллисекунд
                const referenceDate = new Date('2025-03-05'); // Понедельник, день 1
                const daysSinceReference = Math.floor((date.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
                const cycleLength = 12; // 12 дней в цикле
                const positionInCycle = daysSinceReference % cycleLength;
        
                let dayNumber = positionInCycle < 0 
                    ? (positionInCycle % cycleLength + cycleLength) 
                    : positionInCycle;
                dayNumber = dayNumber + 1; // Сдвиг, чтобы день 0 стал днем 1
        
                // Проверяем, что dayNumber в пределах 1-12
                if (dayNumber > 12) dayNumber = dayNumber % 12 || 12;
        
                setCurrentDay(dayNumber.toString());
                if (jsonFile && Array.isArray(jsonFile.meals)) {
                    const data = jsonFile.meals.find(meal => meal.day === dayNumber.toString());
                    setMeals(data ? data.meals : []);
                } else {
                    console.error('Файл meals.json не содержит массив meals');
                }
            } catch (error) {
                console.error('Ошибка при загрузке данных:', error);
            }
        };
        fetchMeals();
    }, []);

    const renderItem = ({ item }) => (
        <View style={dynamicStyles(isDarkMode).mealContainer}>
            <Image source={{ uri: item.image_url }} style={dynamicStyles(isDarkMode).mealImage} />
            <View style={dynamicStyles(isDarkMode).mealInfo}>
                <Text style={dynamicStyles(isDarkMode).mealName}>{item.meal}</Text>
                <Text style={dynamicStyles(isDarkMode).mealDescription}>{item.description}</Text>
                <Text style={dynamicStyles(isDarkMode).mealWeight}>{item.size}</Text>
            </View>
        </View>
    );

    return (
        <FlatList
            data={meals}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderItem}
            contentContainerStyle={dynamicStyles(isDarkMode).container}
        />
    );
};

// Функциональные динамические стили
const dynamicStyles = (isDarkMode: boolean) =>
    StyleSheet.create({
        container: {
            padding: 16,
            backgroundColor: isDarkMode ? '#121212' : '#f5f5f5',
        },
        mealContainer: {
            backgroundColor: isDarkMode ? '#2a2a2a' : '#ffffff',
            borderRadius: 15,
            padding: 20,
            marginBottom: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 3,
            overflow: 'hidden',
        },
        mealImage: {
            width: '100%',
            height: 200,
            borderRadius: 15,
            marginBottom: 10,
            resizeMode: 'cover',
        },
        mealInfo: {
            paddingVertical: 10,
        },
        mealName: {
            fontSize: 22,
            fontWeight: 'bold',
            color: isDarkMode ? '#e0e0e0' : '#222',
        },
        mealDescription: {
            fontSize: 16,
            color: isDarkMode ? '#a1a1aa' : '#666',
            marginVertical: 5,
        },
        mealWeight: {
            fontSize: 16,
            fontWeight: 'bold',
            color: isDarkMode ? '#e0e0e0' : '#333',
        },
    });

export default FoodScreen;