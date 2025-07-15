import React from 'react';
import { View, Text, Platform } from 'react-native';
import { Button, ButtonGroup } from './ui/button';
import { useColorScheme } from 'nativewind';

// Use a more robust import for APK builds
const Feather = require('@expo/vector-icons/Feather').default;

export const ColorModeSwitch = () => {
  const { colorScheme, toggleColorScheme } = useColorScheme();

  return (
    <View className="flex-row items-center gap-2 p-4">
      <ButtonGroup>
        {colorScheme === 'light' ? (
          <Button className="bg-black w-10 h-10" onPress={toggleColorScheme}>
            <View
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1,
              }}
            >
              <Feather name="moon" size={16} color="white" />
            </View>
          </Button>
        ) : (
          <Button className="bg-white w-10 h-10" onPress={toggleColorScheme}>
            <View
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1,
              }}
            >
              <Feather name="sun" size={16} color="black" />
            </View>
          </Button>
        )}
      </ButtonGroup>
    </View>
  );
};
