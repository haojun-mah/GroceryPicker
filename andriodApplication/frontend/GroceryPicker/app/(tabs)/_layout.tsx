import React from 'react';
import { Slot, Tabs } from 'expo-router';
import { View } from 'react-native';
import { BottomNavigation } from 'react-native-paper';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name='index'></Tabs.Screen>
      <Tabs.Screen name='groceryInput' options={{headerShown: false}}></Tabs.Screen>
    </Tabs>
  );
}
