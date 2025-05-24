import React from 'react';
import { View } from 'react-native';

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
    <View className="flex pt-24 pl-4 pr-4">
    </View>
  );
};

export default groceryInput;
