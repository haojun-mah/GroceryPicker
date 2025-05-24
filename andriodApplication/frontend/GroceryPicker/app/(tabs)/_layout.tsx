import { Tabs } from 'expo-router';
import React from 'react';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ headerTitle: "Main Page", headerTitleAlign: "center"}}></Tabs.Screen>
      <Tabs.Screen
        name="groceryInput"
        options={{ headerShown: false }}
      ></Tabs.Screen>
    </Tabs>
  );
}
