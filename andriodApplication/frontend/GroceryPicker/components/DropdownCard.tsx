import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  View,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Button, ButtonGroup } from './ui/button';
import { Card } from './ui/card';
import Entypo from '@expo/vector-icons/Entypo';
import { Text } from './ui/text';
import { useColorScheme } from 'nativewind';
import { Image } from './ui/image';
import { CheckboxIcon, CheckboxIndicator, Checkbox } from './ui/checkbox';
import { CircleIcon } from './ui/icon';
import { Pressable } from 'react-native';
import { SavedGroceryListItem } from '@/app/types/interface';
import { useSession } from '@/context/authContext';
import { backend_url } from '@/lib/api';
import { useGroceryContext } from '@/context/groceryContext';

// Enable LayoutAnimation for Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DropdownCard = ({
  outsideText,
  insideText,
  defaultOpen,
  id,
  supermarket,
}: {
  outsideText: SavedGroceryListItem[];
  insideText: SavedGroceryListItem[];
  defaultOpen: boolean;
  id: string;
  supermarket: string;
}) => {
  const [expanded, setExpanded] = useState(defaultOpen);
  
  // Single source of truth for purchased state with optimistic updates
  const [localPurchasedState, setLocalPurchasedState] = useState<{[key: string]: boolean}>({});
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());
  const [failedUpdates, setFailedUpdates] = useState<Set<string>>(new Set());
  
  const animation = useRef(new Animated.Value(0)).current;
  const { session } = useSession();
  const { setRefreshVersion } = useGroceryContext();
  const { colorScheme } = useColorScheme();
  
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Queue for background API calls
  const updateQueueRef = useRef<Array<{
    item_id: string;
    purchased: boolean;
    timestamp: number;
  }>>([]);
  const isProcessingRef = useRef(false);

  // Initialize local state from server data ONLY on first load or when items change
  const serverStateRef = useRef<string>('');
  useEffect(() => {
    const serverStateKey = insideText.map(item => `${item.item_id}:${item.purchased}`).join('|');
    
    // Only update if server data actually changed (not just re-renders)
    if (serverStateKey !== serverStateRef.current) {
      console.log('🔄 Server data changed, updating local state');
      serverStateRef.current = serverStateKey;
      
      const newLocalState: {[key: string]: boolean} = {};
      insideText.forEach(item => {
        // Only update if we don't have pending updates for this item
        if (!pendingUpdates.has(item.item_id)) {
          newLocalState[item.item_id] = item.purchased;
        } else {
          // Keep existing optimistic state for pending items
          newLocalState[item.item_id] = localPurchasedState[item.item_id] ?? item.purchased;
        }
      });
      
      setLocalPurchasedState(newLocalState);
      
      // Clear failed updates for items that now match server state
      if (failedUpdates.size > 0) {
        const newFailedUpdates = new Set(failedUpdates);
        failedUpdates.forEach(itemId => {
          const serverItem = insideText.find(i => i.item_id === itemId);
          if (serverItem && localPurchasedState[itemId] === serverItem.purchased) {
            newFailedUpdates.delete(itemId);
          }
        });
        setFailedUpdates(newFailedUpdates);
      }
    }
  }, [insideText]); // Remove other dependencies to avoid double updates

  // Animation effect
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(animation, {
      toValue: expanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [expanded]);

  // Background API processing with better error handling
  const processUpdateQueue = async () => {
    if (isProcessingRef.current || updateQueueRef.current.length === 0 || !isMountedRef.current) {
      return;
    }

    isProcessingRef.current = true;
    
    // Process one update at a time to avoid race conditions
    const update = updateQueueRef.current.shift()!;
    
    try {
      console.log('🚀 Processing update for:', update.item_id, update.purchased);
      
      // Calculate list status based on current local state
      const allItemsPurchased = insideText.every(item => {
        const currentState = item.item_id === update.item_id 
          ? update.purchased 
          : localPurchasedState[item.item_id] ?? item.purchased;
        return currentState;
      });
      const list_purchased = allItemsPurchased ? 'purchased' : 'incomplete';

      const purchasedItem = [{
        list_id: outsideText[0].list_id,
        list_status: list_purchased,
        grocery_list_items: [{
          item_id: update.item_id,
          purchased: update.purchased,
        }],
      }];

      const response = await fetch(`${backend_url}/lists/update`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(purchasedItem),
      });

      const output = await response.json();

      if (!isMountedRef.current) return;

      if (output.name === 'ControllerError') {
        console.error('❌ Update failed:', output.statusCode, output.message);
        
        // Mark as failed and revert optimistic update
        setFailedUpdates(prev => new Set([...prev, update.item_id]));
        setPendingUpdates(prev => {
          const newSet = new Set(prev);
          newSet.delete(update.item_id);
          return newSet;
        });
        
        // Revert to server state
        const serverItem = insideText.find(i => i.item_id === update.item_id);
        if (serverItem) {
          setLocalPurchasedState(prev => ({
            ...prev,
            [update.item_id]: serverItem.purchased
          }));
        }
      } else {
        console.log('✅ Update successful:', update.item_id);
        
        // Remove from pending and failed updates
        setPendingUpdates(prev => {
          const newSet = new Set(prev);
          newSet.delete(update.item_id);
          return newSet;
        });
        setFailedUpdates(prev => {
          const newSet = new Set(prev);
          newSet.delete(update.item_id);
          return newSet;
        });
        
        // Don't modify local state here - it should already be correct from optimistic update
        // The server will send fresh data through context refresh
      }

    } catch (error) {
      console.error('💥 Background sync error:', error);
      
      if (!isMountedRef.current) return;
      
      setFailedUpdates(prev => new Set([...prev, update.item_id]));
      setPendingUpdates(prev => {
        const newSet = new Set(prev);
        newSet.delete(update.item_id);
        return newSet;
      });
      
      // Revert to server state
      const serverItem = insideText.find(i => i.item_id === update.item_id);
      if (serverItem) {
        setLocalPurchasedState(prev => ({
          ...prev,
          [update.item_id]: serverItem.purchased
        }));
      }
    }

    isProcessingRef.current = false;
    
    // Process next item in queue if any
    if (updateQueueRef.current.length > 0) {
      setTimeout(processUpdateQueue, 100); // Small delay between requests
    } else {
      // All updates processed, refresh context
      console.log('🔄 All updates processed, refreshing context');
      setRefreshVersion(v => v + 1);
    }
  };

  // Handle item purchase with optimistic updates
  const handleItemPurchase = (item_id: string, newPurchasedState: boolean) => {
    console.log('👆 User clicked:', item_id, newPurchasedState);
    
    // Prevent double clicks
    if (pendingUpdates.has(item_id)) {
      console.log('⏳ Update already pending for:', item_id);
      return;
    }

    // 1. Immediately update local state (optimistic update)
    setLocalPurchasedState(prev => ({
      ...prev,
      [item_id]: newPurchasedState
    }));

    // 2. Add to pending updates
    setPendingUpdates(prev => new Set([...prev, item_id]));
    
    // 3. Remove from failed updates if it was there
    setFailedUpdates(prev => {
      const newSet = new Set(prev);
      newSet.delete(item_id);
      return newSet;
    });

    // 4. Queue background API call
    updateQueueRef.current.push({
      item_id,
      purchased: newPurchasedState,
      timestamp: Date.now(),
    });

    // 5. Process queue
    if (!isProcessingRef.current) {
      processUpdateQueue();
    }
  };

  const opacityInterpolation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Get visual state for an item
  const getItemVisualState = (item: SavedGroceryListItem) => {
    const isPending = pendingUpdates.has(item.item_id);
    const isFailed = failedUpdates.has(item.item_id);
    const isPurchased = localPurchasedState[item.item_id] ?? item.purchased;
    
    return {
      isPurchased,
      isPending,
      isFailed,
      opacity: isPending ? 0.7 : 1,
      textStyle: isPurchased 
        ? 'line-through text-gray-400 dark:text-gray-500' 
        : isFailed 
        ? 'text-red-500 dark:text-red-400' 
        : 'text-black dark:text-white'
    };
  };

  return (
    <Pressable
      onPress={!expanded ? () => setExpanded(true) : undefined}
      className="w-full"
    >
      <Card className="bg-white dark:bg-gray-700 w-full rounded-xl p-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            {!expanded &&
              outsideText.map((e, i) => (
                <Text
                  key={`${e.item_id}-${i}`}
                  size="xs"
                  className="text:black dark:text-white text-md"
                >
                  {e.product?.name || e.name} - {e.amount === 0 ? 'Not optimized' : e.amount} ({e.quantity} {e.unit}/
                  {e.product?.price || 'No price'})
                </Text>
              ))}
            {expanded && (
              <View className="flex-row items-center gap-2">
                <Text className="text-base font-semibold text-black dark:text-white">
                  Detailed Groceries
                </Text>
                {pendingUpdates.size > 0 && (
                  <View className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded-full">
                    <Text className="text-xs text-blue-600 dark:text-blue-300">
                      Syncing {pendingUpdates.size}
                    </Text>
                  </View>
                )}
                {failedUpdates.size > 0 && (
                  <View className="bg-red-100 dark:bg-red-900 px-2 py-1 rounded-full">
                    <Text className="text-xs text-red-600 dark:text-red-300">
                      {failedUpdates.size} failed
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
          <ButtonGroup>
            <Button onPress={() => setExpanded(!expanded)} variant="link">
              <Entypo
                name="chevron-up"
                size={24}
                color={colorScheme === 'light' ? 'black' : 'white'}
                className={`transition-transform duration-300 ease-in-out ${expanded ? 'rotate-180' : 'rotate-0'}`}
              />
            </Button>
          </ButtonGroup>
        </View>

        <Animated.View
          style={{
            opacity: opacityInterpolation,
            overflow: 'hidden',
            maxHeight: expanded ? undefined : 0,
          }}
        >
          <View className="mt-2 space-y-2">
            {insideText.map((item, idx) => {
              const visualState = getItemVisualState(item);
              
              return (
                <Pressable
                  key={`${item.item_id}-${idx}`}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleItemPurchase(item.item_id, !visualState.isPurchased);
                  }}
                  className="flex-row items-center gap-3 m-2"
                  style={{ opacity: visualState.opacity }}
                >
                  <Image
                    source={{
                      uri: !item.product?.image_url ? '' : item.product.image_url,
                    }}
                    alt="Image of grocery"
                    className="w-20 h-20 rounded-md bg-gray-300"
                  />
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text
                        className={`text-xl font-semibold ${visualState.textStyle}`}
                      >
                        {item.product?.name}
                      </Text>
                      {visualState.isPending && (
                        <View className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      )}
                      {visualState.isFailed && (
                        <Text className="text-xs text-red-500">⚠️</Text>
                      )}
                    </View>
                    <Text
                      className={`text-md ${
                        visualState.isPurchased
                          ? 'line-through text-gray-400 dark:text-gray-500'
                          : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {item.product?.quantity} each, {item.amount} needed (
                      {item.quantity}
                      {item.unit})
                    </Text>
                    <Text
                      className={`text-md ${
                        visualState.isPurchased
                          ? 'line-through text-gray-400 dark:text-gray-500'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {item.product?.price}
                    </Text>
                  </View>
                  <Checkbox
                    value={`item-${item.item_id}-${idx}`}
                    isChecked={visualState.isPurchased}
                    onChange={() => {
                      handleItemPurchase(item.item_id, !visualState.isPurchased);
                    }}
                    className="rounded-full border border-gray-400 w-6 h-6 justify-center items-center"
                  >
                    <CheckboxIndicator className="w-full h-full rounded-full">
                      {visualState.isPurchased && (
                        <CheckboxIcon
                          as={CircleIcon}
                          className="border-none w-4 h-4 fill-black"
                        />
                      )}
                    </CheckboxIndicator>
                  </Checkbox>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </Card>
    </Pressable>
  );
};

export default DropdownCard;