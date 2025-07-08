import DropdownCard from '@/components/DropdownCard';
import { Text } from '@/components/ui/text';
import { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Button, ButtonGroup, ButtonText } from '@/components/ui/button';
import { useLocalSearchParams } from 'expo-router';
import { useGroceryContext } from '@/context/groceryContext';
import { ALLOWED_SUPERMARKETS, SavedGroceryList } from '../interface';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';

const GroceryDisplay = () => {
  // Extract it as ID
  const { id: rawId } = useLocalSearchParams();
  const id = Array.isArray(rawId) ? rawId[0] : rawId ?? "";
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { groceryListHistory } = useGroceryContext();
  const [currGroceryList, setCurrGroceryList] =
    useState<SavedGroceryList | null>(null);

  // Check ID exist and groceryListHistory is successfully fetched before calling for fetchDisplayInfo
  useEffect(() => {
    if (id && groceryListHistory && groceryListHistory?.length > 0) {
      fetchDisplayInfo();
    }
  }, [id, groceryListHistory]); // Add groceryListHistory to dependencies

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
      list, // Log the found list, not currGroceryList (which might be stale)
    );
  };

  if (!currGroceryList) {
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
        <ScrollView contentContainerStyle={{ paddingTop: 52 }}>
          <View className="px-4 gap-4 text-4xl font-bold">
            <Text className="text-4xl font-semibold mb-2 text-black dark:text-white">
              Optimized Grocery List
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
      className="flex-1"
      contentContainerStyle={{ paddingTop: 52 }}
    >
      <View className="px-4 gap-4">
        <Text className="text-4xl font-bold mb-2 text-black dark:text-white">
          {currGroceryList.title}
        </Text>

        {ALLOWED_SUPERMARKETS.map((shops, idx) => {
          const items = currGroceryList.grocery_list_items.filter((item) => {
            return item.product?.supermarket === shops;
          });
          if (items.length === 0) {
            console.log('Length 0');
            return null;
          }
          return (
            <View key={`${shops}-${idx}`} className="items-start w-full">
              <Text className="text-xl font-semibold mb-1 text-black dark:text-white">
                {shops}
              </Text>
              <DropdownCard
                key={`${id}-${shops}-${currGroceryList.list_id}`} // Unique key that includes list version
                outsideText={items}
                insideText={items}
                defaultOpen={false}
                id={id}
                supermarket={shops} // Pass supermarket identifier
              />
            </View>
          );
        })}

        {/* <ButtonGroup className="rounded-xl overflow-hidden w-full">
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
        </ButtonGroup> */}
      </View>
    </ScrollView>
    </LinearGradient>
  );
};

export default GroceryDisplay;