import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { Button, ButtonGroup, ButtonText } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { ColorModeSwitch } from '@/components/ColorModeSwitch';
import { useSession } from '@/context/authContext';

export default function HomePage() {
  // likewise have no idea why setting w-max is not working. unable to
  // standardise button width
  const { session } = useSession();
  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error signing out:', error.message);
    } else {
      router.replace('/(auth)/Login');
    }
  }

  console.log(session?.access_token);

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View className="flex-1 justify-center items-center bg-white dark:bg-black? gap-6 p-6">
        <ColorModeSwitch />
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
