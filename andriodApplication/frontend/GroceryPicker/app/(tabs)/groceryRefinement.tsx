import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, TouchableOpacity } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { Button, ButtonText } from '@/components/ui/button';
import { ScrollView } from 'react-native';
import { Heading } from '@/components/ui/heading';
import { useGroceryContext } from '@/context/groceryContext';
import {
  GroceryItem,
  GroceryMetadataTitleOutput,
  SavedGroceryList,
  SavedGroceryListItem,
  AiPromptRequestBody,
} from './interface';
import { useSession } from '@/context/authContext';
import { backend_url } from '../../lib/api';
import { router } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';

const { height: screenHeight } = Dimensions.get('window');

const ModalPage = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [generateRefinementGrocery, setGenerateRefinementGrocery] =
    useState<AiPromptRequestBody | undefined>(undefined);

  const {
    setIsLoading,
    groceryRefinement,
    setGroceryRefinement,
    setGroceryListHistory,
    isLoading,
  } = useGroceryContext();

  const groceryList: GroceryItem[] | undefined = groceryRefinement?.items;
  const supermarketFilter: string[] =
    groceryRefinement?.supermarketFilter?.exclude || [];

  const { session } = useSession();

  /**
   * Syncs generateRefinementGrocery state to reflect current groceryRefinement
   */
  useEffect(() => {
    if (groceryList !== undefined) {
      let groceryListString = '';
      for (let i = 0; i < groceryList.length; i++) {
        groceryListString += `${groceryList[i].name} - ${groceryList[i].quantity}${groceryList[i].unit}\n`;
      }
      setGenerateRefinementGrocery({
        message: groceryListString,
        supermarketFilter: { exclude: supermarketFilter },
      });
    } else {
      setGenerateRefinementGrocery(undefined);
    }
  }, [groceryList, supermarketFilter]);

  const refineMyList = async (): Promise<boolean> => {
    try {
      if (!generateRefinementGrocery?.message?.length) {
        Alert.alert("Error", "Your list is empty.");
        return false;
      }

      setIsLoading(true);

      const response = await fetch(`${backend_url}/lists/generate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generateRefinementGrocery),
      });

      setIsLoading(false);

      if (response.ok) {
        const output: GroceryMetadataTitleOutput = await response.json();

        if (output.title === '!@#$%^') {
          Alert.alert("Error", "Invalid refinement item.");
          return false;
        }

        setGroceryRefinement(output);

        const refinedList = output.items
          .map((i) => `${i.name} - ${i.quantity}${i.unit}`)
          .join('\n');

        setGenerateRefinementGrocery({
          message: refinedList,
          supermarketFilter: { exclude: supermarketFilter },
        });

        return true;
      } else {
        Alert.alert("Error", "Invalid refinement item.");
        return false;
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "An error occurred while refining your list.");
      setIsLoading(false);
      return false;
    }
  };

  const findCheapest = async () => {
    try {
      if (!generateRefinementGrocery?.message?.length) return;

      setIsLoading(true);

      const refineSucceeded = await refineMyList();

      if (!refineSucceeded) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${backend_url}/lists/optimise`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generateRefinementGrocery),
      });

      const optimisedList: SavedGroceryListItem = await response.json();

      const responseAllList = await fetch(`${backend_url}/lists/getAll`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const allList: SavedGroceryList[] = await responseAllList.json();

      setGroceryListHistory(allList);
      setGroceryRefinement(null);
      setIsLoading(false);

      router.push(`/groceryDisplay/${optimisedList.list_id}`);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "An error occurred while finding the cheapest list.");
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={isDark 
        ? ['#1f2937', '#374151', '#4b5563'] 
        : ['#667eea', '#764ba2', '#f093fb']
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        style={{ backgroundColor: 'transparent' }}
      >
        <VStack className="flex-1 p-6 justify-center" space="lg">
          {/* Header */}
          <VStack space="md" className="items-center">
            <Heading className="text-4xl font-bold text-center text-black dark:text-white">
              Refine Your List
            </Heading>
            <VStack space="xs" className="items-center">
              <Text className="text-sm text-black/70 dark:text-white/80 text-center">
                Don't like your list?
              </Text>
              <Text className="text-sm text-black/70 dark:text-white/80 text-center">
                Edit it and we'll do the work!
              </Text>
            </VStack>
          </VStack>

          {/* Main Content */}
          <VStack space="lg" className="w-full">
            {/* Grocery List Text Area */}
            <VStack space="sm">
              <Text className="text-lg font-medium text-black dark:text-white">
                Your Grocery List
              </Text>
              <Box className="min-h-80 bg-white/90 dark:bg-gray-700/90 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm backdrop-blur-sm">
                <Textarea className="w-full h-full rounded-xl bg-transparent border-0">
                  <TextareaInput
                    className="text-black dark:text-white p-4"
                    multiline
                    value={generateRefinementGrocery?.message || ''}
                    onChangeText={(e) =>
                      setGenerateRefinementGrocery({
                        message: e,
                        supermarketFilter: { exclude: supermarketFilter },
                      })
                    }
                    textAlignVertical="top"
                    placeholder="Your grocery list will appear here..."
                    placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                  />
                </Textarea>
              </Box>
            </VStack>

            {/* Info Box */}
            <Box className="p-4 bg-blue-100/90 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 rounded-xl backdrop-blur-sm">
              <HStack className="items-center" space="sm">
                <AntDesign name="infocirlce" size={20} color="#3b82f6" />
                <VStack className="flex-1">
                  <Text className="text-blue-800 dark:text-blue-200 font-medium text-sm">
                    Tip: Edit your list format before optimising
                  </Text>
                  <Text className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                    Use Refine My List to adjust.
                  </Text>
                </VStack>
              </HStack>
            </Box>

            {/* Action Buttons */}
            <VStack space="md" className="w-full">
              {/* Refine Button */}
              <TouchableOpacity
                onPress={refineMyList}
                disabled={isLoading}
                activeOpacity={0.8}
                style={{
                  opacity: isLoading ? 0.5 : 1,
                }}
              >
                <LinearGradient
                  colors={isDark 
                    ? ['#3b82f6', '#1d4ed8', '#1e40af'] 
                    : ['#60a5fa', '#3b82f6', '#2563eb']
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
                      <>
                        <Text className="text-white font-bold text-lg">
                          Processing...
                        </Text>
                      </>
                    ) : (
                      <>
                        <AntDesign name="edit" size={20} color="white" />
                        <Text className="text-white font-bold text-lg">
                          Refine My List
                        </Text>
                      </>
                    )}
                  </HStack>
                </LinearGradient>
              </TouchableOpacity>

              {/* Find Cheapest Button */}
              <TouchableOpacity
                onPress={findCheapest}
                disabled={isLoading}
                activeOpacity={0.8}
                style={{
                  opacity: isLoading ? 0.5 : 1,
                }}
              >
                <LinearGradient
                  colors={isDark 
                    ? ['#10b981', '#059669', '#047857'] 
                    : ['#34d399', '#10b981', '#059669']
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
                      <>
                        <Text className="text-white font-bold text-lg">
                          Finding Best Deals...
                        </Text>
                      </>
                    ) : (
                      <>
                        <AntDesign name="search1" size={20} color="white" />
                        <Text className="text-white font-bold text-lg">
                          Find Cheapest
                        </Text>
                      </>
                    )}
                  </HStack>
                </LinearGradient>
              </TouchableOpacity>

            </VStack>
          </VStack>
        </VStack>
      </ScrollView>
    </LinearGradient>
  );
};

export default ModalPage;
