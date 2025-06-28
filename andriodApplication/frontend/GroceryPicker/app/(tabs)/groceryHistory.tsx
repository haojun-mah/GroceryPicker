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
import { SavedGroceryList, ControllerError  } from './interface';

/*
  Page host grocery list history for each user.
  User can click on grocery list card which leads to grocery display.

  GET request to /lists/getAll return SavedGroceryList[] type.
  */

const GroceryListHistoryPage = () => {
  const { groceryListHistory , setGroceryListHistory, refreshVersion } = useGroceryContext();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalListID, setModalListID] = useState<string>("");
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
        console.log(groceryListHistory)
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
    <>
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
                onLongPress={() => {
                  setModalListID(list.list_id);
                  setIsModalOpen(true);
                }}
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
    <GroceryListModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} id={modalListID}/>
    </>
  );
};

export default GroceryListHistoryPage;
