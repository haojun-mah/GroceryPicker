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
import {
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectItem,
} from "@/components/ui/select"
import { ChevronDownIcon } from "@/components/ui/icon"
import { DropdownSelector } from '@/components/DropDownSelector';

const groceryInput = () => {
  const [groceryTextArea, setGroceryTextArea] = useState<string>('');
  const { grocery, setGrocery, setIsLoading, setError } = useGroceryContext();
  const [selectedGroceryShop, setSelectedGroceryShop] = useState<string[]>([]);
  const { session } = useSession(); // obtain jwt from session context

  // submitting logic
  const postData = async () => {
    try {
      if (groceryTextArea.length === 0) {
        return;
      }
      setIsLoading(true);
      setError(null);
      const response = await fetch(`${backend_url}/grocery/generate`, {
        method: 'POST',
        headers: {
          Authorization: `${session?.access_token}`, // send jwt token to backend
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: groceryTextArea }),
      });

      const output: GroceryMetadataTitleOutput = await response.json();

      // refactoring is necessary here
      if (response.ok) {
        // nested if-else ugly but intuitive when reading. consider refactoring if necessary
        if (output.title === '!@#$%^') {
          alert('Invalid Grocery List Input!'); // very very weird and deterministic way to check for invalid grocery input
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
    <ScrollView className='bg-white dark:bg-black'>
      <View className="flex items-center mt-10 gap-10">
        <ColorModeSwitch/>
        <View>
          <Text>Create Grocery List</Text>
          <Text>Unsure of what groceries?</Text>
          <Text>Describe it and we will do the work!</Text>
        </View>
        <View className='gap-10'>
          <Textarea>
            <TextareaInput placeholder='Enter groceries or description'/>
          </Textarea>
          <DropdownSelector title='Select Grocery Shops' items={["FairPrice", "ShengShiong"]} selectedItems={selectedGroceryShop} onSelectionChange={setSelectedGroceryShop}/>
        </View>
     </View>
    </ScrollView>
  );
};

export default groceryInput;
