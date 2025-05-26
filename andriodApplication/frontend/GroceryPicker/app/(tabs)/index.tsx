import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { Button } from 'react-native-paper';

export default function HomePage() {

  // likewise have no idea why setting w-max is not working. unable to
  // standardise button width

  return (
    <ScrollView>
      <View className="items-center m-2 flex gap-4">
        <Text className="text-2xl">Welcome to Grocery Picker</Text>
        <ButtonGroup>
          <Button
            onPress={() => router.push('./groceryInput')}
            className="bg-amber-50 hover:bg-black"
            size="sm"
            variant="outline"
            action="primary"
          >
            <ButtonText>Go to Grocery List Generator</ButtonText>
          </Button>
        </ButtonGroup>
       <ButtonGroup>
          <Button
            onPress={() => router.push('./groceryHistory')}
            className="bg-amber-50 hover:bg-black"
            size="sm"
            variant="outline"
            action="primary"
          >
            <ButtonText>Go to Grocery List History</ButtonText>
          </Button>
        </ButtonGroup>
      </View>
    </ScrollView>
  );
}
