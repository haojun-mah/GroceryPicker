import { Button, ButtonGroup, ButtonText } from '@/components/ui/button';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { Text } from '@/components/ui/text';
import React, { useState } from 'react';
import { Dimensions, ScrollView, View } from 'react-native';
import { backend_url } from '../../config/api';
import { useGroceryContext } from '@/context/groceryContext';
import {
  GroceryMetadataTitleOutput,
} from '@/context/groceryContext';
import { useSession } from '@/context/authContext';
import { router } from 'expo-router';
import { ColorModeSwitch } from '@/components/ColorModeSwitch';
import { DropdownSelector } from '@/components/DropDownSelector';
import { useColorScheme } from 'nativewind';

const groceryInput = () => {
  const [groceryTextArea, setGroceryTextArea] = useState<string>('');
  const { grocery, setGrocery, setIsLoading, setError } = useGroceryContext();
  const [selectedGroceryShop, setSelectedGroceryShop] = useState<string[]>([]);
  const { session } = useSession();

  const postData = async () => {
    try {
      if (groceryTextArea.length === 0) return;

      setIsLoading(true);
      setError(null);

      const response = await fetch(`${backend_url}/grocery/generate`, {
        method: 'POST',
        headers: {
          Authorization: `${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: groceryTextArea }),
      });

      const output: GroceryMetadataTitleOutput = await response.json();

      if (response.ok) {
        if (output.title === '!@#$%^') {
          alert('Invalid Grocery List Input!');
          return;
        } else if (grocery === null) {
          setGrocery([output]);
        } else {
          setGrocery([output, ...grocery]);
        }
        router.push('/groceryRefinement');
      } else {
        console.log(response);
      }
    } catch (error) {
      console.error(error);
      alert(error);
    }
  };

  return (
    <ScrollView className="bg-blue-500 dark:bg-black min-h-screen">
      <View className="flex items-center mt-10 gap-10">
        <ColorModeSwitch />
        <View className="gap-5 items-center">
          <Text className="text-white text-5xl font-bold text-center">Create Grocery List</Text>
          <View className='items-center'>
            <Text className="text-blue-200 text-sm">Unsure of what groceries?</Text>
            <Text className="text-blue-200 text-sm">Describe it and we will do the work!</Text>
          </View>
       </View>

        <View className="gap-4 bg-[#EEEEEE] dark:bg-gray-800 rounded-xl min-h-[100%] px-4 py-6 w-full left-0 right-0">
          <View className="bg-white dark:bg-gray-700 rounded-xl px-3 pt-2 pb-3">
            <Textarea className="border-0 h-40 justify-start">
              <TextareaInput
                className="text-left font-roboto text-black dark:text-white pt-0"
                placeholder="Enter groceries or description"
                placeholderTextColor="white"
                value={groceryTextArea}
                onChangeText={setGroceryTextArea}
              />
            </Textarea>
          </View>

          <View className="bg-white dark:bg-gray-700 rounded-xl px-3 pt-2 pb-3">
            <DropdownSelector
              title="Select Grocery Shops"
              items={['FairPrice', 'ShengShiong']}
              selectedItems={selectedGroceryShop}
              onSelectionChange={setSelectedGroceryShop}
            />
          </View>
          <ButtonGroup className="rounded-xl overflow-hidden w-full">
            <Button
              className="
                w-full h-12 justify-center items-center
                bg-blue-700 dark:bg-gray-600
                active:bg-blue-500 dark:active:bg-gray-300
              "
              onPress={postData}
            >
              <ButtonText pointerEvents='none' className="text-white dark:text-black active:text-white dark:active:text-black">
                Generate Grocery List!
              </ButtonText>
            </Button>
          </ButtonGroup>
        </View>
      </View>
    </ScrollView>
  );
};

export default groceryInput;
