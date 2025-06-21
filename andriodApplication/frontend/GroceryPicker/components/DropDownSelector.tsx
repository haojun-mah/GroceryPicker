import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import Entypo from '@expo/vector-icons/Entypo';
import { useColorScheme } from 'nativewind';
import clsx from 'clsx';

interface DropdownSelectorProps {
  title: string;
  items: string[];
  selectedItems: string[];
  onSelectionChange: (selected: string[]) => void;
}

export const DropdownSelector = ({
  title,
  items,
  selectedItems,
  onSelectionChange,
}: DropdownSelectorProps) => {
  const [open, setOpen] = useState(false);
  const height = useSharedValue(0);
  const rotation = useSharedValue(0); // 0 for closed, 1 for open
  const { colorScheme } = useColorScheme();
  const animatedHeightStyle = useAnimatedStyle(() => ({
    height: withTiming(height.value, { duration: 300 }),
    overflow: 'hidden',
  }));

  const animatedChevronStyle = useAnimatedStyle(() => {
    const rotateDeg = interpolate(rotation.value, [0, 1], [0, 180]);
    return {
      transform: [{ rotate: `${rotateDeg}deg` }],
    };
  });

  const toggleOpen = () => {
    const isOpening = !open;
    setOpen(isOpening);
    height.value = isOpening ? items.length * 40 + 12 : 0;
    rotation.value = withTiming(isOpening ? 1 : 0, { duration: 300 });
  };

  const toggleSelection = (item: string) => {
    if (selectedItems.includes(item)) {
      onSelectionChange(selectedItems.filter((i) => i !== item));
    } else {
      onSelectionChange([...selectedItems, item]);
    }
  };

  return (
    <View className="w-full rounded-xl p-4 bg-white shadow-black dark:bg-gray-700">
      <TouchableOpacity
        className="flex-row justify-between items-center"
        onPress={toggleOpen}
      >
      <Text className="text-md font-semibold text-center font-roboto text-gray-800 dark:text-white">
        {title}
      </Text>
        <Animated.View style={animatedChevronStyle}>
          <Entypo name="chevron-down" size={24} color={colorScheme === 'light' ? "black" : "white"} />
        </Animated.View>
      </TouchableOpacity>
      <Animated.View style={animatedHeightStyle} className="mt-2">
        {items.map((item) => {
          const isSelected = selectedItems.includes(item);
          return (
            <TouchableOpacity
              key={item}
              onPress={() => toggleSelection(item)}
              className={clsx(
                'p-2 rounded-md my-1',
                isSelected ? 'bg-blue-500' : 'bg-gray-100 dark:bg-gray-500'
              )}
            >
              <Text
                className={clsx(
                  'text-sm',
                  isSelected ? 'text-white' : 'text-gray-800 dark:text-white'
                )}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </View>
  );
};
