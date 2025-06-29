import { Button, ButtonGroup, ButtonText } from '@/components/ui/button';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { Text } from '@/components/ui/text';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { backend_url } from '../../lib/api';
import { useSession } from '@/context/authContext';
import { router } from 'expo-router';
import { DropdownSelector } from '@/components/DropDownSelector';
import { Alert, AlertIcon, AlertText } from '@/components/ui/alert';
import {
  AiPromptRequestBody,
  GroceryMetadataTitleOutput,
  ALLOWED_SUPERMARKETS,
  SUPERMARKET,
} from './interface';
import { InfoIcon } from '@/components/ui/icon';
import { useGroceryContext } from '@/context/groceryContext';

/*
  Initial grocery input page where user can key in unstructred grocrey list to receive structured grocery list.
  Postdata does a POST to backend. Req: AiPromptRequestBody, Req: GroceryMetadataTitleOutput
*/

// postData req type
const groceryInput = () => {
  const [groceryTextArea, setGroceryTextArea] = useState<string>('');
  const [selectedGroceryShop, setSelectedGroceryShop] = useState<string[]>(["FairPrice"]);
  const [selectGroceryShopAlert, setSelectGroceryShopAlert] =
    useState<boolean>(false);
  const { session } = useSession();
  const {
    setIsLoading,
    groceryRefinement,
    setGroceryRefinement,
    setGroceryShop,
  } = useGroceryContext()

  const postData = async () => {
    try {
      if (groceryTextArea.length === 0) return;

      if (selectedGroceryShop.length === 0) {
        setSelectGroceryShopAlert(true);
        return;
      }

      setIsLoading(true);
      const req: AiPromptRequestBody = {
        message: groceryTextArea,
        supermarketFilter: ALLOWED_SUPERMARKETS.filter(
          (x) => !selectedGroceryShop.includes(x),
        ),
      };
      console.log(req); // debug
      const response = await fetch(`${backend_url}/lists/generate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req),
      });

      const output: GroceryMetadataTitleOutput = await response.json();

      if (response.ok && output.title !== '!@#$%^') {
        console.log(
          'Check receive first grocery list from generateGroceryList: \n',
          output,
        );
        setGroceryRefinement(output);
        setGroceryShop(selectedGroceryShop);
        console.log(
          'Check grocery input data is set in groceryRefinement var: \n',
          groceryRefinement,
        );
        router.push('/groceryRefinement');
        setIsLoading(false);
      } else if (response.status === 403) {
        alert(
          'You are not authorized to perform this action. Please log in again.',
        );
        setIsLoading(false);
      } else {
        alert('Your Grocery List Contains Invalid Items!');
        setIsLoading(false);
      }
    } catch (error) {
      console.error(error);
      alert(error);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ paddingTop: 52 }}
      className="bg-blue-700 dark:bg-black min-h-screen"
    >
      <View className="flex items-center mt-10 gap-10">
        <View className="gap-5 items-center">
          <Text className="font-roboto text-white text-5xl font-bold text-center">
            Create Grocery List
          </Text>
          <View className="items-center">
            <Text className="text-blue-200 text-sm">
              Unsure of what groceries?
            </Text>
            <Text className="text-blue-200 text-sm">
              Describe it and we will do the work!
            </Text>
          </View>
        </View>

        <View className="gap-4 bg-[#EEEEEE] dark:bg-gray-800 rounded-xl min-h-[100%] px-4 py-6 w-full left-0 right-0">
          <View className="bg-white dark:bg-gray-700 rounded-xl px-3 pt-2 pb-3">
            <Textarea className="border-0 h-40 justify-start">
              <TextareaInput
                className="text-left font-roboto text-black dark:text-white pt-0"
                placeholder="Enter groceries or description"
                placeholderTextColor="white"
                value={groceryTextArea}
                onChangeText={setGroceryTextArea}
                textAlignVertical="top"
              />
            </Textarea>
          </View>

          <View className="bg-white dark:bg-gray-700 rounded-xl px-3 pt-2 pb-3">
            <DropdownSelector
              title="Select Grocery Shops"
              items={SUPERMARKET}
              selectedItems={selectedGroceryShop}
              onSelectionChange={setSelectedGroceryShop}
            />
          </View>

          {selectGroceryShopAlert ? (
            <Alert action="error" variant="solid">
              <AlertIcon as={InfoIcon} />
              <AlertText>Please select a grocery shop</AlertText>
            </Alert>
          ) : null}

          <ButtonGroup className="rounded-xl overflow-hidden w-full">
            <Button
              className="
                w-full h-12 justify-center items-center
                bg-blue-700 dark:bg-gray-600
                active:bg-blue-500 dark:active:bg-gray-300
              "
              onPress={postData}
            >
              <ButtonText
                pointerEvents="none"
                className="text-white dark:text-white active:text-white dark:active:text-black"
              >
                Generate Grocery List!
              </ButtonText>
            </Button>
          </ButtonGroup>
        </View>
      </View>
    </ScrollView>
  );
};

export default groceryInput;
