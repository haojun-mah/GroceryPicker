import React from 'react';
import { View } from 'react-native';
import { useTheme } from './ThemeProvider';
import { Moon, Sun } from 'lucide-react-native';
import { Button, ButtonGroup, ButtonIcon } from './ui/button';

export const ColorModeSwitch = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <View className="flex-row items-center gap-2 p-4">
      <ButtonGroup>
        {theme === 'light' ? 
        (<Button className='bg-black w-10 h-10' onPress={toggleTheme}>
          <Moon color="#FFFFFF"/>
        </Button>) :
        (<Button className='bg-white w-10 h-10' onPress={toggleTheme}>
          <Sun color="#000000"/>
        </Button>)
}
      </ButtonGroup>
    </View>
  );
};
