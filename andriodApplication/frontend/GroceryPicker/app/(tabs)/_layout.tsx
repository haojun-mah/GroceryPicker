import { Tabs } from 'expo-router';
<<<<<<< HEAD
import React from 'react';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ headerTitle: "Main Page", headerTitleAlign: "center"}}></Tabs.Screen>
      <Tabs.Screen
        name="groceryInput"
        options={{ headerShown: false }}
      ></Tabs.Screen>
=======

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: 'blue'}}>
      <Tabs.Screen
        name="index"
        options={{ headerTitle: 'Main Page', headerTitleAlign: 'center', tabBarLabel: 'Home' }}
      />
      <Tabs.Screen name="groceryInput" options={{ headerShown: false, tabBarLabel: 'Grocery List' }} />
      <Tabs.Screen name="groceryHistory" options={{ headerShown: false, tabBarLabel: 'Grocery History' }} />
>>>>>>> frontend
    </Tabs>
  );
}
