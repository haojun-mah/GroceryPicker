import { Button, ButtonGroup, ButtonText } from '@/components/ui/button';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import React from 'react';
import { Text, View } from 'react-native';

const groceryInput = () => {
  const [data, setData] = React.useState('');

  const postData = async () => {
    try {
      const response = await fetch('', {
        // insert API link
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': '', // understand what this api key thing is for
        },
        body: JSON.stringify({ postMessage: data }),
      });

      const output = await response.json();
      if (response.ok) {
        console.log(data); // build back end, test data generation works. When response.ok, trigger output page and display list
      } else {
        alert('Error with receiving response');
      }
    } catch (error) {
      console.error(error);
      alert(
        'Error with grocery list generation request. failed to connect to api. Have not even send yet',
      );
    }
  };

  return (
    <View className="flex items-center mt-10 gap-2">
      <Text className='font-bold font-roboto text-2xl'>Create Grocery List!</Text>
      <Textarea size='md' className='w-72'>
        <TextareaInput placeholder='Insert your Groceries!'/>
      </Textarea>
      <ButtonGroup >
        <Button className='bg-amber-50 hover:bg-black w-72' size='xl' variant='outline' action='primary'>
          <ButtonText>Generate List!</ButtonText>
        </Button>
      </ButtonGroup>
    </View>
  );
};

export default groceryInput;
