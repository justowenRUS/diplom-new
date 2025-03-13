import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { icons } from '../assets/icons'; 
import NewsScreen from '../screens/NewsScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import FoodScreen from '../screens/FoodScreen';
import ProfileScreen from './ProfileScreen';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen 
        name="Новости"
        component={NewsScreen} 
        options={{
          tabBarIcon: ({ color, size }) => icons.Home({ color, size }), 
        }} 
      />
      <Tab.Screen 
        name="Расписание" 
        component={ScheduleScreen} 
        options={{
          tabBarIcon: ({ color, size }) => icons.Schedule({ color, size }),
        }} 
      />
      <Tab.Screen 
        name="Питание" 
        component={FoodScreen} 
        options={{
          tabBarIcon: ({ color, size }) => icons.Food({ color, size }),
        }} 
      />
      <Tab.Screen 
        name="Настройки" 
        component={ProfileScreen} 
        options={{
          tabBarIcon: ({ color, size }) => icons.Profile({ color, size }),
        }} 
      />
    </Tab.Navigator>
  ); 
};

export default TabNavigator;