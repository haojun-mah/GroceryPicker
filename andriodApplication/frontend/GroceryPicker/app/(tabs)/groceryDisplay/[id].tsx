import DropdownCard from '@/components/DropdownCard';
import { Text } from '@/components/ui/text';
import { useEffect, useState, useRef } from 'react';
import { View, ScrollView, Animated, StatusBar, Modal, TextInput, Alert, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useGroceryContext } from '@/context/groceryContext';
import { ALLOWED_SUPERMARKETS, SavedGroceryList } from '../interface';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import AntDesign from '@expo/vector-icons/AntDesign';
import { backend_url } from '@/lib/api';
import { useSession } from '@/context/authContext';
import { Image } from '@/components/ui/image';

const GroceryDisplay = () => {
  const { session } = useSession();
  // Extract it as ID
  const { id: rawId } = useLocalSearchParams();
  const id = Array.isArray(rawId) ? rawId[0] : rawId ?? "";
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { groceryListHistory, setRefreshVersion } = useGroceryContext();
  const [currGroceryList, setCurrGroceryList] = useState<SavedGroceryList | null>(null);
  
  // Global selection state for all dropdown cards
  const [selectedItemsToEdit, setSelectedItemsToEdit] = useState<string[]>([]);
  const [isSelectItemsToEditState, setIsSelectItemsToEditState] = useState(false);
  const [showEditHeader, setShowEditHeader] = useState(false);
  
  // Modal state for edit quantity
  const [showEditQuantityModal, setShowEditQuantityModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [newPrice, setNewPrice] = useState('');
  
  // Animation ref for header
  const headerAnimation = useRef(new Animated.Value(0)).current;

  // Helper function to close modal and reset state
  const closeEditModal = () => {
    console.log('🔵 Closing edit modal');
    setShowEditQuantityModal(false);
    setEditingItem(null);
    setNewQuantity('');
    setNewPrice('');
  };

  // Check ID exist and groceryListHistory is successfully fetched before calling for fetchDisplayInfo
  useEffect(() => {
    if (id && groceryListHistory && groceryListHistory?.length > 0) {
      fetchDisplayInfo();
    }
  }, [id, groceryListHistory]);

  // Header animation effect
  useEffect(() => {
    Animated.timing(headerAnimation, {
      toValue: showEditHeader ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [showEditHeader]);

  // Manage selection state
  useEffect(() => {
    if (selectedItemsToEdit.length > 0 && !isSelectItemsToEditState) {
      setIsSelectItemsToEditState(true);
      setShowEditHeader(true);
    } else if (selectedItemsToEdit.length === 0 && isSelectItemsToEditState) {
      setIsSelectItemsToEditState(false);
      setShowEditHeader(false);
    }
  }, [selectedItemsToEdit.length]);

  // filter target grocery list from context with ID
  const fetchDisplayInfo = async () => {
    console.log('🔍 DEBUG: groceryListHistory:', groceryListHistory);
    console.log('🔍 DEBUG: Looking for ID:', id, 'Type:', typeof id);
    console.log('🔍 DEBUG: groceryListHistory length:', groceryListHistory?.length);
    
    if (groceryListHistory) {
      console.log('🔍 DEBUG: Available list_ids:', groceryListHistory.map(list => ({ 
        list_id: list.list_id, 
        type: typeof list.list_id 
      })));
    }
    
    const list = groceryListHistory?.find(
      (list) => String(list.list_id) === String(id),
    );
    
    // If list is not found in context, try to fetch it directly from the backend
    if (!list && id) {
      console.log('🔍 List not found in context, fetching directly from backend...');
      try {
        const response = await fetch(`${backend_url}/lists/${id}`, {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        });
        
        if (response.ok) {
          const fetchedList = await response.json();
          console.log('🔍 Fetched list directly from backend:', fetchedList);
          setCurrGroceryList(fetchedList);
          
          // Also update the context with the new list
          setRefreshVersion(prev => prev + 1);
          return;
        } else {
          console.error('❌ Failed to fetch list from backend:', response.status);
        }
      } catch (error) {
        console.error('❌ Error fetching list from backend:', error);
      }
    }
    
    setCurrGroceryList(list ?? null);
    console.log('Check displayid page. Expecting JSON containing singular grocery list');
    console.log('Check display if it has target grocery list mounted:\n', list);
  };

  // Handle edit actions
  const handleEditAction = (action: 'delete' | 'mark-purchased' | 'mark-unpurchased' | 'edit-quantity') => {
    const patchReq = async (modifiedList: SavedGroceryList) => {
      try {
        // Create array with all grocery lists, replacing the modified one
        const updatedGroceryListsArray = groceryListHistory?.map(list => 
          list.list_id === modifiedList.list_id ? modifiedList : list
        ) || [];
        
        console.log('🚀 Sending full array to API:', updatedGroceryListsArray);
        console.log('🔍 Modified list:', modifiedList);
        
        const response = await fetch(`${backend_url}/lists/update`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedGroceryListsArray), // Send entire array
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Error ${error.statusCode}: ${error.message}`);
        } else {
          console.log('✅ Patch request successful - sent full array');
          // REMOVED: Alert.alert('Success', 'Items updated successfully!');
          
          // Trigger refresh after successful update to sync with backend
          setRefreshVersion(prev => prev + 1);
        }
      } catch (error) {
        console.error('❌ Error with patchReq:', error);
        Alert.alert('Error', 'Failed to update items. Please try again.');
        
        // Revert local state on error by refetching
        setRefreshVersion(prev => prev + 1);
      }
    };
    
    if (currGroceryList === null) return;

    let updatedList: SavedGroceryList;

    switch (action) {
      case 'mark-purchased':
        console.log('📋 Marking items as purchased:', selectedItemsToEdit);
        updatedList = {
          ...currGroceryList,
          grocery_list_items: currGroceryList.grocery_list_items.map(i =>
            selectedItemsToEdit.includes(i.item_id) 
              ? { ...i, item_status: 'purchased' }
              : i
          ),
        };
        console.log('📋 Updated list for purchase:', updatedList);
        
        // Update local state immediately (optimistic update)
        setCurrGroceryList(updatedList);
        
        // Then send to backend
        patchReq(updatedList);
        break;
        
      case 'mark-unpurchased':
        console.log('📋 Marking items as unpurchased:', selectedItemsToEdit);
        updatedList = {
          ...currGroceryList,
          grocery_list_items: currGroceryList.grocery_list_items.map(i =>
            selectedItemsToEdit.includes(i.item_id) 
              ? { ...i, item_status: 'incomplete' }
              : i
          ),
        };
        console.log('📋 Updated list for unpurchase:', updatedList);
        
        // Update local state immediately (optimistic update)
        setCurrGroceryList(updatedList);
        
        // Then send to backend
        patchReq(updatedList);
        break;
        
      case 'delete':
        console.log('🗑️ Deleting items:', selectedItemsToEdit);
        updatedList = {
          ...currGroceryList,
          grocery_list_items: currGroceryList.grocery_list_items.filter(i =>
            !selectedItemsToEdit.includes(i.item_id) // Remove items completely for better UX
          ),
        };
        console.log('🗑️ Updated list for delete:', updatedList);
        
        // Update local state immediately (optimistic update)
        setCurrGroceryList(updatedList);
        
        // Then send to backend
        patchReq(updatedList);
        break;
        
      case 'edit-quantity':
        // Instead of returning JSX, we set state to show the modal
        if (selectedItemsToEdit.length === 1) {
          const itemToEdit = currGroceryList.grocery_list_items.find(
            item => item.item_id === selectedItemsToEdit[0]
          );
          if (itemToEdit) {
            setEditingItem(itemToEdit);
            setNewQuantity(String(itemToEdit.quantity));
            setNewPrice(String(itemToEdit.purchased_price || itemToEdit.product?.price || ''));
            setShowEditQuantityModal(true);
            return; // Don't exit selection mode yet
          }
        }
        break;
    }
    
    // Exit selection mode for other actions
    exitSelectionMode();
  };

  const exitSelectionMode = () => {
    setSelectedItemsToEdit([]);
    setIsSelectItemsToEditState(false);
    setShowEditHeader(false);
  };

  // Handle quantity update
  const handleQuantityUpdate = async () => {
    if (!editingItem || !currGroceryList) return;

    // Validate inputs
    const quantityNumber = parseFloat(newQuantity);
    const priceNumber = parseFloat(newPrice);
    
    if (isNaN(quantityNumber) || quantityNumber <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid quantity greater than 0.');
      return;
    }

    if (newPrice && (isNaN(priceNumber) || priceNumber < 0)) {
      Alert.alert('Invalid Input', 'Please enter a valid price (or leave empty).');
      return;
    }

    console.log('🔵 Updating quantity for item:', editingItem.name, 'New quantity:', quantityNumber, 'New price:', priceNumber);

    const updatedList: SavedGroceryList = {
      ...currGroceryList,
      grocery_list_items: currGroceryList.grocery_list_items.map(item =>
        item.item_id === editingItem.item_id
          ? {
              ...item,
              quantity: quantityNumber,
              purchased_price: priceNumber || item.purchased_price,
            }
          : item
      ),
    };

    // Update local state immediately (optimistic update)
    setCurrGroceryList(updatedList);
    
    // Close modal and exit selection mode immediately
    closeEditModal();
    exitSelectionMode();

    try {
      // Create array with all grocery lists, replacing the modified one
      const updatedGroceryListsArray = groceryListHistory?.map(list => 
        list.list_id === updatedList.list_id ? updatedList : list
      ) || [];
      
      console.log('🚀 Sending full array to API for quantity update:', updatedGroceryListsArray);
      
      const response = await fetch(`${backend_url}/lists/update`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedGroceryListsArray),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Error ${error.statusCode}: ${error.message}`);
      } else {
        console.log('✅ Quantity update successful - sent full array');
        setRefreshVersion(prev => prev + 1);
      }
    } catch (error) {
      console.error('❌ Error updating quantity:', error);
      Alert.alert('Error', 'Failed to update item. Please try again.');
      setRefreshVersion(prev => prev + 1);
    }
  };

  // Global Edit Header Component
  const EditHeader = () => {
    return (
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          height: headerAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 70 + (StatusBar.currentHeight || 44)],
          }),
          opacity: headerAnimation,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            backgroundColor: isDark ? '#374151' : '#ffffff',
            borderBottomWidth: 1,
            borderBottomColor: isDark ? '#4B5563' : '#E5E7EB',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 5,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: (StatusBar.currentHeight || 44) + 8,
            paddingBottom: 8,
            height: 70 + (StatusBar.currentHeight || 44),
          }}
        >
          <View className="flex-row items-center">
            <Pressable onPress={exitSelectionMode} className="mr-4">
              <AntDesign 
                name="close" 
                size={24} 
                color={isDark ? '#FFFFFF' : '#374151'} 
              />
            </Pressable>
            <Text className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-700'}`}>
              {selectedItemsToEdit.length} selected
            </Text>
          </View>
          
          <View className="flex-row items-center space-x-3">
            <Pressable 
              onPress={() => handleEditAction('mark-purchased')}
              className={`p-2 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-100'}`}
            >
              <AntDesign 
                name="checkcircle" 
                size={20} 
                color={isDark ? '#10B981' : '#059669'} 
              />
            </Pressable>
            
            <Pressable 
              onPress={() => handleEditAction('mark-unpurchased')}
              className={`p-2 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-100'}`}
            >
              <AntDesign 
                name="closecircle" 
                size={20} 
                color={isDark ? '#EF4444' : '#DC2626'} 
              />
            </Pressable>
            
            {/* Only show edit quantity button when exactly 1 item is selected */}
            {selectedItemsToEdit.length === 1 && (
              <Pressable 
                onPress={() => handleEditAction('edit-quantity')}
                className={`p-2 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-100'}`}
              >
                <AntDesign 
                  name="edit" 
                  size={20} 
                  color={isDark ? '#3B82F6' : '#2563EB'} 
                />
              </Pressable>
            )}
            
            <Pressable 
              onPress={() => handleEditAction('delete')}
              className={`p-2 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-100'}`}
            >
              <AntDesign 
                name="delete" 
                size={20} 
                color={isDark ? '#EF4444' : '#DC2626'} 
              />
            </Pressable>
          </View>
        </View>
      </Animated.View>
    );
  };

  if (!currGroceryList) {
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
        <ScrollView contentContainerStyle={{ paddingTop: 52 }}>
          <View className="px-4 gap-4 text-4xl font-bold">
            <Text className="text-4xl font-semibold mb-2 text-white">
              Optimized Grocery List
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
      
      {/* Edit Quantity Modal */}
      <Modal
        visible={showEditQuantityModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          closeEditModal();
        }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <Pressable 
            className="flex-1 bg-black/50 justify-center items-center"
            onPress={() => {
              // Close modal when tapping outside
              closeEditModal();
            }}
          >
            <Pressable
              className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 mx-4 w-80 max-w-sm`}
              onPress={(e) => e.stopPropagation()} // Prevent modal from closing when tapping inside
            >
            <Text className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Edit Item
            </Text>
            
            {editingItem && (
              <>
                {/* Item Image */}
                <View className="items-center mb-4">
                  <Image
                    source={{
                      uri: editingItem.product?.image_url || '',
                    }}
                    alt="Item image"
                    className="w-20 h-20 rounded-lg bg-gray-300" // Smaller image
                  />
                </View>
                
                {/* Item Name - More compact */}
                <Text className={`text-lg font-semibold mb-3 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {editingItem.product?.name || editingItem.name}
                </Text>
                
                {/* Amount Purchased Input */}
                <View className="mb-3">
                  <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                    Amount Purchased ({editingItem.unit})
                  </Text>
                  <TextInput
                    value={newQuantity}
                    onChangeText={setNewQuantity}
                    keyboardType="numeric"
                    className={`${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'} px-4 py-2 rounded-lg border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                    placeholder="Enter amount"
                    placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                    autoFocus={true}
                    selectTextOnFocus={true}
                  />
                </View>
                
                {/* Price Purchased Input */}
                <View className="mb-4">
                  <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                    Price Purchased
                  </Text>
                  <TextInput
                    value={newPrice}
                    onChangeText={setNewPrice}
                    keyboardType="numeric"
                    className={`${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'} px-4 py-2 rounded-lg border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                    placeholder="Enter price"
                    placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                    selectTextOnFocus={true}
                  />
                </View>
                
                {/* Buttons */}
                <View className="flex-row justify-between">
                  <Pressable
                    onPress={() => {
                      closeEditModal();
                    }}
                    className={`flex-1 mr-2 py-2 px-4 rounded-lg ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`}
                  >
                    <Text className={`text-center font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Cancel
                    </Text>
                  </Pressable>
                  
                  <Pressable
                    onPress={handleQuantityUpdate}
                    className="flex-1 ml-2 py-2 px-4 rounded-lg bg-blue-600"
                  >
                    <Text className="text-center font-medium text-white">
                      Update
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>
      
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ 
          paddingTop: showEditHeader ? 70 + (StatusBar.currentHeight || 44) + 16 : 52 
        }}
      >
        <View className="px-4 gap-4">
          <Text className="text-4xl font-bold mb-2 text-white">
            {currGroceryList.title}
          </Text>

          {ALLOWED_SUPERMARKETS.map((shops, idx) => {
            const items = currGroceryList.grocery_list_items.filter((item) => {
              return item.product?.supermarket === shops;
            });
            if (items.length === 0) {
              console.log('Length 0');
              return null;
            }
            return (
              <View key={`${shops}-${idx}`} className="items-start w-full">
                <Text className="text-xl font-semibold mb-1 text-white">
                  {shops}
                </Text>
                <DropdownCard
                  key={`${id}-${shops}-${currGroceryList.list_id}`}
                  outsideText={items}
                  insideText={items}
                  defaultOpen={false}
                  id={id}
                  supermarket={shops}
                  selectedItemsToEdit={selectedItemsToEdit}
                  setSelectedItemsToEdit={setSelectedItemsToEdit}
                  isSelectItemsToEditState={isSelectItemsToEditState}
                  setIsSelectItemsToEditState={setIsSelectItemsToEditState}
                  showEditHeader={showEditHeader}
                  setShowEditHeader={setShowEditHeader}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

export default GroceryDisplay;