import { Button, ButtonGroup, ButtonText } from '@/components/ui/button';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { backend_url } from '../../config/api';
import { useGroceryContext } from '@/context/groceryContext';
import { GroceryMetadataTitleOutput, ErrorResponse } from '@/context/groceryContext';

const groceryInput = () => {
  const [groceryTextArea, setGroceryTextArea] = useState<string>("");
  const { grocery, setGrocery, setIsLoading, setError } = useGroceryContext();


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
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: groceryTextArea }),
      });

      const output : GroceryMetadataTitleOutput = await response.json();
      if (response.ok) { // nested if-else ugly but intuitive when reading. consider refactoring if necessary
        if (output.title = '!@#$%^') {
          alert('Invalid Grocery List Input!'); // very very weird and deterministic way to check for invalid grocery input
        }
        else if (grocery === null) {
          setGrocery([ output ]);
        } else {
          setGrocery([ output, ...grocery]);
        }
      } else {
        alert('Invalid Grocery List Input!');
      }
    } catch (error) {
      console.error(error);
      alert(error);
    }
  };

  return (
    <View className="flex items-center mt-10 gap-2">
      <Text className="font-bold font-roboto text-2xl">
        Create Grocery List!
      </Text>
      <Textarea size="md" className="w-72">
        <TextareaInput value={groceryTextArea} onChangeText={(value) => setGroceryTextArea(value)} placeholder="Insert your Groceries!" />
      </Textarea>
      <ButtonGroup>
        <Button
          className="bg-amber-50 hover:bg-black w-72"
          size="xl"
          variant="outline"
          action="primary"
          onPress={() => postData()}
        >
          <ButtonText>Generate List!</ButtonText>
        </Button>
      </ButtonGroup>
    </View>
  );
};

export default groceryInput;
