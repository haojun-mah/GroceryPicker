import { GroceryRefinementContextProvider } from '@/context/groceryRefinement';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'nativewind';

export default function TabsLayout() {
  const { colorScheme } = useColorScheme();

  const tabBgColor = colorScheme === 'light' ? 'white' : '#1F2937'; // dark gray
  const tabTextColor = colorScheme === 'light' ? 'black' : 'white';

  return (
    <GroceryRefinementContextProvider>
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: 'blue',
        tabBarInactiveTintColor: tabTextColor,
        tabBarLabelStyle: { color: tabTextColor },
        tabBarStyle: {
          backgroundColor: tabBgColor,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
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
          options={{ headerShown: false, tabBarLabel: 'Create List' }}
        />
        <Tabs.Screen
          name="groceryHistory"
          options={{ headerShown: false, tabBarLabel: 'History' }}
        />
        <Tabs.Screen
          name="groceryRefinement"
          options={{ headerShown: false, href: null }}
        />
        <Tabs.Screen
          name="groceryDisplay/[id]"
          options={{ headerShown: false, href: null }}
        />
      </Tabs>
    </GroceryRefinementContextProvider>

  );
}
