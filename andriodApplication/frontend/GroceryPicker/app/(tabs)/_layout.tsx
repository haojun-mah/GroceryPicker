import { GroceryContextProvider } from '@/context/groceryContext';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'nativewind';
import Entypo from '@expo/vector-icons/Entypo';
import Ionicons from '@expo/vector-icons/Ionicons';
import Fontisto from '@expo/vector-icons/Fontisto';


export default function TabsLayout() {
  const { colorScheme } = useColorScheme();

  const tabBgColor = colorScheme === 'light' ? 'white' : '#1F2937'; // dark gray
  const tabTextColor = colorScheme === 'light' ? 'black' : 'white';

  return (
    <GroceryContextProvider>
      <Tabs
        screenOptions={({ route }) => ({
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
          tabBarIcon: ({ color, size }) => {
            let iconName;

            switch (route.name) {
              case 'Home':
                iconName = <Entypo name="home" size={24} color={tabTextColor}/>;
                break;
              case 'groceryInput':
                iconName = <Ionicons name="create" size={24} color={tabTextColor}/>;
                break;
              case 'groceryHistory':
                iconName = <Fontisto name="history" size={18} color={tabTextColor} />;
                break;
              default:
                iconName = <Fontisto name="history" size={18} color={tabTextColor} />;
                break;
            }

            return iconName;
          },
        })}
      >
        <Tabs.Screen
          name="Home"
          options={{ headerShown: false, tabBarLabel: 'Home' }}
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
    </GroceryContextProvider>
  );
}
