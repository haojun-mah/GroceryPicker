import DropdownCard from "@/components/DropdownCard";
import { Text } from "@/components/ui/text";
import { useEffect, useState } from "react";
import { View, ScrollView } from "react-native";
import { Button, ButtonGroup, ButtonText} from "@/components/ui/button";
import { useLocalSearchParams } from "expo-router";
import { useGroceryContext } from "@/context/groceryContext";
import { SavedGroceryList } from "../groceryHistory";

const testItem: OptimizedGroceryItem = {
    name: "Sadia",
    quantity: "1",
    price: "$1",
    image: "123",
    purchased: true,
}

const test : OptimizedList = {
    groceryShop: "FairPrice",
    groceryList: [testItem, testItem],
}

export interface OptimizedGroceryItem {
    name: string,
    quantity: string,
    price: string,
    image: string,
    purchased: boolean,
}

interface OptimizedList {
    groceryShop: string,
    groceryList: OptimizedGroceryItem[]
}


const GroceryDisplay = () => {
  const { id } = useLocalSearchParams(); // id of grocerylist
  const { groceryListHistory } = useGroceryContext();
  let currGroceryList: SavedGroceryList | null = null

    useEffect(() => {
      fetchDisplayInfo();
    }, []);

    // filter target grocery list from context with ID
    const fetchDisplayInfo = async () => {
      currGroceryList = groceryListHistory?.filter(list => list.id === id)[0]
    };


// disable for testing purpose
//   if (!optimizedList) {
//     return  (
//     <ScrollView contentContainerStyle={{ paddingTop: 52}}>
//         <View className="px-4 gap-4">
//             <Text className="text-4xl font-semibold mb-2">Optimized Grocery List</Text>
//         </View>
//     </ScrollView>
//     )
//   }

return (
<ScrollView className='bg-[#EEEEEE] dark:bg-black' contentContainerStyle={{ paddingTop: 52}}>
  <View className="px-4 gap-4">
    <Text className="text-4xl font-semibold mb-2 text-black dark:text-white">Optimized Grocery List</Text>
    
    {optimizedList.map((store, idx)=> {
        return (
          <View key={idx} className="items-start w-full">
            <Text className="text-xl font-bold mb-1 ml-[2.5%] text-black dark:text-white">{store.groceryShop}</Text>
           <DropdownCard
            outsideText={store.groceryList}
            insideText={store.groceryList}
            defaultOpen={false}
            />
        </View>
        )
    })}
    <ButtonGroup className="rounded-xl overflow-hidden w-full">
        <Button className="
                w-full h-12 justify-center items-center
                bg-blue-700 dark:bg-gray-600
                active:bg-blue-500 dark:active:bg-gray-300
              ">
            <ButtonText className="text-white dark:text-white active:text-white dark:active:text-black">Start Optimal Route Navigation</ButtonText>
        </Button>
    </ButtonGroup>
 </View>
</ScrollView>

)
}

export default GroceryDisplay;