import React from 'react';
import { View } from 'react-native';
import { Button, ButtonGroup } from './ui/button';
import { useColorScheme } from 'nativewind';
import Feather from '@expo/vector-icons/Feather';
export const ColorModeSwitch = () => {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  return (
    <View className="flex-row items-center gap-2 p-4">
      <ButtonGroup>
        {colorScheme === 'light' ? 
        (<Button className='bg-black w-10 h-10' onPress={toggleColorScheme}>
          <Feather name="moon" size={24} color="white" />
        </Button>) :
        (<Button className='bg-white w-10 h-10' onPress={toggleColorScheme}>
          <Feather name="sun" size={24} color="black" />
        </Button>)
}
      </ButtonGroup>
    </View>
  );
};
