import { Button, ButtonGroup, ButtonText } from '@/components/ui/button';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { Text } from '@/components/ui/text';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { backend_url } from '../../config/api';
import { useGroceryContext } from '@/context/groceryContext';
import {
  GroceryMetadataTitleOutput,
  ErrorResponse,
} from '@/context/groceryContext';
import { useSession } from '@/context/authContext';
import { router } from 'expo-router';
import { ColorModeSwitch } from '@/components/ColorModeSwitch';
import { DropdownSelector } from '@/components/DropDownSelector';

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
        router.push('/groceryHistory?openLatest=true');
      } else {
        console.log(response);
      }
    } catch (error) {
      console.error(error);
      alert(error);
    }
  };

  return (
    <ScrollView className="bg-blue-500 min-h-screen">
      <View className="flex items-center mt-10 gap-10 px-4">
        <ColorModeSwitch />
        <View className="gap-1 items-center">
          <Text className="text-black text-4xl font-bold">Create Grocery List</Text>
          <Text className="text-gray-800 text-sm">Unsure of what groceries?</Text>
          <Text className="text-gray-800 text-sm">Describe it and we will do the work!</Text>
        </View>

        <View className="gap-4 bg-[#EEEEEE] rounded-xl px-4 py-6 w-full min-h-[100%] left-0 right-0">
          <View className="bg-white rounded-xl p-2">
            <Textarea className="border-0">
              <TextareaInput
                className='text-left text-top'
                placeholder="Enter groceries or description"
                value={groceryTextArea}
                onChangeText={setGroceryTextArea}
              />
            </Textarea>
          </View>

          <View className="bg-white rounded-xl p-2">
            <DropdownSelector
              title="Select Grocery Shops"
              items={['FairPrice', 'ShengShiong']}
              selectedItems={selectedGroceryShop}
              onSelectionChange={setSelectedGroceryShop}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default groceryInput;
