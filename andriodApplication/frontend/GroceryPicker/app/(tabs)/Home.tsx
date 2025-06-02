import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { Button, ButtonGroup, ButtonText } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export default function HomePage() {
  // likewise have no idea why setting w-max is not working. unable to
  // standardise button width
  
  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error signing out:', error.message);
    } else {
      router.replace("/(auth)/Login")
    }
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View className="flex-1 justify-center items-center gap-6 p-6">
        <Text className="text-2xl">Welcome to Grocery Picker</Text>
        <ButtonGroup>
          <Button
            onPress={() => router.push('./groceryInput')}
            className="bg-amber-50 hover:bg-black"
            size="xl"
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
            size="xl"
            variant="outline"
            action="primary"
          >
            <ButtonText>Go to Grocery List History</ButtonText>
          </Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button
            onPress={() => signOut()}
            className="bg-amber-50 hover:bg-black"
            size="xl"
            variant="outline"
            action="primary"
          >
            <ButtonText>Sign Out</ButtonText>
          </Button>
        </ButtonGroup>


      </View>
    </ScrollView>
  );
}
