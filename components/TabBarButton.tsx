import { Pressable, StyleSheet } from 'react-native';
import React, { useEffect,  useContext} from 'react';
import { icons } from '../assets/icons';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { ThemeContext } from '..//ThemeContext'; // Импортируем контекст темы

interface TabBarButtonProps {
  isFocused: boolean;
  label: string;
  routeName: string;
  color: string;
  onPress: () => void;
}

const TabBarButton: React.FC<TabBarButtonProps> = (props) => {
  const { isFocused, label, routeName, color, onPress } = props;
  const scale = useSharedValue(0);

  const { isDarkMode } = useContext(ThemeContext); // Получаем текущую тему из контекста

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1 : 0, { duration: 200 });
  }, [isFocused]);

  const animatedIconStyle = useAnimatedStyle(() => {
    const scaleValue = interpolate(scale.value, [0, 1], [1, 1.1]);
    const translateY = interpolate(scale.value, [0, 1], [0, -4]);
    return {
      transform: [{ scale: scaleValue }, { translateY }],
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scale.value, [0, 1], [1, 0]);
    return {
      opacity,
    };
  });

  return (
    <Pressable onPress={onPress} style={styles.container}>
      <Animated.View style={animatedIconStyle}>
        {icons[routeName]({ color: isFocused ? (isDarkMode ? '#FFFFFF' : '#000000') : '#737373' })}
      </Animated.View>
      <Animated.Text
        style={[
          {
            color: isFocused ? (isDarkMode ? '#FFFFFF' : '#000000') : '#737373',
            fontSize: 11,
          },
          animatedTextStyle,
        ]}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
});

export default TabBarButton;