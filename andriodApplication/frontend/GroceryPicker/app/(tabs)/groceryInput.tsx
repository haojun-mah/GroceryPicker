import { Button, ButtonGroup, ButtonText } from '@/components/ui/button';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { backend_url } from '../../config/api';
import { useGroceryContext } from '@/context/groceryContext';

const groceryInput = () => {
  const [groceryTextArea, setGroceryTextArea] = useState<string>("");
  const { setGrocery, setIsLoading, setError } = useGroceryContext();


  const postData = async () => {
    try {
      if (groceryTextArea.length === 0) {
        return;
      }
      setIsLoading(true);
      setError(null);
      setGrocery(null); // clears previous grocery context. to change in the future. this is just to experiment with context
      const response = await fetch(`http://localhost:3000/grocery/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: groceryTextArea }),
      });

      const output = await response.json();
      if (response.ok) {
        console.log(output); // build back end, test data generation works. When response.ok, trigger output page and display list
        setGrocery(output)
      } else {
        alert('Error with receiving response');
        setError(output);
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
