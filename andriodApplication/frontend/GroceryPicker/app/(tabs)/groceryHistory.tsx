import { Pressable, ScrollView, View } from "react-native"
import { Text } from "@/components/ui/text"
import { Card } from "@/components/ui/card"
import { backend_url } from "@/lib/api"
import { useGroceryContext } from "@/context/groceryContext"
import { useEffect } from "react"

/*
  Page host grocery list history for each user.
  User can click on grocery list card which leads to grocery display.

  GET request to /lists/getAll return SavedGroceryList[] type.
  */

// Below are types for Res. IMO quite messy to put here. Unsure of putting it in
// a separate interface file.
// Grocery Item Typesc
export interface SavedGroceryListItem {
  id: string;
  name: string;
  price: number | null;
  supermarket: string | null;
  quantity: string | null;
  similarity?: number | null;
  product_url?: string | null;
  image_url?: string | null;
  embedding?: number[] | null;
}

// Grocery List Status
export const GROCERY_LIST_STATUSES = [
  'incomplete',
  'purchased',
  'archived',
] as const;
export type GroceryListStatus = typeof GROCERY_LIST_STATUSES[number] | string;

// Grocery List Types. 
export interface SavedGroceryList {
  id: string;
  user_id: string;
  title: string;
  metadata: string | null;
  created_at: string;
  grocery_list_items: SavedGroceryListItem[];
  list_status: string;
}

// Controller Error Types
interface ControllerError {
  statusCode: number;
  message: string;
  details?: string;
}

const GroceryListHistoryPage = () => {
  const { groceryListHistory, setGroceryListHistory } = useGroceryContext();

  // Fetch grocery history from backend and cache into context
  const fetchGroceryHistory = async () => {
    try {
      const response = await fetch(`${backend_url}/lists/getAll`, {
        method: 'GET',
        headers: {
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
      console.error("Failed to fetch grocery history:", error);
    }
  }

  // Runs fetchGroceryHistory on component mount/render
  useEffect(() => {
    fetchGroceryHistory();
  }, []);

  // Displays nothing when groceryListHistory is null or empty
  if (!groceryListHistory) {
    return (
      <ScrollView contentContainerStyle={{ paddingTop: 60 }} className="bg-[#EEEEEE] dark:bg-black">
        <View className="px-6">
          <Text className="text-4xl font-bold text-dark dark:text-white">History</Text>
        </View>
      </ScrollView>
    );
  }

  return(
    <ScrollView contentContainerStyle={{ paddingTop: 60 }} className="bg-[#EEEEEE] dark:bg-black">
      <View className="px-6">
        <Text className="text-4xl font-bold text-dark dark:text-white">History</Text>
        <View>
          {groceryListHistory.map((list, idx) => {
            return ( 
              <Pressable>
                <Card id={`${idx}`} className="bg-white dark:bg-gray-700 rounded-md">
                  <Text className="text-xl font-semibold text-black dark:text-white">
                    {list.title}
                  </Text>
                  <Text className="text-xs font-normal text-gray-500 dark:text-gray-300">
                    {list.metadata ? list.metadata : ""}  
                  </Text>
                  <Text className="text-md font-normal">
                    {list.list_status}
                  </Text>
                </Card>
              </Pressable>
            );
          })}
       </View>
      </View>
    </ScrollView>
  )
}

export default GroceryListHistoryPage;
 