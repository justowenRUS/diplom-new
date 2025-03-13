import {
  Dimensions,
  ImageBackground,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useEffect, useState } from "react";
import Spacing from "../constants/Spacing";
import FontSize from "../constants/FontSize";
import Colors from "../constants/Colors"; // Импортируем цвета
import Font from "../constants/Font";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../ThemeContext"; // Импортируем хук для работы с темой

const { height } = Dimensions.get("window");

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Получаем текущую тему через useTheme
  const { isDarkMode } = useTheme();
  const currentColors = isDarkMode ? Colors.dark : Colors.light;

  // Проверяем, был ли показан экран приветствия ранее
  const checkIfFirstLaunch = async () => {
    try {
      const value = await AsyncStorage.getItem("hasSeenWelcome");
      if (value === null) {
        setHasSeenWelcome(false);
      } else {
        setHasSeenWelcome(true);
        navigation.replace("Home");
      }
    } catch (e) {
      console.error("Ошибка при проверке первого запуска:", e);
    } finally {
      setIsChecking(false);
    }
  };

  // Сохраняем информацию о том, что экран приветствия был показан
  const markAsSeen = async () => {
    try {
      await AsyncStorage.setItem("hasSeenWelcome", "true");
    } catch (e) {
      console.error("Ошибка при сохранении состояния:", e);
    }
  };

  useEffect(() => {
    checkIfFirstLaunch();
  }, []);

  // Если проверка еще не завершена, ничего не отображаем
  if (isChecking) {
    return null;
  }

  // Если пользователь уже видел экран приветствия, переходим на главный экран
  if (hasSeenWelcome) {
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: currentColors.background }}>
      <View style={{ flex: 1, justifyContent: "center" }}>
        {/* Изображение фона */}
        <ImageBackground
          style={{
            height: height / 2.5,
            marginBottom: Spacing * 4,
          }}
          resizeMode="contain"
          source={require("../assets/images/welcome-img.png")}
        />

        {/* Основной контент */}
        <View
          style={{
            paddingHorizontal: Spacing * 4,
            paddingTop: Spacing * 2,
          }}
        >
          {/* Заголовок */}
          <Text
            style={{
              fontSize: FontSize.xxLarge,
              color: currentColors.primary, // Используем текущий цвет primary
              fontFamily: Font["poppins-bold"],
              textAlign: "center",
            }}
          >
            Добро пожаловать!
          </Text>

          {/* Описание */}
          <Text
            style={{
              fontSize: FontSize.small,
              color: currentColors.text, // Используем текущий цвет текста
              fontFamily: Font["poppins-regular"],
              textAlign: "center",
              marginTop: Spacing * 2,
            }}
          >
            Рады вас видеть! Здесь вы найдёте расписание занятий, меню столовой, свежие новости и уведомления о важных мероприятиях.
          </Text>
        </View>

        {/* Кнопка продолжения */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            marginTop: Spacing * 3,
          }}
        >
          <TouchableOpacity
            onPress={async () => {
              await markAsSeen(); // Сохраняем состояние
              navigation.navigate("Home"); // Переход на главный экран
            }}
            style={{
              backgroundColor: currentColors.primary, // Используем текущий цвет primary
              paddingVertical: Spacing * 1.5,
              paddingHorizontal: Spacing * 2,
              width: "48%",
              borderRadius: Spacing,
              shadowColor: currentColors.primary, // Используем текущий цвет primary
              shadowOffset: {
                width: 0,
                height: Spacing,
              },
              shadowOpacity: 0.3,
              shadowRadius: Spacing,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontFamily: Font["poppins-bold"],
                color: currentColors.onPrimary, // Используем текущий цвет onPrimary
                fontSize: FontSize.large,
                textAlign: "center",
              }}
            >
              Продолжить
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default WelcomeScreen;

const styles = StyleSheet.create({});