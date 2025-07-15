import { Pressable, ScrollView, View, Alert, Animated, StatusBar, Modal, Dimensions } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { useGroceryContext } from '@/context/groceryContext';
import { useState, useEffect, useRef } from 'react';
import { router } from 'expo-router';
import {
  GROCERY_LIST_STATUS_COLORS,
  GROCERY_LIST_STATUS_LABELS,
} from './interface';
import { GroceryListModal } from '@/components/GroceryListModal';
import { backend_url } from '@/lib/api';
import { useSession } from '@/context/authContext';
import { SavedGroceryList, ControllerError } from './interface';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import { Button } from '@/components/ui/button';
import AntDesign from '@expo/vector-icons/AntDesign';


const GroceryListHistoryPage = () => {
  const { groceryListHistory, setGroceryListHistory, refreshVersion, setRefreshVersion } =
    useGroceryContext();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalListID, setModalListID] = useState<string>('');
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false); // Add this state
  const { session } = useSession();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { width, height } = Dimensions.get('window');


  // Selection state
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showEditHeader, setShowEditHeader] = useState(false);
  const headerAnimation = useRef(new Animated.Value(0)).current;

  // Exit selection mode
  const exitSelectionMode = () => {
    console.log('🚪 Exiting selection mode');
    setSelectedLists([]);
    setIsSelectionMode(false);
    setShowEditHeader(false);
  };

  // Manage selection state
  useEffect(() => {
    if (selectedLists.length > 0 && !isSelectionMode) {
      setIsSelectionMode(true);
      setShowEditHeader(true);
    } else if (selectedLists.length === 0 && isSelectionMode) {
      setIsSelectionMode(false);
      setShowEditHeader(false);
    }
  }, [selectedLists.length]);

  // Header animation effect
  useEffect(() => {
    Animated.timing(headerAnimation, {
      toValue: showEditHeader ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [showEditHeader]);

  // Handle list press
  const handleListPress = (listId: string) => {
    if (isSelectionMode) {
      // Toggle selection
      const isSelected = selectedLists.includes(listId);
      if (isSelected) {
        setSelectedLists(prev => prev.filter(id => id !== listId));
      } else {
        setSelectedLists(prev => [...prev, listId]);
      }
    } else {
      // Navigate to grocery display
      router.push(`/groceryDisplay/${listId}`);
    }
  };

  // Handle long press
  const handleLongPress = (listId: string) => {
    if (!isSelectionMode) {
      // Enter selection mode and select the item
      setSelectedLists([listId]);
    }
  };

  // Handle the actual deletion after confirmation
  const handleConfirmDelete = async () => {
    if (!groceryListHistory || selectedLists.length === 0) return;

    try {
      let updatedLists: SavedGroceryList[] = [];

      updatedLists = groceryListHistory.filter(list => 
        selectedLists.includes(list.list_id)
      );
      updatedLists.map(list => list.list_status = 'deleted');

      
      // Update local state immediately (optimistic update)
      setGroceryListHistory([
  ...groceryListHistory.filter(list => !selectedLists.includes(list.list_id)), // Keep only non-updated items
  ...updatedLists, ]);

      // Close the confirmation modal
      setIsConfirmOpen(false);
      
      // Exit selection mode
      exitSelectionMode();

      // Send to backend
      const response = await fetch(`${backend_url}/lists/update`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedLists),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Error ${error.statusCode}: ${error.message}`);
      }

      console.log('✅ Delete successful');
      setRefreshVersion(prev => prev + 1);

    } catch (error) {
      console.error('❌ Error with delete:', error);
      Alert.alert('Error', 'Failed to delete lists. Please try again.');
      setRefreshVersion(prev => prev + 1);
    }
  };

  // Handle batch actions
  const handleBatchAction = async (action: 'delete' | 'archive' | 'activate' | 'purchased') => {
    if (!groceryListHistory || selectedLists.length === 0) return;

    // Show confirmation modal for delete action
    if (action === 'delete') {
      setIsConfirmOpen(true);
      return;
    }

    // Handle other actions normally
    const performAction = async () => {
      try {
        let updatedLists: SavedGroceryList[] = [];
        let requestBody: any[] = [];

        switch (action) {
          case 'archive':
            // Update local state
            updatedLists = groceryListHistory.map(list =>
              selectedLists.includes(list.list_id)
                ? { ...list, list_status: 'archived' as const }
                : list
            );
            
            // Prepare archive request
            requestBody = selectedLists.map(listId => ({
              list_id: listId,
              list_status: 'archived'
            }));
            break;

          case 'activate':
            // Update local state - use 'incomplete' instead of 'active'
            updatedLists = groceryListHistory.map(list =>
              selectedLists.includes(list.list_id)
                ? { ...list, list_status: 'incomplete' as const }
                : list
            );
            
            // Prepare activate request - use 'incomplete' instead of 'active'
            requestBody = selectedLists.map(listId => ({
              list_id: listId,
              list_status: 'incomplete'
            }));
            break;

          case 'purchased':
            // Update local state
            updatedLists = groceryListHistory.map(list =>
              selectedLists.includes(list.list_id)
                ? { ...list, list_status: 'purchased' as const }
                : list
            );
            
            // Prepare purchased request
            requestBody = selectedLists.map(listId => ({
              list_id: listId,
              list_status: 'purchased'
            }));
            break;
        }

        // Update local state immediately (optimistic update)
        setGroceryListHistory(updatedLists);
        
        // Exit selection mode
        exitSelectionMode();

        // Send to backend
        const response = await fetch(`${backend_url}/lists/update`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Error ${error.statusCode}: ${error.message}`);
        }

        console.log(`✅ ${action} successful`);
        setRefreshVersion(prev => prev + 1);

      } catch (error) {
        console.error(`❌ Error with ${action}:`, error);
        Alert.alert('Error', `Failed to ${action} lists. Please try again.`);
        setRefreshVersion(prev => prev + 1);
      }
    };

    performAction();
  };

  // Edit Header Component
  const EditHeader = () => {
    if (!groceryListHistory) return null; // Add null check

    // Determine the status of the selected lists
    const allSelectedArePurchased = selectedLists.every(listId => {
      const list = groceryListHistory.find(l => l.list_id === listId);
      return list?.list_status === 'purchased';
    });

    const allSelectedAreArchived = selectedLists.every(listId => {
      const list = groceryListHistory.find(l => l.list_id === listId);
      return list?.list_status === 'archived';
    });

    const allSelectedAreNotPurchasedOrArchived = selectedLists.every(listId => {
      const list = groceryListHistory.find(l => l.list_id === listId);
      return list?.list_status !== 'purchased' && list?.list_status !== 'archived';
    });

    return (
      <Animated.View
        style={{
          height: headerAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 60 + (StatusBar.currentHeight || 44)], // Reduced height
          }),
          opacity: headerAnimation,
          position: 'absolute',
          top: 0, // Flush to the very top
          left: 0,
          right: 0,
          zIndex: 10,
        }}
      >
        <View 
          className="bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-500" // Thinner border
          style={{
            paddingTop: StatusBar.currentHeight || 44, // Add padding for status bar
            paddingHorizontal: 16,
            paddingBottom: 6, // Reduced padding
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={exitSelectionMode}
                className="p-2 rounded-full bg-gray-100 dark:bg-gray-700"
              >
                <AntDesign name="close" size={18} color={isDark ? 'white' : 'black'} />
              </Pressable>
              <Text className="text-base font-semibold text-black dark:text-white">
                {selectedLists.length} selected
              </Text>
            </View>
            
            <View className="flex-row gap-3">
              {/* Actions for Not Purchased or Archived */}
              {allSelectedAreNotPurchasedOrArchived && (
                <>
                  <Pressable
                    onPress={() => handleBatchAction('purchased')}
                    className="p-2 rounded-full bg-green-100 dark:bg-green-800"
                  >
                    <AntDesign name="check" size={18} color="#16a34a" />
                  </Pressable>
                  <Pressable
                    onPress={() => handleBatchAction('archive')}
                    className="p-2 rounded-full bg-orange-100 dark:bg-orange-800"
                  >
                    <AntDesign name="inbox" size={18} color="#ea580c" />
                  </Pressable>
                </>
              )}

              {/* Actions for Purchased */}
              {allSelectedArePurchased && (
                <>
                  <Pressable
                    onPress={() => handleBatchAction('activate')}
                    className="p-2 rounded-full bg-blue-100 dark:bg-blue-800"
                  >
                    <AntDesign name="reload1" size={18} color="#2563eb" />
                  </Pressable>
                  <Pressable
                    onPress={() => handleBatchAction('archive')}
                    className="p-2 rounded-full bg-orange-100 dark:bg-orange-800"
                  >
                    <AntDesign name="inbox" size={18} color="#ea580c" />
                  </Pressable>
                </>
              )}

              {/* Actions for Archived */}
              {allSelectedAreArchived && (
                <>
                  <Pressable
                    onPress={() => handleBatchAction('activate')}
                    className="p-2 rounded-full bg-blue-100 dark:bg-blue-800"
                  >
                    <AntDesign name="reload1" size={18} color="#2563eb" />
                  </Pressable>
                </>
              )}

              {/* Delete Button (Always Available) */}
              <Pressable
                onPress={() => handleBatchAction('delete')}
                className="p-2 rounded-full bg-red-100 dark:bg-red-800"
              >
                <AntDesign name="delete" size={18} color="#dc2626" />
              </Pressable>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  // Fetch grocery history from backend and cache into context
  const fetchGroceryHistory = async () => {
    try {
      const response = await fetch(`${backend_url}/lists/getAll`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: SavedGroceryList[] = await response.json();
        setGroceryListHistory(data);
        console.log(groceryListHistory);
        console.log(data);
      } else {
        const error: ControllerError = await response.json();
        throw new Error(`Error ${error.statusCode}: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to fetch grocery history:', error);
    }
  };

  // Runs fetchGroceryHistory on component mount/render
  useEffect(() => {
    if (session) {
      fetchGroceryHistory();
    }
  }, [refreshVersion]); // when refreshVersion changes, useEffect will trigger code inside

  // Displays nothing when groceryListHistory is null or empty
  if (!groceryListHistory || groceryListHistory.length === 0) {
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
          contentContainerStyle={{ paddingTop: 60 }}
          className="flex-1"
          style={{ backgroundColor: 'transparent' }}
        >
          <View className="px-6">
            <Text className="text-4xl font-bold text-black dark:text-white">
              History
            </Text>
            <Text className="text-xl text-black/70 dark:text-white/80">
              History is Empty.
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

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
      <EditHeader />
      
      <ScrollView
        contentContainerStyle={{ 
          paddingTop: showEditHeader ? 60 + (StatusBar.currentHeight || 44) : 60, // Updated to match new header height
          paddingBottom: 20,
        }}
        className="flex-1"
        style={{ backgroundColor: 'transparent' }}
      >
        <View className="px-6 gap-4">
          <Text className="text-4xl font-bold text-black dark:text-white">
            History
          </Text>
          <Text className="text-xl text-black/70 dark:text-white/80">
            {isSelectionMode ? 'Select lists to perform batch actions' : 'Hold on grocery list to select multiple'}
          </Text>
          <View className="gap-4">
            {groceryListHistory?.map((list, idx) => {
              const isSelected = selectedLists.includes(list.list_id);
              
              return (
                <Pressable
                  key={idx}
                  onPress={() => handleListPress(list.list_id)}
                  onLongPress={() => handleLongPress(list.list_id)}
                  className={`${isSelected ? 'opacity-80' : ''}`}
                >
                  <Card className={`bg-white/90 dark:bg-gray-700/90 rounded-xl border shadow-lg backdrop-blur-sm ${
                    isSelected 
                      ? 'border-2 border-blue-500 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/30' 
                      : 'border border-gray-200 dark:border-gray-600'
                  }`}>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-xl font-semibold text-black dark:text-white">
                          {list.title}
                        </Text>
                        <Text className="text-xs font-normal text-black/70 dark:text-white/80">
                          {list.metadata ? list.metadata : ''}
                        </Text>
                        <Text
                          className={`text-md font-normal ${
                            GROCERY_LIST_STATUS_COLORS[list.list_status] ??
                            'text-black dark:text-white'
                          }`}
                        >
                          {GROCERY_LIST_STATUS_LABELS[list.list_status]}
                        </Text>
                      </View>
                      
                      {isSelected && (
                        <View className="bg-blue-500 dark:bg-blue-400 px-3 py-1 rounded-full">
                          <Text className="text-xs text-white font-medium">Selected</Text>
                        </View>
                      )}
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
      
      <GroceryListModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        id={modalListID}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        visible={isConfirmOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsConfirmOpen(false)}
      >
        <Pressable
          onPress={() => setIsConfirmOpen(false)}
          className="w-full flex-1 justify-center items-center bg-black/50"
        >
          <View
            className="bg-white dark:bg-gray-700 rounded-lg p-5 items-center justify-center"
            style={{
              width: width * 0.8, // 50% of screen width
              height: height * 0.4, // 20% of screen height
            }}
          >
            <Text className="text-xl text-black dark:text-white font-bold mb-4 text-center">
              Delete Grocery List?
            </Text>
            <Text className="text-sm text-gray-700 dark:text-gray-300 mb-6 text-center">
              You cannot revert this action after deletion.
            </Text>
            <View className="flex-row justify-between w-full">
              {/* Confirm Button */}
              <Pressable
                onPress={() => {
                  handleConfirmDelete();
                }}
                className="flex-1 ml-2 py-3 px-4 rounded-lg bg-red-600"
              >
                <Text className="text-center font-medium text-white">
                  Confirm
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
};

export default GroceryListHistoryPage;
