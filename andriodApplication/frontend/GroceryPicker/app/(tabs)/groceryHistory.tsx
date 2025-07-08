import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { useGroceryContext } from '@/context/groceryContext';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import {
  GROCERY_LIST_STATUS_COLORS,
  GROCERY_LIST_STATUS_LABELS,
} from './interface';
import { GroceryListModal } from '@/components/GroceryListModal';
import { backend_url } from '@/lib/api';
import { useSession } from '@/context/authContext';
import { SavedGroceryList, ControllerError } from './interface';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';

/*
  Page host grocery list history for each user.
  User can click on grocery list card which leads to grocery display.

  GET request to /lists/getAll return SavedGroceryList[] type.
  */

const GroceryListHistoryPage = () => {
  const { groceryListHistory, setGroceryListHistory, refreshVersion } =
    useGroceryContext();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalListID, setModalListID] = useState<string>('');
  const { session } = useSession();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Fetch grocery history from backend and cache into context
  const fetchGroceryHistory = async () => {
    try {
      const response = await fetch(`${backend_url}/lists/getAll`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: SavedGroceryList[] = await response.json();
        setGroceryListHistory(data);
        console.log(groceryListHistory);
        console.log(data);
      } else {
        const error: ControllerError = await response.json();
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

  // Displays nothing when groceryListHistory is null or empty
  if (!groceryListHistory || groceryListHistory.length === 0) {
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
        <ScrollView
          contentContainerStyle={{ paddingTop: 60 }}
          className="flex-1"
          style={{ backgroundColor: 'transparent' }}
        >
          <View className="px-6">
            <Text className="text-4xl font-bold text-black dark:text-white">
              History
            </Text>
            <Text className="text-xl text-black/70 dark:text-white/80">
              History is Empty.
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    );
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
      <ScrollView
        contentContainerStyle={{ paddingTop: 60 }}
        className="flex-1"
        style={{ backgroundColor: 'transparent' }}
      >
        <View className="px-6 gap-4">
          <Text className="text-4xl font-bold text-black dark:text-white">
            History
          </Text>
          <Text className="text-xl text-black/70 dark:text-white/80">
            Hold on grocery list to edit
          </Text>
          <View className="gap-4">
            {groceryListHistory.map((list, idx) => {
              return (
                <Pressable
                  key={idx}
                  onPress={() => router.push(`/groceryDisplay/${list.list_id}`)}
                  onLongPress={() => {
                    setModalListID(list.list_id);
                    setIsModalOpen(true);
                  }}
                >
                  <Card className="bg-white/90 dark:bg-gray-700/90 rounded-xl border border-gray-200 dark:border-gray-600 shadow-lg backdrop-blur-sm">
                    <Text className="text-xl font-semibold text-black dark:text-white">
                      {list.title}
                    </Text>
                    <Text className="text-xs font-normal text-black/70 dark:text-white/80">
                      {list.metadata ? list.metadata : ''}
                    </Text>
                    <Text
                      className={`text-md font-normal ${
                        GROCERY_LIST_STATUS_COLORS[list.list_status] ??
                        'text-black dark:text-white'
                      }`}
                    >
                      {GROCERY_LIST_STATUS_LABELS[list.list_status]}
                    </Text>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
      <GroceryListModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        id={modalListID}
      />
    </LinearGradient>
  );
};

export default GroceryListHistoryPage;
