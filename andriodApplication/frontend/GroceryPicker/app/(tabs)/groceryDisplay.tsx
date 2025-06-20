import DropdownCard from "@/components/DropdownCard";
import { Text } from "@/components/ui/text";
import { View, ScrollView } from "react-native";


const GroceryDisplay = () => {

const insideTextTest = {
    name: "Sadia",
    quantity: "1",
    price: "$1",
    image: "123",
    purchased: true,
}

return (
    <ScrollView>
        <View>
            <Text>Optimized Grocery List</Text>
        </View>
        <View>
            <Text>FairPrice</Text>
            <DropdownCard outsideText={["A", "B"]} insideText={[insideTextTest]} defaultOpen={true}/>
        </View>
    </ScrollView>

)
}

export default GroceryDisplay;