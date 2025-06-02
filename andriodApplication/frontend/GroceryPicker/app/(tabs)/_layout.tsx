import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: 'blue' }}>
      <Tabs.Screen
        name="Home"
        options={{
          headerShown: false,
          headerTitle: 'Main Page',
          headerTitleAlign: 'center',
          tabBarLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="groceryInput"
        options={{ headerShown: false, tabBarLabel: 'Grocery List' }}
      />
      <Tabs.Screen
        name="groceryHistory"
        options={{ headerShown: false, tabBarLabel: 'Grocery History' }}
      />
    </Tabs>
  );
}
