import { Button, ButtonGroup, ButtonText } from '@/components/ui/button';
import { ScrollView, Text, View } from 'react-native';

export default function HomePage() {
  return (
    <ScrollView>
      <View className='items-center m-2 flex gap-4'>
        <Text className='text-2xl'>Welcome to Grocery Picker</Text>
        <ButtonGroup>
          <Button className='bg-amber-50 hover:bg-black' size='md' variant='outline' action='primary'>
            <ButtonText>
              Go to Grocery List Generator
            </ButtonText>
          </Button>
        </ButtonGroup>
      </View>
    </ScrollView>
  );
}
