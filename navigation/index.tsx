import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useContext } from "react";
import Colors from "../constants/Colors";
import { ThemeContext } from "..//ThemeContext"; // Импортируем контекст темы
import Welcome from "../screens/WelcomeScreen";
import HomeScreen from "../screens/HomeScreen";
import { RootStackParamList } from "../types";

export default function Navigation() {
  const { isDarkMode } = useContext(ThemeContext); // Получаем текущую тему из контекста

  // Динамически определяем тему на основе значения isDarkMode
  const theme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: isDarkMode ? Colors.dark.background : Colors.light.background, // Цвет фона приложения
      card: isDarkMode ? Colors.dark.tabBarBackground : Colors.light.tabBarBackground, // Цвет фона таббара
      primary: Colors.light.primary, // Основной цвет
      text: isDarkMode ? Colors.dark.text : Colors.light.text, // Цвет текста
    },
  };

  return (
    <NavigationContainer theme={theme}>
      <RootNavigator />
    </NavigationContainer>
  );
}

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={Welcome} />
      <Stack.Screen name="Home" component={HomeScreen} />
    </Stack.Navigator>
  );
}