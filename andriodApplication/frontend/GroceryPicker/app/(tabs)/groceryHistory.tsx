import { Pressable, ScrollView, View, Alert, Animated, StatusBar } from 'react-native';
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

/*
  Page host grocery list history for each user.
  User can click on grocery list card which leads to grocery display.
  User can long press to enter multi-selection mode for batch actions.

  GET request to /lists/getAll return SavedGroceryList[] type.
  */

const GroceryListHistoryPage = () => {
  const { groceryListHistory, setGroceryListHistory, refreshVersion, setRefreshVersion } =
    useGroceryContext();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalListID, setModalListID] = useState<string>('');
  const { session } = useSession();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

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

  // Handle batch actions
  const handleBatchAction = async (action: 'delete' | 'archive' | 'activate' | 'purchased') => {
    if (!groceryListHistory || selectedLists.length === 0) return;

    const performAction = async () => {
      try {
        let updatedLists: SavedGroceryList[] = [];
        let requestBody: any[] = [];

        switch (action) {
          case 'delete':
            // Remove from local state
            updatedLists = groceryListHistory.filter(list => 
              !selectedLists.includes(list.list_id)
            );
            
            // Prepare delete request
            requestBody = selectedLists.map(listId => ({
              list_id: listId,
              _action: 'delete'
            }));
            break;

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

    if (action === 'delete') {
      // Show confirmation dialog for delete
      Alert.alert(
        'Delete Lists',
        `Are you sure you want to delete ${selectedLists.length} list${selectedLists.length > 1 ? 's' : ''}? This action cannot be undone.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: performAction,
          },
        ]
      );
    } else {
      performAction();
    }
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
            outputRange: [0, 70],
          }),
          opacity: headerAnimation,
          position: 'absolute',
          top: StatusBar.currentHeight || 44,
          left: 0,
          right: 0,
          zIndex: 10,
        }}
      >
        <View className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600 px-4 py-2">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={exitSelectionMode}
                className="p-2 rounded-full bg-gray-100 dark:bg-gray-700"
              >
                <AntDesign name="close" size={20} color={isDark ? 'white' : 'black'} />
              </Pressable>
              <Text className="text-lg font-semibold text-black dark:text-white">
                {selectedLists.length} selected
              </Text>
            </View>
            
            <View className="flex-row gap-2">
              {/* Actions for Not Purchased or Archived */}
              {allSelectedAreNotPurchasedOrArchived && (
                <>
                  <Button
                    onPress={() => handleBatchAction('purchased')}
                    variant="outline"
                    size="sm"
                    className="border-green-500 dark:border-green-400"
                  >
                    <Text className="text-green-600 dark:text-green-400">Purchased</Text>
                  </Button>
                  <Button
                    onPress={() => handleBatchAction('archive')}
                    variant="outline"
                    size="sm"
                    className="border-orange-500 dark:border-orange-400"
                  >
                    <Text className="text-orange-600 dark:text-orange-400">Archive</Text>
                  </Button>
                </>
              )}

              {/* Actions for Purchased */}
              {allSelectedArePurchased && (
                <>
                  <Button
                    onPress={() => handleBatchAction('activate')}
                    variant="outline"
                    size="sm"
                    className="border-blue-500 dark:border-blue-400"
                  >
                    <Text className="text-blue-600 dark:text-blue-400">Unpurchase</Text>
                  </Button>
                  <Button
                    onPress={() => handleBatchAction('archive')}
                    variant="outline"
                    size="sm"
                    className="border-orange-500 dark:border-orange-400"
                  >
                    <Text className="text-orange-600 dark:text-orange-400">Archive</Text>
                  </Button>
                </>
              )}

              {/* Actions for Archived */}
              {allSelectedAreArchived && (
                <>
                  <Button
                    onPress={() => handleBatchAction('activate')}
                    variant="outline"
                    size="sm"
                    className="border-blue-500 dark:border-blue-400"
                  >
                    <Text className="text-blue-600 dark:text-blue-400">Unarchive</Text>
                  </Button>
                </>
              )}

              {/* Delete Button (Always Available) */}
              <Button
                onPress={() => handleBatchAction('delete')}
                variant="outline"
                size="sm"
                className="border-red-500 dark:border-red-400"
              >
                <Text className="text-red-600 dark:text-red-400">Delete</Text>
              </Button>
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
          paddingTop: showEditHeader ? 70 + (StatusBar.currentHeight || 44) : 60,
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
            {groceryListHistory.map((list, idx) => {
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
    </LinearGradient>
  );
};

export default GroceryListHistoryPage;
