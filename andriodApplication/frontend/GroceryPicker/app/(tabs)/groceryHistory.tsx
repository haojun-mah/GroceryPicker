import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { backend_url } from '@/lib/api';
import { useGroceryContext } from '@/context/groceryContext';
import { useEffect } from 'react';
import { useSession } from '@/context/authContext';
import { router } from 'expo-router';
import {
  ControllerError,
  GROCERY_LIST_STATUS_COLORS,
  GROCERY_LIST_STATUS_LABELS,
  SavedGroceryList,
} from './interface';

/*
  Page host grocery list history for each user.
  User can click on grocery list card which leads to grocery display.

  GET request to /lists/getAll return SavedGroceryList[] type.
  */

const GroceryListHistoryPage = () => {
  const { groceryListHistory, setGroceryListHistory } = useGroceryContext();
  const { session } = useSession();

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
  }, [session]);

  // Displays nothing when groceryListHistory is null or empty
  if (!groceryListHistory || groceryListHistory.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={{ paddingTop: 60 }}
        className="bg-[#EEEEEE] dark:bg-black"
      >
        <View className="px-6">
          <Text className="text-4xl font-bold text-dark dark:text-white">
            History
          </Text>
          <Text className='text-xl'>
            History is Empty.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ paddingTop: 60 }}
      className="bg-[#EEEEEE] dark:bg-black"
    >
      <View className="px-6 gap-4">
        <Text className="text-4xl font-bold text-dark dark:text-white">
          History
        </Text>
        <View className="gap-4">
          {groceryListHistory.map((list, idx) => {
            return (
              <Pressable
                key={idx}
                onPress={() => router.push(`/groceryDisplay/${list.list_id}`)}
              >
                <Card className="bg-white dark:bg-gray-700 rounded-md">
                  <Text className="text-xl font-semibold text-black dark:text-white">
                    {list.title}
                  </Text>
                  <Text className="text-xs font-normal text-gray-500 dark:text-gray-300">
                    {list.metadata ? list.metadata : ''}
                  </Text>
                  <Text
                    className={`text-md font-normal ${
                      GROCERY_LIST_STATUS_COLORS[list.list_status] ??
                      'text-blackdark:text-white'
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
  );
};

export default GroceryListHistoryPage;
