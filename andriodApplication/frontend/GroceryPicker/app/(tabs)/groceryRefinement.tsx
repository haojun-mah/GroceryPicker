import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { ButtonGroup, Button, ButtonText } from '@/components/ui/button';
import { useGroceryContext } from '@/context/groceryContext';
import {
  GroceryItem,
  GroceryMetadataTitleOutput,
  SavedGroceryList,
  SavedGroceryListItem,
  AiPromptRequestBody,
} from './interface';
import { useSession } from '@/context/authContext';
import { backend_url } from '../../lib/api';
import { router } from 'expo-router';

const { height: screenHeight } = Dimensions.get('window');

const ModalPage = () => {
  const [generateRefinementGrocery, setGenerateRefinementGrocery] =
    useState<AiPromptRequestBody | undefined>(undefined);

  const {
    setIsLoading,
    groceryRefinement,
    setGroceryRefinement,
    setGroceryListHistory,
  } = useGroceryContext();

  const groceryList: GroceryItem[] | undefined = groceryRefinement?.items;
  const supermarketFilter: string[] =
    groceryRefinement?.supermarketFilter || [];

  const { session } = useSession();

  /**
   * Syncs generateRefinementGrocery state to reflect current groceryRefinement
   */
  useEffect(() => {
    if (groceryList !== undefined) {
      let groceryListString = '';
      for (let i = 0; i < groceryList.length; i++) {
        groceryListString += `${groceryList[i].name} - ${groceryList[i].quantity}${groceryList[i].unit}\n`;
      }
      setGenerateRefinementGrocery({
        message: groceryListString,
        supermarketFilter: supermarketFilter,
      });
    } else {
      setGenerateRefinementGrocery(undefined);
    }
  }, [groceryList, supermarketFilter]);

const refineMyList = async (): Promise<boolean> => {
  try {
    if (!generateRefinementGrocery?.message?.length) {
      Alert.alert("Your list is empty.");
      return false;
    }

    setIsLoading(true);

    const response = await fetch(`${backend_url}/lists/generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(generateRefinementGrocery),
    });

    setIsLoading(false);

    if (response.ok) {
      const output: GroceryMetadataTitleOutput = await response.json();

      if (output.title === '!@#$%^') {
        Alert.alert("Invalid refinement item.");
        return false;
      }

      setGroceryRefinement(output);

      const refinedList = output.items
        .map((i) => `${i.name} - ${i.quantity}${i.unit}`)
        .join('\n');

      setGenerateRefinementGrocery({
        message: refinedList,
        supermarketFilter,
      });

      return true;
    } else {
      alert("Invalid refinement item.");
      return false;
    }
  } catch (error) {
    console.error(error);
    alert("An error occurred while refining your list.");
    setIsLoading(false);
    return false;
  }
};


 const findCheapest = async () => {
  try {
    if (!generateRefinementGrocery?.message?.length) return;

    setIsLoading(true);

    const refineSucceeded = await refineMyList();

    if (!refineSucceeded) {
      // Stop execution if refinement failed
      setIsLoading(false);
      return;
    }

    const response = await fetch(`${backend_url}/lists/optimise`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(generateRefinementGrocery),
    });

    const optimisedList: SavedGroceryListItem = await response.json();

    const responseAllList = await fetch(`${backend_url}/lists/getAll`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    const allList: SavedGroceryList[] = await responseAllList.json();

    setGroceryListHistory(allList);
    setGroceryRefinement(null);
    setIsLoading(false);

    router.push(`/groceryDisplay/${optimisedList.list_id}`);
  } catch (error) {
    console.error(error);
    alert("An error occurred while finding the cheapest list.");
    setIsLoading(false);
  }
};


  return (
    <ScrollView
      contentContainerStyle={{ paddingTop: 60 }}
      className="bg-[#EEEEEE] dark:bg-black min-h-screen px-4"
    >
      <View className="gap-6">
        <View className="gap-2">
          <Text className="text-4xl font-bold text-black dark:text-white">
            Refine Your List
          </Text>
          <Text className="text-md text-gray-500 dark:text-gray-300">
            Don’t like your list?
          </Text>
          <Text className="text-md text-gray-500 dark:text-gray-300">
            Edit it and we’ll do the work!
          </Text>
        </View>

        <View style={{ height: screenHeight * 0.3 }}>
          <Textarea className="w-full h-full rounded-xl bg-white dark:bg-gray-700 border-0">
            <TextareaInput
              className="text-black dark:text-white"
              multiline
              value={generateRefinementGrocery?.message || ''}
              onChangeText={(e) =>
                setGenerateRefinementGrocery({
                  message: e,
                  supermarketFilter: supermarketFilter,
                })
              }
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
