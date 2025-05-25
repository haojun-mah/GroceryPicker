import DropdownCard from "@/components/DropdownCard";
import { Text, View } from "react-native";

const groceryHistory = () => {
  return (
    <View className="flex items-center mt-10 gap-2">
        <Text className="font-bold font-roboto text-2xl">Grocery History</Text>
        <DropdownCard></DropdownCard>        
    </View>
  );

};

export default groceryHistory;
