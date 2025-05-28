import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { Button, ButtonGroup, ButtonIcon } from './ui/button';
import { Card } from './ui/card';
import { Heading } from './ui/heading';
import { ChevronDownIcon } from './ui/icon';
import { Text } from './ui/text';

const DropdownCard = ({
  outsideText,
  insideText,
}: {
  outsideText: string;
  insideText: string[];
}) => {
  const [expanded, setExpanded] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  // few styling problems to debug.
  // 1. Unable to force the words for meta data to wrap if it exceeds a certain word count
  // 2. Unable to make the chevron and the title to be seperated

  useEffect(() => {
    Animated.timing(animation, {
      toValue: expanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [expanded]);

  const heightInterpolation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100], // Adjust 100 to max height of content
  });

  const opacityInterpolation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const metadataInterpolation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <Card variant="outline" className="rounded-xl p-3">
      <View className="flex flex-row items-center">
        <Heading size="md" className="mb-1">
          Grocery List Title
        </Heading>
        <ButtonGroup>
          <Button onPress={() => setExpanded(!expanded)}>
            <ButtonIcon
              as={ChevronDownIcon}
              className={`transition-transform duration-300
                        ease-in-out ${expanded ? 'rotate-180' : 'rotate-0'}`}
            />
          </Button>
        </ButtonGroup>
      </View>
      <View>
        <Animated.View style={{ opacity: metadataInterpolation }}>
          <Text size="xs" numberOfLines={1} isTruncated={true} className="">
            {outsideText}
          </Text>
        </Animated.View>

        <Animated.View
          style={{
            height: heightInterpolation,
            opacity: opacityInterpolation,
            overflow: 'hidden',
          }}
        >
          <View className="mt-2">
            {insideText.map((item, index) => {
              return (
                <Text key={index} size="xs">
                  {item}
                </Text>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Card>
  );
};

export default DropdownCard;
