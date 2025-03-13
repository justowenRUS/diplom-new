import React from 'react';
import { AntDesign, Feather, FontAwesome } from '@expo/vector-icons';

export const icons = {
  Home: (props) => <AntDesign name="home" {...props} />,
  Schedule: (props) => <Feather name="calendar" {...props} />,
  Food: (props) => <FontAwesome name="cutlery" {...props} />, // Используйте иконку для еды
  Profile: (props) => <AntDesign name="setting" {...props} />,
};