import React, { useEffect, useState, useMemo } from 'react';
import { Alert, Dimensions, TouchableOpacity, View, Animated, Modal, FlatList } from 'react-native';
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

  // Modal state for selecting existing lists
  const [showExistingListModal, setShowExistingListModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'refine' | 'optimize' | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  const {
    setIsLoading,
    groceryRefinement,
    setGroceryRefinement,
    setGroceryListHistory,
    groceryListHistory,
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

      // OPTIMIZATION: Update context immediately instead of refetching all lists
      console.log('🔄 Adding new list to context...');
      if (groceryListHistory) {
        // Add the new list to the beginning of the array (most recent first)
        const updatedHistory = [optimisedList, ...groceryListHistory];
        setGroceryListHistory(updatedHistory);
      } else {
        // If no history exists, create new array with just this list
        setGroceryListHistory([optimisedList]);
      }
      
      setRefreshVersion((prev) => prev + 1);
      setIsLoading(false);

      // Navigate to the optimized list
      console.log('🔍 Navigating to optimized list with ID:', optimisedList.list_id);
      router.replace(`/groceryDisplay/${optimisedList.list_id}`);

      // Clear the refinement state after navigation
      setTimeout(() => {
        setGroceryRefinement(null);
      }, 100);
    } catch (error) {
      console.error('❌ Error in findCheapest:', error);
      Alert.alert('Error', 'An error occurred while optimizing your list.');
      setIsLoading(false);
    }
  };

  const addToExistingList = async (existingListId: string) => {
    try {
      if (!generateRefinementGrocery?.message?.length) {
        Alert.alert('Error', 'Your list is empty.');
        return;
      }

      setIsLoading(true);
      setShowExistingListModal(false);

      const requestBody = {
        ...generateRefinementGrocery,
        existingListId: existingListId,
      };

      // Use the same optimize endpoint but with existingListId
      const response = await fetch(`${backend_url}/lists/optimise`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Add to existing list failed:', response.status, errorData);

        if (errorData.message) {
          Alert.alert('Error', errorData.message);
        } else {
          Alert.alert(
            'Error',
            'Failed to add items to existing list. Please try again.',
          );
        }

        setIsLoading(false);
        return;
      }

      const updatedList: SavedGroceryList = await response.json();
      console.log('🔍 Items added to existing list:', updatedList);

      // Validate the response
      if (!updatedList || !updatedList.list_id) {
        console.error('❌ Invalid response structure:', updatedList);
        Alert.alert('Error', 'Invalid response from server.');
        setIsLoading(false);
        return;
      }

      // OPTIMIZATION: Update the specific list in context instead of refetching all
      console.log('🔄 Updating list in context...');
      if (groceryListHistory) {
        const updatedHistory = groceryListHistory.map(list => 
          list.list_id === updatedList.list_id ? updatedList : list
        );
        setGroceryListHistory(updatedHistory);
      }
      
      setRefreshVersion((prev) => prev + 1);
      setIsLoading(false);

      // Navigate to the updated list
      console.log('🔍 Navigating to updated list with ID:', updatedList.list_id);
      router.replace(`/groceryDisplay/${updatedList.list_id}`);

      // Clear the refinement state after navigation
      setTimeout(() => {
        setGroceryRefinement(null);
      }, 100);

      Alert.alert('Success', 'Items added to your existing list!');
    } catch (error) {
      console.error('❌ Error in addToExistingList:', error);
      Alert.alert('Error', 'An error occurred while adding items to the list.');
      setIsLoading(false);
    }
  };

  const handleActionButtonPress = (action: 'refine' | 'optimize') => {
    setSelectedAction(action);
    
    if (action === 'refine') {
      // For refining, directly call the refine function
      refineMyList();
    } else if (action === 'optimize') {
      // For optimizing, show modal to choose between new list or existing list
      setShowExistingListModal(true);
    }
  };

  const closeModal = () => {
    setShowExistingListModal(false);
    setSelectedListId(null);
  };

  const handleExistingListSelection = (listId: string) => {
    setSelectedListId(listId);
  };

  const confirmListSelection = () => {
    if (selectedListId) {
      addToExistingList(selectedListId);
      setSelectedListId(null);
    }
  };

  const createNewListFromModal = () => {
    setShowExistingListModal(false);
    findCheapest();
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Day Background */}
      <LinearGradient
        colors={['#87CEEB', '#98D8E8', '#F0F8FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
      />

      {/* Night Background Overlay */}
      <Animated.View
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          opacity: isDark ? 1 : 0,
        }}
      >
        <LinearGradient
          colors={['#0f172a', '#1e293b', '#334155']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      {/* Stars */}
      <Animated.View
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          opacity: isDark ? 1 : 0,
        }}
      >
        {[...Array(50)].map((_, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: 2,
              height: 2,
              backgroundColor: 'white',
              borderRadius: 1,
              opacity: 0.3 + Math.random() * 0.7,
            }}
          />
        ))}
      </Animated.View>

    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ 
            flexGrow: 1,
            padding: 20,
          }}
          style={{ backgroundColor: 'transparent' }}
          showsVerticalScrollIndicator={false}
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
                    placeholderTextColor={isDark ? 'white' : 'black'}
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
                onPress={() => handleActionButtonPress('refine')}
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
                    {isLoading && selectedAction === 'refine' ? (
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

              {/* Optimize & Save Button */}
              <TouchableOpacity
                onPress={() => handleActionButtonPress('optimize')}
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
                    {isLoading && selectedAction === 'optimize' ? (
                      <>
                        <Text className="text-white font-bold text-lg">
                          Optimizing...
                        </Text>
                      </>
                    ) : (
                      <>
                        <AntDesign name="save" size={20} color="white" />
                        <Text className="text-white font-bold text-lg">
                          Optimise & Save List
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
    </SafeAreaView>

    {/* Existing List Selection Modal */}
    <Modal
      visible={showExistingListModal}
      transparent={true}
      animationType="slide"
      onRequestClose={closeModal}
    >
      <TouchableOpacity 
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        activeOpacity={1}
        onPress={closeModal}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            borderRadius: 16,
            padding: 20,
            width: '90%',
            maxHeight: '70%',
          }}
        >
          <VStack space="lg">
            {/* Modal Header */}
            <HStack className="justify-between items-center">
              <Heading className="text-xl font-bold text-gray-900 dark:text-white">
                Choose Where to Save
              </Heading>
              <TouchableOpacity
                onPress={closeModal}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: isDark ? '#374151' : '#f3f4f6',
                }}
              >
                <AntDesign 
                  name="close" 
                  size={20} 
                  color={isDark ? '#ffffff' : '#000000'} 
                />
              </TouchableOpacity>
            </HStack>

            {/* Instructions */}
            <Text className="text-sm text-gray-600 dark:text-gray-300">
              Select an incomplete list to add items to, or create a new list:
            </Text>

            {/* List of existing grocery lists */}
            <FlatList
              data={groceryListHistory?.filter(list => 
                list.list_status === 'incomplete'
              ) || []}
              keyExtractor={(item) => item.list_id}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleExistingListSelection(item.list_id)}
                  style={{
                    padding: 16,
                    marginVertical: 4,
                    backgroundColor: selectedListId === item.list_id 
                      ? (isDark ? '#1e40af' : '#dbeafe') 
                      : (isDark ? '#374151' : '#f9fafb'),
                    borderRadius: 12,
                    borderWidth: selectedListId === item.list_id ? 2 : 1,
                    borderColor: selectedListId === item.list_id 
                      ? '#3b82f6' 
                      : (isDark ? '#4b5563' : '#e5e7eb'),
                  }}
                >
                  <HStack className="justify-between items-center">
                    <VStack space="xs" className="flex-1">
                      <Text className={`font-semibold ${selectedListId === item.list_id 
                        ? (isDark ? 'text-white' : 'text-blue-900')
                        : 'text-gray-900 dark:text-white'
                      }`}>
                        {item.title}
                      </Text>
                      <Text className={`text-sm ${selectedListId === item.list_id 
                        ? (isDark ? 'text-blue-200' : 'text-blue-700')
                        : 'text-gray-600 dark:text-gray-300'
                      }`}>
                        {item.grocery_list_items.length} items • {item.list_status}
                      </Text>
                      {item.metadata && (
                        <Text className={`text-xs ${selectedListId === item.list_id 
                          ? (isDark ? 'text-blue-300' : 'text-blue-600')
                          : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {item.metadata}
                        </Text>
                      )}
                    </VStack>
                    {selectedListId === item.list_id && (
                      <AntDesign 
                        name="checkcircle" 
                        size={24} 
                        color="#3b82f6" 
                      />
                    )}
                  </HStack>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <Box className="p-8 items-center">
                  <Text className="text-gray-500 dark:text-gray-400 text-center">
                    No incomplete lists found.
                  </Text>
                  <Text className="text-sm text-gray-400 dark:text-gray-500 text-center mt-2">
                    Only incomplete lists can be modified.
                  </Text>
                  <Text className="text-sm text-gray-400 dark:text-gray-500 text-center mt-1">
                    Create a new list instead!
                  </Text>
                </Box>
              )}
            />

            {/* Action Buttons */}
            <VStack space="md">
              {/* Add to Selected List Button */}
              <TouchableOpacity
                onPress={confirmListSelection}
                disabled={!selectedListId}
                style={{
                  padding: 16,
                  backgroundColor: selectedListId ? '#3b82f6' : (isDark ? '#374151' : '#e5e7eb'),
                  borderRadius: 12,
                  alignItems: 'center',
                  opacity: selectedListId ? 1 : 0.5,
                }}
              >
                <HStack className="items-center" space="sm">
                  <AntDesign 
                    name="pluscircleo" 
                    size={20} 
                    color={selectedListId ? '#ffffff' : (isDark ? '#9ca3af' : '#6b7280')} 
                  />
                  <Text className={`font-bold text-lg ${selectedListId 
                    ? 'text-white' 
                    : (isDark ? 'text-gray-400' : 'text-gray-500')
                  }`}>
                    {selectedListId ? 'Add to Selected List' : 'Select a List First'}
                  </Text>
                </HStack>
              </TouchableOpacity>

              {/* Bottom Action Buttons */}
              <HStack space="md">
                <TouchableOpacity
                  onPress={closeModal}
                  style={{
                    flex: 1,
                    padding: 12,
                    backgroundColor: isDark ? '#374151' : '#f3f4f6',
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text className="font-medium text-gray-700 dark:text-gray-300">
                    Cancel
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={createNewListFromModal}
                  style={{
                    flex: 1,
                    padding: 12,
                    backgroundColor: '#10b981',
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text className="font-medium text-white">
                    Create New List
                  </Text>
                </TouchableOpacity>
              </HStack>
            </VStack>
          </VStack>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>

    </View>
  );
};

export default ModalPage;
