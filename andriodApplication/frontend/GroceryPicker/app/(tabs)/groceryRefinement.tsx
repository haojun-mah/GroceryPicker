import React, { useEffect, useState } from 'react';
import { Dimensions, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { ButtonGroup, Button, ButtonText } from '@/components/ui/button';
import { useGroceryRefinementContext } from '@/context/groceryRefinement';
import { GroceryItem, GroceryMetadataTitleOutput } from '@/context/groceryContext';
import { useSession } from '@/context/authContext';

const { height: screenHeight } = Dimensions.get('window');

const ModalPage = () => {
  const modalHeight = useSharedValue(screenHeight * 0.55555); // screenheight * x, where x is the percentage the screen starts from
  const [generateGrocery, setGeneratedGrocery] = useState<string>("");
  const { groceryRefinement, setGroceryRefinement } = useGroceryRefinementContext();
  const groceryList : GroceryItem[] | undefined = groceryRefinement?.items;
  const { session } = useSession();

  useEffect(() => {
    modalHeight.value = withTiming(screenHeight * 0.9, { duration: 500 }); // screenheight * x, where x is the percentage the screen expands to
  }, []);

  // runs through grocerylist array, converting all groceries into a single string
  // useEffect needed to prevent it from perma running

  useEffect(() => {
    if (groceryList !== undefined) {
      let groceryListString : string = ""
      for (let i = 0; i < groceryList.length; i++) {
        groceryListString += groceryList[i].name + ' - ' + groceryList[i].quantity + groceryList[i].unit + '\n';
      }
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: modalHeight.value,
    };
  });

  // sends user edited grocerylist as a string type into backend for regeneration. backend to support refinement
  const refineMyList = async () => {
    try {
      if (generateGrocery.length === 0) return;

      const response = await fetch('api', {
        method: 'POST',
        headers: {
          Authorization: `${session?.access_token}`,
          'Context-Type': 'application/json',
        },
        body: JSON.stringify({ message: generateGrocery}),
      })

      const output : GroceryMetadataTitleOutput = await response.json() // define output types

      if (response.ok) {
        const groceryList : GroceryItem[] = output.items;
        let groceryListString : string = ""
        for (let i = 0; i < groceryList.length; i++) {
          groceryListString += groceryListString + groceryList[i].name + ' - ' + groceryList[i].quantity + groceryList[i].unit + '\n';
        }
        setGeneratedGrocery(groceryListString);
        // test if rerendering is necessary after it has been set
      }
    } catch (error) {
      // may need a better User Error handling
      console.log(error);
      alert(error);
    }
  }

  // sends grocery list to back end to run optimisation
  const findCheapest = async () => {
    try {
      if (generateGrocery.length === 0) return;

      const response = await fetch('api', {
        method: 'POST',
        headers: {
          Authorization: `${session?.access_token}`,
          'Context-Type': 'application/json',
        },
        body: JSON.stringify({ message: groceryRefinement}),
      })

      const output : GroceryMetadataTitleOutput = await response.json() // define output types

      


    } catch (error) {
      // may need a better User Error handling
      console.log(error);
      alert(error);
    }
  }


  return (
    <View className="flex-1 bg-blue-700 dark:bg-black justify-end">
      <Animated.View
        style={animatedStyle}
        className="w-full bg-[#EEEEEE] dark:bg-gray-800 rounded-t-2xl p-6 gap-10"
      >
        <View className="gap-4">
          <Text className="text-4xl font-bold text-black dark:text-white">
            Refine Your List
          </Text>

          <View>
            <Text className="text-md text-gray-700 dark:text-gray-300">
              Don’t like your list?
            </Text>
            <Text className="text-md text-gray-700 dark:text-gray-300">
              Edit it and we’ll do the work!
            </Text>
          </View>
        </View>
        <View className="w-full">
          <Textarea className="w-full h-40 rounded-xl text-black dark:text-white bg-white dark:bg-gray-700 border-0 focus:border-0 focus:outline-none">
            <TextareaInput
              className="text-black"
              multiline
              value={generateGrocery}
              onChangeText={(e : string) => setGeneratedGrocery(e)}
            />
          </Textarea>
        </View>

        <ButtonGroup className="w-full gap-4 flex-row justify-center">
          <Button className="bg-blue-700 rounded-md dark:bg-gray-600
                active:bg-blue-500 dark:active:bg-gray-300
              " style={{width: '49%'}}>
            <ButtonText className="text-white">Refine My List</ButtonText>
          </Button>

          <Button className="bg-blue-700 rounded-md dark:bg-gray-600
                active:bg-blue-500 dark:active:bg-gray-300
              " style={{width: '49%'}}>
                    <ButtonText className="text-white text-center" >Find Cheapest</ButtonText>
          </Button>
        </ButtonGroup>
      </Animated.View>
    </View>
  );
};

export default ModalPage;
