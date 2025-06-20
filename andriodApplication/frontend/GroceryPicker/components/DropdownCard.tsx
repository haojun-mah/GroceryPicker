import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  View,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Button, ButtonGroup, ButtonIcon } from './ui/button';
import { Card } from './ui/card';
import Entypo from '@expo/vector-icons/Entypo';
import { Text } from './ui/text';
import { useColorScheme } from 'nativewind';
import { Image } from './ui/image';
import { CheckboxIcon, CheckboxIndicator, CheckboxGroup, Checkbox } from './ui/checkbox';
import { CircleIcon } from './ui/icon';
import { Pressable } from 'react-native';


// Enable LayoutAnimation for Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface InsideGrocery {
  name: string,
  quantity: string,
  price: string,
  image: string,
  purchased: boolean,
}

const DropdownCard = ({
  outsideText,
  insideText,
  defaultOpen,
}: {
  outsideText: string[];
  insideText: InsideGrocery[];
  defaultOpen: boolean;
}) => {
  const [expanded, setExpanded] = useState(defaultOpen);
  const [purchased, setPurchased] = useState<boolean[]>([])
  const animation = useRef(new Animated.Value(0)).current;
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    setPurchased(insideText.map(item => item.purchased));

    // Optional: smooth layout changes for height
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    Animated.timing(animation, {
      toValue: expanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [expanded]);

  const heightInterpolation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 150], // Adjust this max height estimate based on your content
  });

  const opacityInterpolation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

return (
    <Card className="bg-white dark:bg-gray-700 w-full max-w-[95%] self-center rounded-xl p-4">
    <View className="flex-row items-center justify-between">
      <View className="flex-1">
        {!expanded && outsideText.map((e, i) => (
          <Text key={i} size="xs" className="text-gray-500">
            {e}
          </Text>
        ))}
        {expanded && (
          <Text className="text-base font-semibold text-black dark:text-white">
            Detailed Groceries
          </Text>
        )}
      </View>
      <ButtonGroup>
        <Button onPress={() => setExpanded(!expanded)} variant="link">
          <Entypo
            name="chevron-down"
            size={24}
            color={colorScheme === 'light' ? 'black' : 'white'}
            className={`transition-transform duration-300 ease-in-out ${expanded ? 'rotate-180' : 'rotate-0'}`}
          />
        </Button>
      </ButtonGroup>
    </View>

    <Animated.View
      style={{
        height: heightInterpolation,
        opacity: opacityInterpolation,
        overflow: 'hidden',
      }}
    >
      <View className="mt-2 space-y-2">
        {insideText.map((item, idx) => (
          <Pressable
      key={idx}
      onPress={() => {
        const updated = [...purchased];
        updated[idx] = !updated[idx];
        setPurchased(updated);
      }}
      className="flex-row items-center gap-3"
    >
            <Image source={{ uri: item.image }} alt='Image of grocer' className="w-10 h-10 rounded-md bg-gray-300" />
            <View className="flex-1">
              <Text
          className={`text-black dark:text-white font-semibold ${
            purchased[idx] ? 'line-through text-gray-400 dark:text-gray-500' : ''
          }`}
        >{item.name}</Text>
              <Text className="text-gray-600 dark:text-gray-300 text-sm">
                {item.quantity}
              </Text>
              <Text className="text-gray-600 dark:text-gray-300 text-sm">
                {item.price}
              </Text>
            </View>
      <Checkbox
        value={`item-${idx}`}
        isChecked={purchased[idx]}
        onChange={() => {
          const updated = [...purchased];
          updated[idx] = !updated[idx];
          setPurchased(updated);
        }}
        className="rounded-full border border-gray-400 w-6 h-6 justify-center items-center"
      >
        <CheckboxIndicator className="w-full h-full rounded-full">
          {purchased[idx] && (
            <CheckboxIcon as={CircleIcon} className="border-none w-4 h-4 fill-black" />
          )}
        </CheckboxIndicator>
      </Checkbox>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  </Card>

);
}


export default DropdownCard;
