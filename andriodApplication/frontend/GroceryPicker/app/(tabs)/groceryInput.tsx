import React, { useState } from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Input, InputField } from '@/components/ui/input';
import { ScrollView } from 'react-native';
import { Heading } from '@/components/ui/heading';
import { useSession } from '@/context/authContext';
import { useGroceryContext } from '@/context/groceryContext';
import { router } from 'expo-router';
import { backend_url } from '@/lib/api';
import {
  AiPromptRequestBody,
  GroceryMetadataTitleOutput,
} from '@/app/(tabs)/interface';
import AntDesign from '@expo/vector-icons/AntDesign';
import { DropdownSelector } from '@/components/DropDownSelector';
import { SUPERMARKET, ALLOWED_SUPERMARKETS } from '@/app/(tabs)/interface';
import { useColorScheme } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';

// Main Grocery Input Component
const GroceryInputPage = () => {
  const [groceryTextArea, setGroceryTextArea] = useState('');
  const [selectedGroceryShop, setSelectedGroceryShop] = useState(['FairPrice']);
  const [selectGroceryShopAlert, setSelectGroceryShopAlert] = useState(false);

  const { session } = useSession();
  const { setIsLoading, setGroceryRefinement, setGroceryShop, isLoading } =
    useGroceryContext();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const postData = async () => {
    try {
      if (groceryTextArea.length === 0) {
        Alert.alert('Error', 'Please enter some grocery items.');
        return;
      }

      if (selectedGroceryShop.length === 0) {
        setSelectGroceryShopAlert(true);
        Alert.alert('Error', 'Please select at least one grocery shop.');
        return;
      }

      setIsLoading(true);
      const req: AiPromptRequestBody = {
        message: groceryTextArea,
        supermarketFilter: {
          exclude: ALLOWED_SUPERMARKETS.filter(
            (x) => !selectedGroceryShop.includes(x),
          ),
        },
      };

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
        setGroceryRefinement(output);
        setGroceryShop(selectedGroceryShop);
        setIsLoading(false);
        router.push('/groceryRefinement');
      } else if (response.status === 403) {
        Alert.alert(
          'Error',
          'You are not authorized to perform this action. Please log in again.',
        );
        setIsLoading(false);
      } else {
        Alert.alert('Error', 'Your Grocery List Contains Invalid Items!');
        setIsLoading(false);
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Error',
        'An error occurred while generating your grocery list.',
      );
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={
        isDark
          ? ['#1f2937', '#374151', '#4b5563']
          : ['#667eea', '#764ba2', '#f093fb']
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center', // Center vertically
          alignItems: 'center', // Center horizontally
          paddingHorizontal: 24,
          paddingVertical: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Centered Content Container */}
        <VStack
          className="w-full max-w-md"
          space="lg"
          style={{
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Header Section */}
          <VStack space="md" className="items-center mb-8">
            <Heading className="text-4xl font-bold text-center text-black dark:text-white">
              Create Grocery List
            </Heading>
            <VStack space="xs" className="items-center">
              <Text className="text-sm text-black/70 dark:text-white/80 text-center">
                Unsure of what groceries?
              </Text>
              <Text className="text-sm text-black/70 dark:text-white/80 text-center">
                Describe it and we will do the work!
              </Text>
            </VStack>
          </VStack>

          {/* Input Form Section */}
          <VStack className="w-full" space="xl">
            {/* Grocery Text Area */}
            <VStack space="sm" className="w-full">
              <Text className="text-lg font-medium text-black dark:text-white text-left">
                What groceries do you need?
              </Text>
              <Input className="min-h-32 bg-white/90 dark:bg-gray-700/90 rounded-xl shadow-sm backdrop-blur-md border border-gray-200 dark:border-gray-600">
                <InputField
                  placeholder="Enter groceries or description..."
                  value={groceryTextArea}
                  onChangeText={setGroceryTextArea}
                  multiline
                  textAlignVertical="top"
                  className="text-black dark:text-white p-4"
                  placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                />
              </Input>
            </VStack>

            {/* Grocery Shops Selector */}
            <VStack space="sm" className="w-full">
              <Text className="text-lg font-medium text-black dark:text-white text-left">
                Select Grocery Shops
              </Text>
              <DropdownSelector
                title="Select Grocery Shops"
                items={SUPERMARKET}
                selectedItems={selectedGroceryShop}
                onSelectionChange={setSelectedGroceryShop}
              />
            </VStack>

            {/* Alert Message */}
            {selectGroceryShopAlert && (
              <Box className="p-4 bg-red-50 dark:bg-red-900/90 border border-red-200 dark:border-red-700 shadow-sm backdrop-blur-md rounded-xl w-full">
                <HStack className="items-center justify-center" space="sm">
                  <AntDesign
                    name="exclamationcircle"
                    size={20}
                    color="#ef4444"
                  />
                  <Text className="text-red-600 dark:text-red-400 font-medium">
                    Please select a grocery shop
                  </Text>
                </HStack>
              </Box>
            )}

            {/* Generate Button */}
            <TouchableOpacity
              onPress={postData}
              disabled={isLoading}
              activeOpacity={0.8}
              style={{
                opacity: isLoading ? 0.5 : 1,
                width: '100%',
              }}
            >
              <LinearGradient
                colors={
                  isDark
                    ? ['#4f46e5', '#7c3aed', '#db2777']
                    : ['#ff6b6b', '#ffa726', '#ffcc02']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  height: 56,
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }}
              >
                <HStack className="items-center" space="sm">
                  {isLoading ? (
                    <Text className="text-white font-bold text-lg">
                      Generating...
                    </Text>
                  ) : (
                    <>
                      <AntDesign name="plus" size={20} color="white" />
                      <Text className="text-white font-bold text-lg">
                        Generate Grocery List!
                      </Text>
                    </>
                  )}
                </HStack>
              </LinearGradient>
            </TouchableOpacity>
          </VStack>
        </VStack>
      </ScrollView>
    </LinearGradient>
  );
};

export default GroceryInputPage;
