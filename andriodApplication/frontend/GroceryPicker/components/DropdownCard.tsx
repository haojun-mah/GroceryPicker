import { useEffect, useRef, useState } from 'react';
import { Animated, View, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Button, ButtonGroup, ButtonIcon } from './ui/button';
import { Card } from './ui/card';
import { Heading } from './ui/heading';
import { ChevronDownIcon } from './ui/icon';
import { Text } from './ui/text';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DropdownCard = ({
  outsideText,
  insideText,
  title,
}: {
  outsideText: string;
  insideText: string[];
  title: string
}) => {
  const [expanded, setExpanded] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
    <Card className="w-full max-w-[95%] self-center rounded-xl p-4" variant="outline">
      <View className="flex-row items-center justify-between mb-2">
        <Heading size="md">{title}</Heading>
        <ButtonGroup>
          <Button onPress={() => setExpanded(!expanded)} variant="link">
            <ButtonIcon
              as={ChevronDownIcon}
              className={`transition-transform duration-300 ease-in-out ${expanded ? 'rotate-180' : 'rotate-0'}`}
            />
          </Button>
        </ButtonGroup>
      </View>

      {!expanded && (
        <Text size="xs" className="text-gray-500">
          {outsideText}
        </Text>
      )}

      <Animated.View
        style={{
          height: heightInterpolation,
          opacity: opacityInterpolation,
          overflow: 'hidden',
        }}
      >
        <View className="mt-2 space-y-1">
          {insideText.map((item, index) => (
            <Text key={index} size="xs" className="text-gray-700">
              {item}
            </Text>
          ))}
        </View>
      </Animated.View>
    </Card>
  );
};


export default DropdownCard;
