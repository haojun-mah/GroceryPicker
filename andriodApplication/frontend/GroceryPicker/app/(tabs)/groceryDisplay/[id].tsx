import DropdownCard from '@/components/DropdownCard';
import { Text } from '@/components/ui/text';
import { useEffect, useState, useRef } from 'react';
import { View, ScrollView, Animated, StatusBar } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useGroceryContext } from '@/context/groceryContext';
import { ALLOWED_SUPERMARKETS, SavedGroceryList } from '../interface';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import { Pressable } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import { backend_url } from '@/lib/api';
import { useSession } from '@/context/authContext';

const GroceryDisplay = () => {
  const { session } = useSession();
  // Extract it as ID
  const { id: rawId } = useLocalSearchParams();
  const id = Array.isArray(rawId) ? rawId[0] : rawId ?? "";
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { groceryListHistory } = useGroceryContext();
  const [currGroceryList, setCurrGroceryList] = useState<SavedGroceryList | null>(null);
  
  // Global selection state for all dropdown cards
  const [selectedItemsToEdit, setSelectedItemsToEdit] = useState<string[]>([]);
  const [isSelectItemsToEditState, setIsSelectItemsToEditState] = useState(false);
  const [showEditHeader, setShowEditHeader] = useState(false);
  
  // Animation ref for header
  const headerAnimation = useRef(new Animated.Value(0)).current;

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
    const list = groceryListHistory?.find(
      (list) => String(list.list_id) === String(id),
    );
    setCurrGroceryList(list ?? null);
    console.log(
      'Check displayid page. Expecting JSON containing singular grocery list',
    );
    console.log(
      'Check display if it has target grocery list mounted:\n',
      list,
    );
  };

  // Handle edit actions
  const handleEditAction = (action: 'delete' | 'mark-purchased' | 'mark-unpurchased' | 'edit-quantity') => {
    const patchReq = async (list: SavedGroceryList) => {
      try {
        const response = await fetch(`${backend_url}/lists/update`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(list),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Error ${error.statusCode}: ${error.message}`);
        } else {
          console.log('Patch request successful from edit header:', list);
        }
      } catch (error) {
        console.error('Error with patchReq:', error);

    }
    
    if (currGroceryList === null) return;

    switch (action) {
      case 'mark-purchased':
        const updatedList : SavedGroceryList = {
          ...currGroceryList,
          grocery_list_items: currGroceryList.grocery_list_items.map(i =>
            selectedItemsToEdit.includes(i.item_id) 
              ? { ...i, purchased: true } // backend may change purchased into status
              : i
          ),
        };
      case 'mark-unpurchased':
        selectedItemsToEdit.forEach(itemId => {
          const item = currGroceryList?.grocery_list_items?.find(i => i.item_id === itemId);
          if (item) {
            // Handle unpurchase logic here - you'll need to implement this
            console.log('Mark as unpurchased:', itemId);
          }
        });
        break;
      case 'delete':
        console.log('Delete items:', selectedItemsToEdit);
        break;
      case 'edit-quantity':
        console.log('Edit quantity for:', selectedItemsToEdit);
        break;
    }
    
    // Exit selection mode
    exitSelectionMode();
  };

  const exitSelectionMode = () => {
    setSelectedItemsToEdit([]);
    setIsSelectItemsToEditState(false);
    setShowEditHeader(false);
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