import React, { useEffect, useState, useMemo } from 'react';
import { Alert, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  SupermarketName, // Add this import
  ALLOWED_SUPERMARKETS,
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
  const [generateRefinementGrocery, setGenerateRefinementGrocery] = useState<
    AiPromptRequestBody | undefined
  >(undefined);

  const {
    setIsLoading,
    groceryRefinement,
    setGroceryRefinement,
    setGroceryListHistory,
    isLoading,
    setRefreshVersion,
  } = useGroceryContext();

  const groceryList: GroceryItem[] | undefined = groceryRefinement?.items;

  // Fix: Use useMemo to memoize the supermarketFilter
  const supermarketFilter = useMemo((): SupermarketName[] => {
    return (groceryRefinement?.supermarketFilter?.exclude || []).filter(
      (name): name is SupermarketName =>
        ALLOWED_SUPERMARKETS.includes(name),
    );
  }, [groceryRefinement?.supermarketFilter?.exclude]);

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
  }, [groceryList, supermarketFilter]); // Now supermarketFilter is stable

  const refineMyList = async (): Promise<boolean> => {
    try {
      if (!generateRefinementGrocery?.message?.length) {
        Alert.alert('Error', 'Your list is empty.');
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

      if (response.ok) {
        const output: GroceryMetadataTitleOutput = await response.json();

        if (output.title === '!@#$%^') {
          Alert.alert('Error', 'Invalid refinement item.');
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

        setIsLoading(false);
        return true;
      } else {
        setIsLoading(false);
        Alert.alert('Error', 'Invalid refinement item.');
        return false;
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'An error occurred while refining your list.');
      setIsLoading(false);
      return false;
    }
  };

  const findCheapest = async () => {
    try {
      if (!generateRefinementGrocery?.message?.length) {
        Alert.alert('Error', 'Your list is empty.');
        return;
      }

      setIsLoading(true);

      // Direct optimize API call - backend handles generation internally
      const response = await fetch(`${backend_url}/lists/optimise`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generateRefinementGrocery),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Optimize API failed:', response.status, errorData);

        // Handle specific error cases from backend
        if (
          errorData.message &&
          errorData.message.includes('Invalid refinement item')
        ) {
          Alert.alert(
            'Error',
            'Invalid refinement item detected in your list.',
          );
        } else if (errorData.message) {
          Alert.alert('Error', errorData.message);
        } else {
          Alert.alert(
            'Error',
            'Failed to optimize your list. Please try again.',
          );
        }

        setIsLoading(false);
        return;
      }

      const optimisedList: SavedGroceryList = await response.json();
      console.log('🔍 Optimized list created:', optimisedList);

      // Validate the optimized list structure
      if (!optimisedList || !optimisedList.list_id) {
        console.error('❌ Invalid optimized list structure:', optimisedList);
        Alert.alert('Error', 'Invalid response from optimization service.');
        setIsLoading(false);
        return;
      }

      // Fix: Use the correct endpoint - /lists/getAll
      console.log('🔄 Fetching updated grocery list history...');
      const allListsResponse = await fetch(`${backend_url}/lists/getAll`, {
        // Fixed to /lists/getAll
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (allListsResponse.ok) {
        const allList: SavedGroceryList[] = await allListsResponse.json();
        console.log('🔄 Updated grocery list history:', allList);

        // Validate the response
        if (!Array.isArray(allList)) {
          console.error('❌ Invalid grocery list history response:', allList);
          Alert.alert('Error', 'Failed to fetch updated grocery lists.');
          setIsLoading(false);
          return;
        }

        // Verify the optimized list is in the updated history
        const listExists = allList.some(
          (list) => list.list_id === optimisedList.list_id,
        );
        if (!listExists) {
          console.warn(
            '⚠️ Optimized list not found in updated history, adding it manually',
          );
          allList.push(optimisedList);
        }

        // Update the context with the new list
        setGroceryListHistory(allList);
        setRefreshVersion((prev) => prev + 1);
        setIsLoading(false);

        // Navigate to the optimized list
        console.log(
          '🔍 Navigating to optimized list with ID:',
          optimisedList.list_id,
        );
        router.replace(`/groceryDisplay/${optimisedList.list_id}`);

        // Clear the refinement state after navigation
        setTimeout(() => {
          setGroceryRefinement(null);
        }, 100);
      } else {
        console.error(
          '❌ Failed to fetch updated grocery lists:',
          allListsResponse.status,
        );
        Alert.alert('Error', 'Failed to fetch updated grocery lists.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('❌ Error in findCheapest:', error);
      Alert.alert('Error', 'An error occurred while optimizing your list.');
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={
          isDark
            ? ['#1f2937', '#374151', '#4b5563']
            : ['#f8fafc', '#f1f5f9']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ 
            flexGrow: 1,
            padding: 20,
          }}
          style={{ backgroundColor: 'transparent' }}
        >
        <VStack className="flex-1 justify-center" space="lg">
          {/* Header */}
          <VStack space="md" className="items-center">
            <Heading className="text-4xl font-bold text-center text-gray-900 dark:text-white">
              Refine Your List
            </Heading>
            <VStack space="xs" className="items-center">
              <Text className="text-sm text-gray-700 dark:text-white/80 text-center">
                Don't like your list?
              </Text>
              <Text className="text-sm text-gray-700 dark:text-white/80 text-center">
                Edit it and we'll do the work!
              </Text>
            </VStack>
          </VStack>

          {/* Main Content */}
          <VStack space="lg" className="w-full">
            {/* Grocery List Text Area */}
            <VStack space="sm">
              <Text className="text-lg font-medium text-gray-800 dark:text-white">
                Your Grocery List
              </Text>
              <Box className="h-48 bg-white/95 dark:bg-gray-700/90 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm backdrop-blur-sm">
                <Textarea className="w-full h-full rounded-xl bg-transparent border-0">
                  <TextareaInput
                    className="text-gray-900 dark:text-white p-4"
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
                  colors={
                    isDark
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
                  colors={
                    isDark
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
    </SafeAreaView>
  );
};

export default ModalPage;
