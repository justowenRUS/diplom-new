import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { icons } from '../assets/icons';
import NewsScreen from '../screens/NewsScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import FoodScreen from '../screens/FoodScreen';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Определяем типы для параметров навигации
type TabParamList = {
  Новости: undefined;
  Расписание: undefined;
  Питание: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

// Упрощённый ThemeToggleButton
const ThemeToggleButton: React.FC = () => {
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <TouchableOpacity
      onPress={() => toggleDarkMode()}
      style={styles.themeButtonContainer}
      activeOpacity={0.9}
    >
      <Ionicons
        name={isDarkMode ? 'moon' : 'sunny'}
        size={24}
        color={isDarkMode ? '#ffd700' : '#ffffff'}
      />
    </TouchableOpacity>
  );
};

const TabNavigator = () => {
  const { isDarkMode } = useTheme();

  // Кастомный компонент для вкладки
  const CustomTabBarButton: React.FC<BottomTabBarButtonProps & { children: React.ReactNode }> = ({
    children,
    onPress,
    accessibilityState,
  }) => {
    const focused = accessibilityState?.selected ?? false;
    const scaleValue = new Animated.Value(1);

    const onPressIn = () => {
      Animated.spring(scaleValue, {
        toValue: 0.9,
        useNativeDriver: true,
      }).start();
    };

    const onPressOut = () => {
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.tabButton}
        activeOpacity={1}
      >
        <Animated.View
          style={[
            styles.tabButtonInner,
            { transform: [{ scale: scaleValue }] },
            focused && styles.tabButtonActive,
            focused && { backgroundColor: isDarkMode ? '#3a3a3a' : '#e0e0e0' },
          ]}
        >
          {children}
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.navigatorContainer}>
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: {
            backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
            borderTopWidth: 0,
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -5 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
            height: 70,
            paddingBottom: 5,
            paddingTop: 5,
            position: 'absolute' as const,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          },
          tabBarShowLabel: true,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginBottom: 5,
          },
          tabBarActiveTintColor: isDarkMode ? '#ffd700' : '#ff6b6b',
          tabBarInactiveTintColor: isDarkMode ? '#a1a1aa' : '#666',
        }}
      >
        <Tab.Screen
          name="Новости"
          component={NewsScreen}
          options={{
            tabBarIcon: ({ color, size }) => icons.Home({ color, size }),
            tabBarButton: (props) => <CustomTabBarButton {...props} />,
            tabBarLabel: ({ focused, color }) => (
              <Text
                style={{
                  color,
                  fontSize: 12,
                  fontWeight: focused ? '700' : '600',
                }}
              >
                Новости
              </Text>
            ),
          }}
        />
        <Tab.Screen
          name="Расписание"
          component={ScheduleScreen}
          options={{
            tabBarIcon: ({ color, size }) => icons.Schedule({ color, size }),
            tabBarButton: (props) => <CustomTabBarButton {...props} />,
            tabBarLabel: ({ focused, color }) => (
              <Text
                style={{
                  color,
                  fontSize: 12,
                  fontWeight: focused ? '700' : '600',
                }}
              >
                Расписание
              </Text>
            ),
          }}
        />
        <Tab.Screen
          name="Питание"
          component={FoodScreen}
          options={{
            tabBarIcon: ({ color, size }) => icons.Food({ color, size }),
            tabBarButton: (props) => <CustomTabBarButton {...props} />,
            tabBarLabel: ({ focused, color }) => (
              <Text
                style={{
                  color,
                  fontSize: 12,
                  fontWeight: focused ? '700' : '600',
                }}
              >
                Питание
              </Text>
            ),
          }}
        />
      </Tab.Navigator>
      <ThemeToggleButton />
    </View>
  );
};

const styles = StyleSheet.create({
  navigatorContainer: {
    flex: 1,
    position: 'relative',
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabButtonInner: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 15,
    minWidth: 70,
  },
  tabButtonActive: {
    transform: [{ scale: 1.05 }],
  },
  themeButtonContainer: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ff6b6b', // Временный фон вместо градиента
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default TabNavigator;