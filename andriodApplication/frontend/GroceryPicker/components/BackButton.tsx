import React from 'react';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import { Pressable } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useColorScheme } from 'nativewind';

export default function BackButton({ goBack }: { goBack: () => void }) {
  const { colorScheme } = useColorScheme();
  return (
    <Pressable
      onPress={goBack}
      className="absolute left-4 z-50"
      style={{ top: 10 + getStatusBarHeight() }}
    >
      <AntDesign name="arrowleft" size={24} color={colorScheme === 'dark' ? 'white' : 'black'} />
    </Pressable>
  );
}
