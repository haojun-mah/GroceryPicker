import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { ButtonGroup, Button, ButtonText } from '@/components/ui/button';
import { useGroceryRefinementContext } from '@/context/groceryRefinement';
import { useGroceryContext } from '@/context/groceryContext';
import { GroceryItem, GroceryMetadataTitleOutput } from '@/context/groceryContext';
import { useSession } from '@/context/authContext';
import { backend_url } from '../../config/api';
import { SavedGroceryList, SavedGroceryListItem } from './groceryHistory';
import { router } from 'expo-router';
import { AiPromptRequestBody } from './groceryInput';

const { height: screenHeight } = Dimensions.get('window');

const ModalPage = () => {
  const [generateRefinementGrocery, setGenerateRefinementGrocery] = useState<AiPromptRequestBody>();
  const { groceryRefinement, setGroceryRefinement } = useGroceryRefinementContext();
  const { setGroceryListHistory } = useGroceryContext();
  const groceryList: GroceryItem[] | undefined = groceryRefinement?.items;
  const supermarketFilter: string[] | undefined = !groceryRefinement?.supermarketFilter ? [] : groceryRefinement.supermarketFilter;
  const { session } = useSession();

  useEffect(() => {
    if (groceryList !== undefined) {
      let groceryListString = '';
      for (let i = 0; i < groceryList.length; i++) {
        groceryListString += `${groceryList[i].name} - ${groceryList[i].quantity}${groceryList[i].unit}\n`;
      }
      setGenerateRefinementGrocery({ message: groceryListString, supermarketFilter: supermarketFilter});
    }
  }, []);

  const refineMyList = async () => {
    try {
      if (generateRefinementGrocery?.message.length === 0) return;

      console.log(generateRefinementGrocery); // debug
      const response = await fetch(`${backend_url}/lists/refine`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generateRefinementGrocery),
      });

      const output: GroceryMetadataTitleOutput = await response.json();
      if (response.ok) {
        setGroceryRefinement(output);
        const refinedList = output.items.map(i => `${i.name} - ${i.quantity}${i.unit}`).join('\n');
        setGenerateRefinementGrocery({message: refinedList, supermarketFilter: supermarketFilter});
      }
    } catch (error) {
      console.log(error);
      alert(error);
    }
  };

  const findCheapest = async () => {
    try {
      if (generateRefinementGrocery?.message.length === 0) return;
      console.log(generateRefinementGrocery); // debug
      const response = await fetch(`${backend_url}/lists/optimise`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generateRefinementGrocery),
      });

      // Optimise list obtained to get its list ID
      const optimisedList: SavedGroceryListItem = await response.json();
     
      // All of users grocery lists retrieved. Contains newly generated optimised list as well
      const responseAllList = await fetch(`${backend_url}/lists/getAll`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const allList : SavedGroceryList[] = await responseAllList.json();

      setGroceryListHistory(allList);
      router.push(`/groceryDisplay/${optimisedList.id}`)
      // Handle output
    } catch (error) {
      console.log(error);
      alert(error);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ paddingTop: 60 }} className="bg-[#EEEEEE] dark:bg-black min-h-screen px-4">
      <View className="gap-6">
        <View className="gap-2">
          <Text className="text-4xl font-bold text-black dark:text-white">Refine Your List</Text>
          <Text className="text-md text-gray-500 dark:text-gray-300">Don’t like your list?</Text>
          <Text className="text-md text-gray-500 dark:text-gray-300">Edit it and we’ll do the work!</Text>
        </View>

        <View style={{ height: screenHeight * 0.3 }}>
          <Textarea className="w-full h-full rounded-xl bg-white dark:bg-gray-700 border-0">
            <TextareaInput
              className="text-black dark:text-white"
              multiline
              value={generateRefinementGrocery?.message}
              onChangeText={e => setGenerateRefinementGrocery({message: e, supermarketFilter: supermarketFilter})}
              textAlignVertical="top"
                />
          </Textarea>
        </View>

        <ButtonGroup className="w-full flex-row justify-between gap-4">
          <Button
            className="bg-blue-700 dark:bg-gray-600 active:bg-blue-500 dark:active:bg-gray-300 rounded-md flex-1"
            onPress={refineMyList}
          >
            <ButtonText className="text-white">Refine My List</ButtonText>
          </Button>

          <Button
            className="bg-blue-700 dark:bg-gray-600 active:bg-blue-500 dark:active:bg-gray-300 rounded-md flex-1"
            onPress={findCheapest}
          >
            <ButtonText className="text-white">Find Cheapest</ButtonText>
          </Button>
        </ButtonGroup>
      </View>
    </ScrollView>
  );
};

export default ModalPage;
