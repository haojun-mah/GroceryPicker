import DropdownCard from '@/components/DropdownCard';
import { GroceryMetadataTitleOutput, useGroceryContext } from '@/context/groceryContext';
import { Text, View } from 'react-native';
import { GroceryItem } from '@/context/groceryContext';
import { ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

const groceryHistory = () => {
  const { grocery , isLoading, error } = useGroceryContext();
  const { openLatest } = useLocalSearchParams();

  if (error) {
    console.log("Front end handling error from grocerycontext. Receiving at groceryHistory");
  }
  if (!grocery || !Array.isArray(grocery) || grocery.length === 0) {
    return (
      <View className="flex items-center mt-20 p-4 gap-2">
        <Text className="font-bold font-roboto text-2xl">Grocery History</Text>
      </View>
    )
  }

   const dropDownPopulatedWithInfo = grocery
    .filter((group): group is GroceryMetadataTitleOutput => group !== null && typeof group === "object") // I DO NOT UNDERSTAND!!! THE FILTER HERE IS WRONG. BUT IT IS WRONG IT RETURNS THE ABOVE ONE?
    .map((group: GroceryMetadataTitleOutput, groupIndex: number) => { // 'group' here is an array of GeneratedGroceryItem
      const title = group.title;
      const metadata = group.metadata;
      const groceryConcat = group.items
        .filter((item): item is GroceryItem => item !== null && item !== undefined) // Robust filter for safety
        .map((item: GroceryItem) => {
          return `${item.name} - ${item.quantity} ${item.unit}`;
        });

      return (
        <DropdownCard
          key={`group-${groupIndex}`} // Unique key for each DropdownCard (based on group index)
          title={title} // Title for card
          outsideText={metadata} // Metadata (time and date)
          insideText={groceryConcat} // This array contains the formatted strings for this group
          defaultOpen={groupIndex === 0 && openLatest === 'true'}
        />);
      });

  return (
    <ScrollView>
      <View className="flex items-center mt-20 p-4 gap-2">
        <Text className="font-bold font-roboto text-2xl">Grocery History</Text>
        {dropDownPopulatedWithInfo}
      </View>
    </ScrollView>
 );
};

export default groceryHistory;
