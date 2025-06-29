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
import { SavedGroceryListItem } from '@/app/(tabs)/interface';
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
  const [purchased, setPurchased] = useState<boolean[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<Set<number>>(new Set());
  const [failedUpdates, setFailedUpdates] = useState<Set<number>>(new Set());
  
  const animation = useRef(new Animated.Value(0)).current;
  const { session } = useSession();
  const { setRefreshVersion } = useGroceryContext();
  const { colorScheme } = useColorScheme();
  
  // Queue for background API calls
  const updateQueueRef = useRef<Array<{
    item_id: string;
    purchased: boolean;
    idx: number;
    timestamp: number;
  }>>([]);
  const isProcessingRef = useRef(false);

  // Initialize purchased state from server data
  useEffect(() => {
    const newPurchased = insideText.map((item) => item.purchased);
    // Only update if significantly different (avoid unnecessary updates)
    if (JSON.stringify(newPurchased) !== JSON.stringify(purchased)) {
      setPurchased(newPurchased);
      // Clear any failed updates when new data comes in
      setFailedUpdates(new Set());
    }
  }, [insideText]);

  // Animation effect
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(animation, {
      toValue: expanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [expanded]);

  // Background API processing
  const processUpdateQueue = async () => {
    if (isProcessingRef.current || updateQueueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    
    while (updateQueueRef.current.length > 0) {
      const update = updateQueueRef.current.shift()!;
      
      try {
        // Remove from pending
        setPendingUpdates(prev => {
          const newSet = new Set(prev);
          newSet.delete(update.idx);
          return newSet;
        });

        // Calculate list status based on current UI state
        const allItemsPurchased = purchased.every((p, i) => 
          i === update.idx ? update.purchased : p
        );
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

        if (output.name === 'ControllerError') {
          console.error('Update failed:', output.statusCode, output.message);
          // Mark as failed
          setFailedUpdates(prev => new Set([...prev, update.idx]));
          
          // Revert the UI state for this item
          setPurchased(prevPurchased => {
            const reverted = [...prevPurchased];
            reverted[update.idx] = !update.purchased;
            return reverted;
          });
        } else {
          console.log('✅ Background sync successful:', update.item_id);
          // Remove from failed updates if it was there
          setFailedUpdates(prev => {
            const newSet = new Set(prev);
            newSet.delete(update.idx);
            return newSet;
          });
        }

        // Small delay between requests to avoid overwhelming the server
        // await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error('Background sync error:', error);
        setFailedUpdates(prev => new Set([...prev, update.idx]));
        
        // Revert the UI state for this item
        setPurchased(prevPurchased => {
          const reverted = [...prevPurchased];
          reverted[update.idx] = !update.purchased;
          return reverted;
        });
      }
    }

    isProcessingRef.current = false;
    
    // Refresh context after all updates are processed
    setRefreshVersion(v => v + 1);
  };

  // Handle immediate UI update with background sync
  const handleItemPurchase = (item_id: string, newPurchasedState: boolean, idx: number) => {
    // 1. Immediately update UI (no delay!)
    setPurchased(prev => {
      const updated = [...prev];
      updated[idx] = newPurchasedState;
      return updated;
    });

    // 2. Add to pending updates (visual indicator)
    setPendingUpdates(prev => new Set([...prev, idx]));

    // 3. Queue background API call
    updateQueueRef.current.push({
      item_id,
      purchased: newPurchasedState,
      idx,
      timestamp: Date.now(),
    });

    // 4. Process queue asynchronously
    processUpdateQueue();
  };

  const opacityInterpolation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Get visual state for an item (includes pending/failed indicators)
  const getItemVisualState = (idx: number) => {
    const isPending = pendingUpdates.has(idx);
    const isFailed = failedUpdates.has(idx);
    const isPurchased = purchased[idx];
    
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
                  {e.product?.name} - {e.amount} ({e.quantity} {e.unit}/
                  {e.product?.price})
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
              const visualState = getItemVisualState(idx);
              
              return (
                <Pressable
                  key={`${item.item_id}-${idx}`}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleItemPurchase(item.item_id, !purchased[idx], idx);
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
                      {item.product?.quantity} per pax, {item.amount} pax needed (
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
                    isChecked={purchased[idx]}
                    onChange={() => {
                      handleItemPurchase(item.item_id, !purchased[idx], idx);
                    }}
                    className="rounded-full border border-gray-400 w-6 h-6 justify-center items-center"
                  >
                    <CheckboxIndicator className="w-full h-full rounded-full">
                      {purchased[idx] && (
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