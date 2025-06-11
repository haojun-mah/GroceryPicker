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
    return (
      <View className="flex items-center mt-20 p-4 gap-2">
        <Text className="font-bold font-roboto text-2xl">Grocery History</Text>
      </View>
    )
  }

  const dropDownPopulatedWithInfo = grocery.map((array) => {
      const groceryConcat = array.map((grocery: GroceryItem) => {
        return `${grocery.name} - ${grocery.quantity}${grocery.unit}`
    })
      return (<DropdownCard outsideText="metadata" insideText={groceryConcat}/>);
  });

  return (
    <View className="flex items-center mt-20 p-4 gap-2">
      <Text className="font-bold font-roboto text-2xl">Grocery History</Text>
      {dropDownPopulatedWithInfo}
    </View>
  );
};

export default groceryHistory;
