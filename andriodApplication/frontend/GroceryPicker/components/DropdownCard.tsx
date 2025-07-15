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

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface DropdownCardProps {
  outsideText: SavedGroceryListItem[];
  insideText: SavedGroceryListItem[];
  defaultOpen: boolean;
  id: string;
  supermarket: string;
  selectedItemsToEdit: string[];
  setSelectedItemsToEdit: (
    items: string[] | ((prev: string[]) => string[]),
  ) => void;
  isSelectItemsToEditState: boolean;
  setIsSelectItemsToEditState: (value: boolean) => void;
  showEditHeader: boolean;
  setShowEditHeader: (value: boolean) => void;
}

const DropdownCard = ({
  outsideText,
  insideText,
  defaultOpen,
  id,
  supermarket,
  selectedItemsToEdit,
  setSelectedItemsToEdit,
  isSelectItemsToEditState,
  setIsSelectItemsToEditState,
  showEditHeader,
  setShowEditHeader,
}: DropdownCardProps) => {
  const [expanded, setExpanded] = useState(defaultOpen);

  // Local state for purchased items
  const [localPurchasedState, setLocalPurchasedState] = useState<{
    [key: string]: boolean;
  }>({});
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
  const updateQueueRef = useRef<
    Array<{
      item_id: string;
      purchased: boolean;
      timestamp: number;
    }>
  >([]);
  const isProcessingRef = useRef(false);

  // Helper function to get purchased status from item_status
  const getItemPurchasedStatus = (item: SavedGroceryListItem): boolean => {
    return item.item_status === 'purchased';
  };

  // Initialize local state from server data
  const serverStateRef = useRef<string>('');
  useEffect(() => {
    const serverStateKey = insideText
      .map((item) => `${item.item_id}:${getItemPurchasedStatus(item)}`)
      .join('|');

    if (serverStateKey !== serverStateRef.current) {
      serverStateRef.current = serverStateKey;

      const newLocalState: { [key: string]: boolean } = {};
      insideText.forEach((item) => {
        if (!pendingUpdates.has(item.item_id)) {
          newLocalState[item.item_id] = getItemPurchasedStatus(item);
        } else {
          newLocalState[item.item_id] =
            localPurchasedState[item.item_id] ?? getItemPurchasedStatus(item);
        }
      });

      setLocalPurchasedState(newLocalState);

      if (failedUpdates.size > 0) {
        const newFailedUpdates = new Set(failedUpdates);
        failedUpdates.forEach((itemId) => {
          const serverItem = insideText.find((i) => i.item_id === itemId);
          if (
            serverItem &&
            localPurchasedState[itemId] === getItemPurchasedStatus(serverItem)
          ) {
            newFailedUpdates.delete(itemId);
          }
        });
        setFailedUpdates(newFailedUpdates);
      }
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
    if (
      isProcessingRef.current ||
      updateQueueRef.current.length === 0 ||
      !isMountedRef.current
    ) {
      return;
    }

    isProcessingRef.current = true;
    const update = updateQueueRef.current.shift()!;

    try {
      const allItemsPurchased = insideText.every((item) => {
        const currentState =
          item.item_id === update.item_id
            ? update.purchased
            : (localPurchasedState[item.item_id] ??
              getItemPurchasedStatus(item));
        return currentState;
      });
      const list_purchased = allItemsPurchased ? 'purchased' : 'incomplete';

      const purchasedItem = [
        {
          list_id: outsideText[0].list_id,
          list_status: list_purchased,
          grocery_list_items: [
            {
              item_id: update.item_id,
              item_status: update.purchased ? 'purchased' : 'incomplete',
            },
          ],
        },
      ];

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
        setFailedUpdates((prev) => new Set([...prev, update.item_id]));
        setPendingUpdates((prev) => {
          const newSet = new Set(prev);
          newSet.delete(update.item_id);
          return newSet;
        });

        const serverItem = insideText.find((i) => i.item_id === update.item_id);
        if (serverItem) {
          setLocalPurchasedState((prev) => ({
            ...prev,
            [update.item_id]: getItemPurchasedStatus(serverItem),
          }));
        }
      } else {
        setPendingUpdates((prev) => {
          const newSet = new Set(prev);
          newSet.delete(update.item_id);
          return newSet;
        });
        setFailedUpdates((prev) => {
          const newSet = new Set(prev);
          newSet.delete(update.item_id);
          return newSet;
        });
      }
    } catch (error) {
      if (!isMountedRef.current) return;

      setFailedUpdates((prev) => new Set([...prev, update.item_id]));
      setPendingUpdates((prev) => {
        const newSet = new Set(prev);
        newSet.delete(update.item_id);
        return newSet;
      });

      const serverItem = insideText.find((i) => i.item_id === update.item_id);
      if (serverItem) {
        setLocalPurchasedState((prev) => ({
          ...prev,
          [update.item_id]: getItemPurchasedStatus(serverItem),
        }));
      }
    }

    isProcessingRef.current = false;

    if (updateQueueRef.current.length > 0) {
      setTimeout(processUpdateQueue, 100);
    } else {
      setRefreshVersion((v) => v + 1);
    }
  };

  // Handle item interactions
  const handleShortPress = (item_id: string, newPurchasedState: boolean) => {
    if (isSelectItemsToEditState) {
      if (selectedItemsToEdit.includes(item_id)) {
        setSelectedItemsToEdit((prev) => prev.filter((id) => id !== item_id));
      } else {
        setSelectedItemsToEdit((prev) => [...prev, item_id]);
      }
    } else {
      if (pendingUpdates.has(item_id)) {
        return;
      }

      setLocalPurchasedState((prev) => ({
        ...prev,
        [item_id]: newPurchasedState,
      }));

      setPendingUpdates((prev) => new Set([...prev, item_id]));

      setFailedUpdates((prev) => {
        const newSet = new Set(prev);
        newSet.delete(item_id);
        return newSet;
      });

      updateQueueRef.current.push({
        item_id,
        purchased: newPurchasedState,
        timestamp: Date.now(),
      });

      if (!isProcessingRef.current) {
        processUpdateQueue();
      }
    }
  };

  const handleLongPress = (item_id: string) => {
    if (isSelectItemsToEditState) return;

    setIsSelectItemsToEditState(true);
    setShowEditHeader(true);
    setSelectedItemsToEdit([...selectedItemsToEdit, item_id]);
  };

  const opacityInterpolation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Update the getDisplayPrice function to properly prioritize purchased_price
  const getDisplayPrice = (item: SavedGroceryListItem): string => {
    // If purchased_price exists and is not null, show it with $ symbol
    if (item.purchased_price !== null && item.purchased_price !== undefined) {
      return `$${item.purchased_price.toFixed(2)}`;
    }

    // Otherwise, show the product price if it exists (already has $ symbol)
    if (item.product?.price) {
      return item.product.price;
    }

    // If no price is available
    return 'No price';
  };

  // Get visual state for an item
  const getItemVisualState = (item: SavedGroceryListItem) => {
    const isPending = pendingUpdates.has(item.item_id);
    const isFailed = failedUpdates.has(item.item_id);
    const isPurchased =
      localPurchasedState[item.item_id] ?? getItemPurchasedStatus(item);
    const isSelected = selectedItemsToEdit.includes(item.item_id);

    return {
      isPurchased,
      isPending,
      isFailed,
      isSelected,
      opacity: isPending ? 0.7 : 1,
      textStyle: isPurchased
        ? 'line-through text-gray-400 dark:text-gray-500'
        : isFailed
          ? 'text-red-500 dark:text-red-400'
          : 'text-black dark:text-white',
    };
  };

  return (
    <View className="w-full">
      <Pressable
        onPress={!expanded ? () => setExpanded(true) : undefined}
        className="w-full"
      >
        <Card className="bg-white dark:bg-gray-700 w-full rounded-xl p-4">
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              {!expanded &&
                outsideText.map((e, i) => {
                  if (e.item_status === 'deleted') return null;
                  return (
                    <Text
                      key={`${e.item_id}-${i}`}
                      size="xs"
                      className="text-black dark:text-white text-md"
                    >
                      {e.product?.name || e.name} -{' '}
                      {e.amount === 0 ? 'Not optimized' : e.amount} ({e.quantity}{' '}
                      {e.unit}/{e.product?.price || 'No price'})
                    </Text>
                  );
                })}
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
                if (item.item_status === 'deleted') return null;
                return (
                  <Pressable
                    key={`${item.item_id}-${idx}`}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleShortPress(item.item_id, !visualState.isPurchased);
                    }}
                    onLongPress={() => handleLongPress(item.item_id)}
                    className={`flex-row items-center gap-3 m-2 p-3 rounded-lg border-2 ${
                      visualState.isSelected
                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-600/50'
                        : 'bg-white border-transparent dark:bg-gray-700 dark:border-transparent'
                    }`}
                    style={{ opacity: visualState.opacity }}
                  >
                    <Image
                      source={{
                        uri: !item.product?.image_url
                          ? ''
                          : item.product.image_url,
                      }}
                      alt="Image of grocery"
                      className="w-20 h-20 rounded-md bg-gray-300"
                    />
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text
                          className={`text-xl font-semibold ${
                            colorScheme === 'light'
                              ? 'text-black'
                              : 'text-white'
                          }`}
                        >
                          {item.product?.name}
                        </Text>
                        {visualState.isPending && (
                          <View className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        )}
                        {visualState.isFailed && (
                          <Text className="text-xs text-red-500">⚠️</Text>
                        )}
                        {visualState.isSelected && (
                          <View className="bg-blue-500 dark:bg-blue-400 px-2 py-1 rounded-full">
                            <Text className="text-xs text-white font-medium">
                              Selected
                            </Text>
                          </View>
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
                        {getDisplayPrice(item)}
                      </Text>
                    </View>
                    {!isSelectItemsToEditState && (
                      <Checkbox
                        value={`item-${item.item_id}-${idx}`}
                        isChecked={visualState.isPurchased}
                        onChange={() => {
                          handleShortPress(
                            item.item_id,
                            !visualState.isPurchased,
                          );
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
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        </Card>
      </Pressable>
    </View>
  );
};

export default DropdownCard;
