import { ScrollView, View } from "react-native"
import { Text } from "@/components/ui/text"
import { Card } from "@/components/ui/card"

interface groceryList {


}

const GroceryListHistoryPage = () => {
  return(
    <ScrollView contentContainerStyle={{ paddingTop: 60 }} className="bg-[#EEEEEE] dark:bg-black">
      <View className="px-6">
        <Text className="text-4xl font-bold text-dark dark:text-white">History</Text>
        <View>
              <Card className="bg-white dark:bg-gray-700 rounded-md">
                <Text className="text-xl font-semibold text-black dark:text-white">
                  Title
                </Text>
                <Text className="text-xs font-normal text-gray-500 dark:text-gray-300">
                  Metadata
                </Text>
                <Text className="text-md font-normal">
                  Status
                </Text>
              </Card>
        </View>
      </View>
    </ScrollView>
  )
}

export default GroceryListHistoryPage;
 