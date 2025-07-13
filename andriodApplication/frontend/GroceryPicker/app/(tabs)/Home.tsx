import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { supabase } from '@/lib/supabase';
import { ColorModeSwitch } from '@/components/ColorModeSwitch';
import { useSession } from '@/context/authContext';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { backend_url } from '@/lib/api';
import { ControllerError, SavedGroceryList } from './interface';
import { useState } from 'react';
import { useGroceryContext } from '@/context/groceryContext';

export default function HomePage() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { session } = useSession();
  const [noListCreated, setNoListCreated] = useState<number>(0);
  const [noItems, setNoItems] = useState<number>(0);
  const [noListCompleted, setNoListCompleted] = useState<number>(0);
  const { refreshVersion, groceryListHistory, setGroceryListHistory} = useGroceryContext();

  const fetchGroceryHistory = async () => {
    try {
      console.log('🔍 Fetching grocery history...');
      const response = await fetch(`${backend_url}/lists/getAll`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: SavedGroceryList[] = await response.json();
        console.log('🔍 Fetched grocery lists:', data);
        console.log('🔍 Number of lists:', data.length);
        if (data.length > 0) {
          console.log('🔍 First list ID:', data[0].list_id, 'Type:', typeof data[0].list_id);
        }
        setNoListCreated(data.length);
        setNoItems(data.flatMap(list => list.grocery_list_items).length);
        setNoListCompleted(data.filter(list => list.list_status === 'purchased').length);
        setGroceryListHistory(data);
      } else {
        const error: ControllerError = await response.json();
        console.error('🔍 Error fetching grocery history:', error);
        throw new Error(`Error ${error.statusCode}: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to fetch grocery history:', error);
    }
  };

  // Runs fetchGroceryHistory on component mount/render
  useEffect(() => {
    if (session) {
      fetchGroceryHistory();
    }
  }, [refreshVersion]); // when refreshVersion changes, useEffect will trigger code inside

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error signing out:', error.message);
    } 

    router.replace('/(auth)/Login');
  }

  return (
    <LinearGradient
      colors={isDark 
        ? ['#1f2937', '#374151', '#4b5563'] 
        : ['#667eea', '#764ba2', '#f093fb']
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <ScrollView className='flex-1' contentContainerStyle={{ flexGrow: 1 }}>
        {/* Floating Dark Mode Toggle */}
        <View className="absolute top-12 right-6 z-10">
          <ColorModeSwitch />
        </View>
        <View className="flex-1 px-6 relative justify-center items-center">
          {/* Header Section */}
          <View className="items-center py-8 w-full max-w-sm">
            <View className='flex-row items-center justify-items-center'>
              <Text 
                className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-black'} mb-3 text-center`}
              >
                Grocery Picker
              </Text>
            </View>
            
            <Text 
              className={`text-xl ${isDark ? 'text-white/90' : 'text-black/80'} mb-5 font-medium text-center`}
            >
              Smart Shopping Made Simple
            </Text>
            
            <Text 
              className={`text-base ${isDark ? 'text-white/80' : 'text-black/80'} text-center leading-6 max-w-xs`}
            >
              Transform your shopping experience with AI-powered grocery lists that save time and reduce waste
            </Text>
          </View>

          {/* Statistics */}
          <View className="flex-row gap-1 mb-8 w-full max-w-sm">
            <View className={`flex-1 ${isDark ? 'bg-white/5' : 'bg-white/10'} backdrop-blur-md rounded-2xl p-4 items-center border ${isDark ? 'border-white/10' : 'border-white/20'}`}>
              <Text className="text-lg mb-1">📝</Text>
              <Text className={`${isDark ? 'text-white' : 'text-black'} font-bold text-xl`}>{noListCreated}</Text>
              <Text className={`${isDark ? 'text-white/80' : 'text-black/80'} text-sm text-center`}>Lists Created</Text>
            </View>
            
            <View className={`flex-1 ${isDark ? 'bg-white/5' : 'bg-white/10'} backdrop-blur-md rounded-2xl p-4 items-center border ${isDark ? 'border-white/10' : 'border-white/20'}`}>
              <Text className="text-lg mb-1">🛍️</Text>
              <Text className={`${isDark ? 'text-white' : 'text-black'} font-bold text-xl`}>{noItems}</Text>
              <Text className={`${isDark ? 'text-white/80' : 'text-black/80'} text-sm text-center text-wrap`}>Items Managed</Text>
            </View>
            
            <View className={`flex-1 ${isDark ? 'bg-white/5' : 'bg-white/10'} backdrop-blur-md rounded-2xl p-4 items-center border ${isDark ? 'border-white/10' : 'border-white/20'}`}>
              <Text className="text-lg mb-1">🛒</Text>
              <Text className={`${isDark ? 'text-white' : 'text-black'} font-bold text-xl`}>{noListCompleted}</Text>
              <Text className={`${isDark ? 'text-white/80' : 'text-black/80'} text-sm text-center text-wrap`}>List Completed</Text>
            </View>
          </View>

          {/* Main CTA */}
          <View className="mb-4 w-full max-w-sm">
            <LinearGradient
              colors={isDark 
                ? ['#4f46e5', '#7c3aed', '#db2777'] 
                : ['#ff6b6b', '#ffa726', '#ffcc02']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 16,
                padding: 24,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
                elevation: 8,
              }}
            >
              <Button
                onPress={() => router.push('./groceryInput')}
                className="bg-transparent border-0"
                size="xl"
              >
                <View className="items-center">
                  <Text className="text-white text-2xl font-bold mb-1">Create My List</Text>
                  <Text className="text-white/90 text-base">Start your smart shopping journey</Text>
                </View>
              </Button>
            </LinearGradient>
          </View>

          {/* Secondary Actions */}
          <View className="flex-row gap-3 w-full max-w-sm">
            <View className="flex-1">
              <View className={`${isDark ? 'bg-white/5' : 'bg-white/10'} backdrop-blur-md rounded-xl p-4 border ${isDark ? 'border-white/10' : 'border-white/20'}`}>
                <Button
                  onPress={() => router.push('./groceryHistory')}
                  className="bg-transparent border-0"
                  size="md"
                >
                  <View className="items-center">
                    <Text className="text-lg mb-1">📋</Text>
                    <Text className={`${isDark ? 'text-white' : 'text-black'} font-semibold text-sm`}>History</Text>
                  </View>
                </Button>
              </View>
            </View>
            
            <View className="flex-1">
              <View className={`${isDark ? 'bg-white/5' : 'bg-white/10'} backdrop-blur-md rounded-xl p-4 border ${isDark ? 'border-white/10' : 'border-white/20'}`}>
                <Button
                  onPress={() => signOut()}
                  className="bg-transparent border-0"
                  size="md"
                >
                  <View className="items-center">
                    <Text className="text-lg mb-1">🚪</Text>
                    <Text className={`${isDark ? 'text-white' : 'text-black'} font-semibold text-sm`}>Sign Out</Text>
                  </View>
                </Button>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}