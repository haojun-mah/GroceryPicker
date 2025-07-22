import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useColorScheme } from 'nativewind';
import Feather from '@expo/vector-icons/Feather';

export const ColorModeSwitch = () => {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="p-2">
      <TouchableOpacity
        onPress={toggleColorScheme}
        className={`w-10 h-10 rounded-full items-center justify-center ${
          isDark ? 'bg-white' : 'bg-black'
        }`}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
        }}
      >
        <Feather
          name={isDark ? 'sun' : 'moon'}
          size={16}
          color={isDark ? 'black' : 'white'}
        />
      </TouchableOpacity>
    </View>
  );
};
