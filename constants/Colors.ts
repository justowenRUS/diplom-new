interface ColorScheme {
  background: string;
  tabBarBackground: string;
  primary: string;
  text: string;
  iconActive: string;
  iconInactive: string;
}

export interface ColorsType {
  light: ColorScheme;
  dark: ColorScheme;
}

export default {
  light: {
    background: '#ffffff',
    tabBarBackground: '#ffffff',
    primary: '#0891b2',
    text: '#000000',
    iconActive: '#0891b2',
    iconInactive: '#737373',
  },
  dark: {
    background: '#000000',
    tabBarBackground: '#000000',
    primary: '#0891b2',
    text: '#ffffff',
    iconActive: '#ffffff',
    iconInactive: '#737373',
  },
} as ColorsType; // Применяем типизацию