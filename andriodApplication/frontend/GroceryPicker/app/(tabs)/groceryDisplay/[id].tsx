import DropdownCard from '@/components/DropdownCard';
import { Text } from '@/components/ui/text';
import { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Button, ButtonGroup, ButtonText } from '@/components/ui/button';
import { useLocalSearchParams } from 'expo-router';
import { useGroceryContext } from '@/context/groceryContext';
import { ALLOWED_SUPERMARKETS, SavedGroceryList } from '../interface';

const GroceryDisplay = () => {
  const { id } = useLocalSearchParams(); // id of grocerylist
  const { groceryListHistory } = useGroceryContext();
  const [currGroceryList, setCurrGroceryList] =
    useState<SavedGroceryList | null>(null);
    
  // Check ID exist and groceryListHistory is successfully fetched before calling for fetchDisplayInfo
  useEffect(() => {
    if (id && groceryListHistory && groceryListHistory?.length > 0) {
      fetchDisplayInfo();
    }
  }, [id, groceryListHistory]); // useEffect will run again when these 2 values changes

  // filter target grocery list from context with ID
  const fetchDisplayInfo = async () => {
    const list = groceryListHistory?.find(
      (list) => String(list.list_id) === String(id),
    );
    setCurrGroceryList(list ?? null);
    console.log(
      'Check displayid page. Expecting JSON containing singular grocery list',
    );
    console.log(
      'Check display if it has target grocery list mounted:\n',
      currGroceryList,
    );
  };

  if (!currGroceryList) {
    return (
      <ScrollView contentContainerStyle={{ paddingTop: 52 }}>
        <View className="px-4 gap-4 text-4xl font-bold text-black dark:text-white">
          <Text className="text-4xl font-semibold mb-2">
            Optimized Grocery List
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="bg-[#EEEEEE] dark:bg-black"
      contentContainerStyle={{ paddingTop: 52 }}
    >
      <View className="px-4 gap-4">
        <Text className="text-4xl font-bold mb-2 text-black dark:text-white">
          {currGroceryList.title}
        </Text>

        {ALLOWED_SUPERMARKETS.map((shops, idx) => {
          const items = currGroceryList.grocery_list_items.filter(
            (item) => {
              return item.product?.supermarket === shops;
            }
          );
          if (items.length === 0) {
            console.log("Length 0");
            return null;
          }
          return (
            <View key={idx} className="items-start w-full">
              <Text className="text-xl font-semibold mb-1 text-black dark:text-white">
                {shops}
              </Text>
              <DropdownCard
                outsideText={items}
                insideText={items}
                defaultOpen={false}
              />
            </View>
          );
        })}

        <ButtonGroup className="rounded-xl overflow-hidden w-full">
          <Button
            className="
                w-full h-12 justify-center items-center
                bg-blue-700 dark:bg-gray-600
                active:bg-blue-500 dark:active:bg-gray-300
              "
          >
            <ButtonText className="text-white dark:text-white active:text-white dark:active:text-black">
              Start Optimal Route Navigation
            </ButtonText>
          </Button>
        </ButtonGroup>
      </View>
    </ScrollView>
  );
};

export default GroceryDisplay;
