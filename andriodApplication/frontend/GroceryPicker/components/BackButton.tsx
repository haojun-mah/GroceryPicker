import React from 'react';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import { Pressable } from 'react-native';
import { Image } from './ui/image';

export default function BackButton({ goBack }: { goBack: () => void }) {
  return (
    <Pressable
      onPress={goBack}
      className={`absolute left-4 top-[${getStatusBarHeight() + 10}px] z-50`}
      style={{ top: 10 + getStatusBarHeight() }}
    >
      <Image
        source={require('../assets/images/arrow_back.png')}
        alt="Back"
        className="w-6 h-6"
      />
    </Pressable>
  );
}
