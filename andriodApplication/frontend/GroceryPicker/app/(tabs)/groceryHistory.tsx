import DropdownCard from '@/components/DropdownCard';
import { useGroceryContext } from '@/context/groceryContext';
import { Text, View } from 'react-native';
import { GroceryItem } from '@/context/groceryContext';

const groceryHistory = () => {
  const { grocery , isLoading, error } = useGroceryContext();

  if (error) {
    console.log("Front end handling error from grocerycontext. Receiving at groceryHistory");
  }

  if (!grocery || grocery.length === 0) {
    throw Error("Invalid grocery list at groceryHistory");
  }

  const formatGroceryList: string[] = grocery?.map((item: GroceryItem) => { // currently mapping item into array of strings. to map array of items into array of array of strings in the future
    return `${item.name} - ${item.quantity}${item.unit}`
  });

  return (
    <View className="flex items-center mt-20 p-4 gap-2">
      <Text className="font-bold font-roboto text-2xl">Grocery History</Text>
      <DropdownCard outsideText="Metadata in here" insideText={formatGroceryList}/> 
    </View>
  );
};

export default groceryHistory;
