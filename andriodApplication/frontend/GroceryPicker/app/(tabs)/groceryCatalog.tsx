'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  TouchableWithoutFeedback,
  Pressable,
  Linking,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Search, Star, Flame, Tag } from 'lucide-react-native';
import axios from 'axios';
import { backend_url } from '@/lib/api';
import { useSession } from '@/context/authContext';
import { useGroceryContext } from '@/context/groceryContext';
import { AddItemRequestBody, ProductCatalog, SearchProductsResponse, SavedGroceryList } from './interface';
import { Modal } from 'react-native'
import { Button } from '@/components/ui/button';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import EvilIcons from '@expo/vector-icons/EvilIcons';
import AntDesign from '@expo/vector-icons/AntDesign';


const GrocerySearch = () => {
  const { session } = useSession();
  const { groceryListHistory, setGroceryListHistory, setIsLoading, setRefreshVersion, refreshVersion } = useGroceryContext();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<ProductCatalog[] | null>(null);
  const [promotions, setPromotions] = useState<ProductCatalog[] | null>(null);
  const [searchResult, setSearchResult] = useState<ProductCatalog[] | null>(null);
  const [itemDisplay, setItemDisplay] = useState<ProductCatalog[] | null>(null);
  const [target, setTarget] = useState<ProductCatalog | null>(null);
  const [showAddToList, setShowAddToList] = useState<boolean>(false);
  
  // Pagination states
  const [offset, setOffset] = useState<number>(0);
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);
  const [hasMoreItems, setHasMoreItems] = useState<boolean>(true);
  const [searchOffset, setSearchOffset] = useState<number>(0);
  const [hasMoreSearchResults, setHasMoreSearchResults] = useState<boolean>(true);
  const [amountPurchased, setAmountPurchased] = useState<string>('1');
  const [showCreateNewList, setShowCreateNewList] = useState<boolean>(false);
  const [newListName, setNewListName] = useState<string>('');

  // Initially get to populate page
  useEffect(() => {
    const fetchData = async () => {
      // Reset pagination states
      setOffset(0);
      setHasMoreItems(true);
      
      const itemDisplay = await fetchCatalogItems(0, true); // true means reset the list
      setItemDisplay(itemDisplay); 
      
      const promotion = await search(true);
      setPromotions(promotion || []);
      setSearchResult(null);
    };
    fetchData();
  }, []);

  // Function to fetch catalog items with pagination
  const fetchCatalogItems = async (currentOffset: number, reset: boolean = false) => {
    try {
      if (!reset) setIsFetchingMore(true);
      if (reset) setIsLoading(true);

      const response = await axios.get(`${backend_url}/products/search?limit=10&offset=${currentOffset}`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (response.status === 200 || response.status === 201) {
        const results: SearchProductsResponse = response.data;
        console.log(`Fetched ${results.results.length} items at offset ${currentOffset}`);
        
        // Check if we have more items
        if (results.results.length < 10) {
          setHasMoreItems(false);
        }
        
        if (reset) {
          setOffset(10);
          return results.results;
        } else {
          setOffset(currentOffset + 10);
          return results.results;
        }
      } else {
        console.error('Failed to fetch catalog items:', response.statusText);
        return [];
      }
    } catch (error) {
      console.error('Error fetching catalog items:', error);
      return [];
    } finally {
      setIsFetchingMore(false);
      if (reset) setIsLoading(false);
    }
  };

  // Function to fetch more catalog items
  const fetchMoreCatalogItems = useCallback(async () => {
    if (isFetchingMore || !hasMoreItems) return;

    const moreItems = await fetchCatalogItems(offset);
    if (moreItems.length > 0) {
      setItemDisplay((prevItems) => 
        prevItems ? [...prevItems, ...moreItems] : moreItems
      );
    }
  }, [offset, isFetchingMore, hasMoreItems]);

  // Function to fetch search results with pagination
  const fetchSearchResults = async (query: string, currentOffset: number, reset: boolean = false) => {
    try {
      if (!reset) setIsFetchingMore(true);
      if (reset) setIsLoading(true);

      const response = await axios.get(`${backend_url}/products/search?q=${query}&limit=10&offset=${currentOffset}`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (response.status === 200) {
        const results: SearchProductsResponse = response.data;
        console.log(`Fetched ${results.results.length} search results at offset ${currentOffset}`);
        
        // Check if we have more search results
        if (results.results.length < 10) {
          setHasMoreSearchResults(false);
        }
        
        if (reset) {
          setSearchOffset(10);
          return results.results;
        } else {
          setSearchOffset(currentOffset + 10);
          return results.results;
        }
      } else {
        console.error('Search failed:', response.statusText);
        return [];
      }
    } catch (error) {
      console.error('Search error:', error);
      return [];
    } finally {
      setIsFetchingMore(false);
      if (reset) setIsLoading(false);
    }
  };

  // Function to fetch more search results
  const fetchMoreSearchResults = useCallback(async () => {
    if (isFetchingMore || !hasMoreSearchResults || !searchQuery) return;

    const moreResults = await fetchSearchResults(searchQuery, searchOffset);
    if (moreResults.length > 0) {
      setSearchResult((prevResults) => 
        prevResults ? [...prevResults, ...moreResults] : moreResults
      );
    }
  }, [searchOffset, isFetchingMore, hasMoreSearchResults, searchQuery]);

  const search = async (promotion: boolean = false) => {
    try {
      setSuggestions(null);

      let input: string;

      if (promotion) {
        input = 'hasPromotion=true&random=true';
        setIsLoading(true);

        const response = await axios.get(`${backend_url}/products/search?${input}`, {
          headers: {
            Authorization: `Bearer ${session?.access_token}`
          }
        });

        if (response.status === 200) {
          const results: SearchProductsResponse = response.data;
          return results.results;
        }
      } else {
        // Reset search pagination states
        setSearchOffset(0);
        setHasMoreSearchResults(true);
        
        const results = await fetchSearchResults(searchQuery, 0, true);
        setSearchResult(results);
        return results;
      }
    } catch (error) {
      console.error('Search error:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }

  // Function to fetch grocery lists
  const fetchGroceryLists = async () => {
    try {
      if (!session?.access_token) return;
      
      console.log('🔍 Fetching grocery lists for catalog...');
      const response = await fetch(`${backend_url}/lists/getAll`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: SavedGroceryList[] = await response.json();
        console.log('🔍 Fetched grocery lists for catalog:', data);
        setGroceryListHistory(data);
      } else {
        console.error('🔍 Error fetching grocery lists for catalog:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch grocery lists for catalog:', error);
    }
  };

  // Refresh grocery lists when refreshVersion changes
  useEffect(() => {
    if (session) {
      fetchGroceryLists();
    }
  }, [refreshVersion]);

  // Handle scroll to bottom
  const handleScroll = ({ nativeEvent }: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const paddingToBottom = 20;
    
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      // Check if we're showing search results or catalog items
      if (searchResult !== null && Array.isArray(searchResult) && searchResult.length > 0) {
        fetchMoreSearchResults();
      } else if (itemDisplay !== null) {
        fetchMoreCatalogItems();
      }
    }
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

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={400}
      >
        {/* Header */}
        <View className="bg-transparent backdrop-blur-md pt-12 pb-6 px-6 z-10">
          <View className="mb-6">
            <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Grocery Catalog
            </Text>
            <Text className="text-gray-800 dark:text-gray-200 text-base">
              Find fresh groceries from your favorite supermarkets
            </Text>
          </View>

          {/* Enhanced Search Bar and Suggestions Container */}
          <View className="relative z-50">
            {/* Search Input Wrapper */}
            <View className="relative bg-white/30 dark:bg-black/30 backdrop-blur-md rounded-2xl border-2 border-white/50 dark:border-gray-500 focus:border-green-500 dark:focus:border-green-400">
              <View className="absolute left-5 top-1/2 z-10" style={{ transform: [{ translateY: -12 }] }}>
                <EvilIcons 
                  name="search" 
                  size={24} 
                  color={isDark ? '#ffffff' : '#374151'} 
                />
              </View>
              <TextInput
                className="pl-14 pr-6 py-6 text-lg text-gray-900 dark:text-white bg-transparent rounded-2xl"
                placeholder="Search for groceries..."
                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                value={searchQuery}
                onChangeText={async (text) => {
                  setSearchQuery(text);

                  if (text.length === 0) {
                    setSuggestions(null);
                    return;
                  }

                  try {
                    const response = await axios.get<ProductCatalog[]>(`${backend_url}/products/suggestions?q=${text}`, {
                      headers: {
                        Authorization: `Bearer ${session?.access_token}`,
                      },
                    });
                    if (response.status === 200) {
                      setSuggestions(response.data);
                      console.log('Search suggestions:', response.data, suggestions);
                      return;
                    } else {
                      console.error('Failed to fetch search suggestions:', response.statusText);
                      return;
                    }
                  } catch (error) {
                    console.error('Error fetching search suggestions:', error);
                  }
                }}
                onBlur={() => setTimeout(() => setSuggestions(null), 200)}
                onSubmitEditing={() => {
                  if (searchQuery.length === 0) return;
                  search();
                }}
                returnKeyType="search"
              />
            </View>

            {/* Suggestions Dropdown */}
            {suggestions !== null && (
              <View className="absolute top-full w-full mt-2 bg-white/90 dark:bg-black/90 backdrop-blur-md border border-white/50 dark:border-gray-500 rounded-2xl shadow-lg z-50">
                {suggestions.length > 0 ? (
                  suggestions.map((suggestion, idx) => (
                    <TouchableOpacity
                      key={suggestion.product_id || idx}
                      className="px-5 py-4 border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                      onPress={() => {
                        setSearchQuery(suggestion.name);
                        setSuggestions(null);
                        search();
                        setTarget(suggestion);
                      }}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text className="font-semibold text-gray-900 dark:text-white text-base">
                            {suggestion.name}
                          </Text>
                          <Text className="text-gray-500 dark:text-gray-400 text-sm">
                            {suggestion.supermarket || 'Unknown Store'}
                          </Text>
                        </View>
                        <Text className="font-bold text-green-600 dark:text-green-400 text-base">
                          {suggestion.price}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View className="px-5 py-4">
                    <Text className="text-gray-500 dark:text-gray-400 text-center">No suggestions found</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Conditional Content: Search Results OR Default Content */}
        {searchResult !== null && Array.isArray(searchResult) && searchResult.length > 0 ? (
          <View className="px-6 py-4">
            <View className='flex-row items-center justify-between mb-4'>
              <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Search Results
              </Text>
              <Button onPress={() => {
                setSearchResult(null);
                setSearchQuery('');
              }} className="mb-4 bg-gray-200 dark:bg-gray-700 rounded-lg px-4 py-2">
                <AntDesign name="back" size={24} color={isDark ? "white" : "black"} />
              </Button>
            </View>
            <View className="space-y-4 gap-2">
              {searchResult.map((item, idx) => (
                <Pressable
                  key={idx}
                  className="flex-row items-center justify-between shadow-lg backdrop-blur-lg bg-gray-100 dark:bg-gray-700 rounded-xl p-4 py-4"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                  onPress={() => setTarget(item)}
                >
                  {/* Item Image */}
                  <View className="w-16 h-16 bg-gray-100 dark:bg-gray-600 rounded-lg items-center justify-center mr-4">
                    <Image
                      source={{ uri: item.image_url || '/placeholder.svg?height=64&width=64' }}
                      className="w-12 h-12"
                      resizeMode="contain"
                    />
                  </View>

                  {/* Item Details */}
                  <View className="flex-1">
                    <Text className="font-bold text-gray-900 dark:text-white text-base mb-1">
                      {item.name}
                    </Text>
                    <Text className="text-gray-900 dark:text-gray-300 text-sm">{item.supermarket || 'Unknown Store'}</Text>
                  </View>

                  <View className="items-end">
                    <Text className="text-green-600 dark:text-green-400 font-bold text-lg">
                      {item.price}
                    </Text>
                  </View>
                </Pressable>
              ))}
              
              {/* Loading indicator for search results */}
              {isFetchingMore && hasMoreSearchResults && (
                <View className="py-4 items-center">
                  <ActivityIndicator size="small" color="#10B981" />
                  <Text className="text-gray-500 dark:text-gray-400 text-sm mt-2">Loading more results...</Text>
                </View>
              )}
              
              {!hasMoreSearchResults && searchResult.length > 0 && (
                <View className="py-4 items-center">
                  <Text className="text-gray-500 dark:text-gray-400 text-sm">No more search results</Text>
                </View>
              )}
            </View>
          </View>
        ) : itemDisplay !== null ? (
          /* Default Content - Hot Items and Categories */
          <View>
            <View>
              {/* Hot Items / Promotions Section */}
              <View className="px-6">
                <View className="flex-row items-center">
                  <Flame size={24} color="#F97316" />
                  <Text className="text-xl font-bold text-gray-900 dark:text-white ml-2">
                    Hot Deals & Promotions
                  </Text>
                  <Tag size={20} color="#F97316" className="ml-2" />
                </View>
              </View>
            </View>
            <View className="px-6 py-2">
              <ScrollView
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                className="flex-row"
              >
                {promotions === null ? (
                  <Text className="text-gray-500 dark:text-gray-400">No Promotions Available</Text>
                ) : (
                  promotions.map((item, idx) => (
                    <Pressable
                      key={idx}
                      className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-lg backdrop-blur-lg w-44 h-72 mr-4"
                      style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.15,
                        shadowRadius: 8,
                        elevation: 6,
                      }}
                      onPress={() => setTarget(item)}
                    >
                      {/* Item Image */}
                      <View className="w-full h-28 bg-gray-100 dark:bg-gray-700 rounded-lg items-center justify-center mb-2">
                        <Image
                          source={{ uri: item.image_url || "/placeholder.svg?height=96&width=96" }}
                          className="w-28 h-28"
                          resizeMode="contain"
                        />
                      </View>

                      {/* Item Details */}
                      <Text className="font-semibold text-gray-900 dark:text-white text-sm mb-2 text-center" numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text className="text-gray-500 dark:text-gray-400 text-xs mb-2 text-center" numberOfLines={1}>
                        {item.supermarket || 'Unknown Store'}
                      </Text>

                      {/* Promotion Description Badge */}
                      {item.promotion_description && (
                        <View className="bg-red-500 dark:bg-red-600 rounded-lg px-2 py-1 mb-2">
                          <Text className="text-white text-xs font-bold text-center" numberOfLines={3}>
                            {item.promotion_description}
                          </Text>
                        </View>
                      )}

                      {/* Price and End Date */}
                      <Text className="text-green-600 dark:text-green-400 font-bold text-sm text-center mb-1">
                        {item.price}
                      </Text>
                      {item.promotion_end_date_text && (
                        <Text className="text-gray-400 dark:text-gray-500 text-xs text-center" numberOfLines={2}>
                          Ends: {item.promotion_end_date_text}
                        </Text>
                      )}
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </View>
            <View className="px-6">
            </View>
            <View className="space-y-4 gap-2 p-4">
              {itemDisplay.map((item, idx) => (
                <Pressable
                  key={idx}
                  className="flex-row items-center justify-between shadow-lg backdrop-blur-lg bg-gray-100 dark:bg-gray-700 rounded-xl p-4 py-4"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                  onPress={() => setTarget(item)}
                >
                  {/* Item Image */}
                  <View className="w-16 h-16 bg-gray-100 dark:bg-gray-600 rounded-lg items-center justify-center mr-4">
                    <Image
                      source={{ uri: item.image_url || '/placeholder.svg?height=64&width=64' }}
                      className="w-12 h-12"
                      resizeMode="contain"
                    />
                  </View>

                  {/* Item Details */}
                  <View className="flex-1">
                    <Text className="font-bold text-gray-900 dark:text-white text-base mb-1">
                      {item.name}
                    </Text>
                    <Text className="text-gray-900 dark:text-gray-300 text-sm">{item.supermarket || 'Unknown Store'}</Text>
                  </View>

                  <View className="items-end">
                    <Text className="text-green-600 dark:text-green-400 font-bold text-lg">
                      {item.price}
                    </Text>
                  </View>
                </Pressable>
              ))}
              
              {/* Loading indicator for catalog items */}
              {isFetchingMore && hasMoreItems && (
                <View className="py-4 items-center">
                  <ActivityIndicator size="small" color="#10B981" />
                  <Text className="text-gray-500 dark:text-gray-400 text-sm mt-2">Loading more items...</Text>
                </View>
              )}
              
              {!hasMoreItems && itemDisplay.length > 0 && (
                <View className="py-4 items-center">
                  <Text className="text-gray-500 dark:text-gray-400 text-sm">No more items to load</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View>
            <Text className="text-gray-500 dark:text-gray-400 text-center mt-10">
              Item not staged
            </Text>
          </View>
        )}
      </ScrollView>
      
      {/* Modal remains the same */}
      <Modal
        visible={target !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setTarget(null)}
      >
        <TouchableWithoutFeedback onPress={() => setTarget(null)}>
          <View className="flex-1 justify-center items-center bg-black/50">
            <TouchableWithoutFeedback>
              <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 w-10/12 max-h-3/4 shadow-lg">
                {/* Item Image */}
                <View className="w-full h-40 bg-gray-100 dark:bg-gray-700 rounded-xl mb-3 items-center justify-center">
                  <Image
                    source={{ uri: target?.image_url || '/placeholder.svg?height=120&width=120' }}
                    className="w-40 h-40"
                    resizeMode="contain"
                  />
                </View>

                {/* Item Details */}
                <Text className="text-lg font-bold text-gray-900 dark:text-white mb-1" numberOfLines={2}>
                  {target?.name}
                </Text>

                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-green-600 dark:text-green-400 font-bold text-base">{target?.price}</Text>
                  <Text className="text-gray-500 dark:text-gray-400 text-sm">Quantity: {target?.quantity || 1}</Text>
                </View>

                {/* Buttons */}
                <View className="flex-row justify-between">
                  <TouchableOpacity
                    className="bg-green-600 dark:bg-green-500 rounded-lg px-3 py-2 flex-1 mr-2"
                    onPress={() => {
                      setShowAddToList(true);
                    }}
                  >
                    <Text className="text-white text-center text-sm font-semibold">Add Item</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-blue-600 dark:bg-blue-500 rounded-lg px-3 py-2 flex-1 ml-2"
                    onPress={async () => {
                      const supported = await Linking.canOpenURL(target?.product_url || '');
                      if (supported) {
                        await Linking.openURL(target?.product_url || '');
                      } else {
                        console.error('Unable to open URL:', target?.product_url);
                      }
                    }}
                  >
                    <Text className="text-white text-center text-sm font-semibold">Go to Link</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <Modal 
        visible={showAddToList}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddToList(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowAddToList(false)}>
          <View className="flex-1 justify-center items-center bg-black/50">
            <TouchableWithoutFeedback>
              <View
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 w-10/12 max-h-3/4 shadow-lg"
                style={{
                  width: '80%', // 80% of the screen width
                  height: '60%', // 60% of the screen height
                  padding: 16,
                  borderRadius: 16,
                }}
              >
                  <Text className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    Add to Grocery List
                  </Text>
                <ScrollView className='flex-1' showsVerticalScrollIndicator={false}>
                  
                  {/* Create New List Option */}
                  <Pressable 
                    onPress={() => setShowCreateNewList(!showCreateNewList)}
                    className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border-2 border-blue-200 dark:border-blue-600 border-dashed"
                  >
                    <Text className="text-blue-600 dark:text-blue-400 font-bold text-base text-center">
                      {showCreateNewList ? '✕ Cancel' : '+ Create New List'}
                    </Text>
                  </Pressable>

                  {/* New List Name Input */}
                  {showCreateNewList && (
                    <View className="mb-4">
                      <Text className="text-gray-900 dark:text-white font-bold mb-2">
                        New List Name
                      </Text>
                      <TextInput
                        className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white mb-3"
                        placeholder="Enter list name"
                        placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                        value={newListName}
                        onChangeText={setNewListName}
                      />
                      <TouchableOpacity
                        className="bg-blue-600 dark:bg-blue-500 rounded-lg px-4 py-2"
                        onPress={async () => {
                          try {
                            // Check if session and access token exist
                            if (!session?.access_token) {
                              console.error('No access token found. Please log in again.');
                              return;
                            }

                            if (!newListName.trim()) {
                              console.error('Please enter a list name');
                              return;
                            }

                            const parsedAmount = parseFloat(amountPurchased);
                            if (isNaN(parsedAmount) || parsedAmount <= 0) {
                              console.error('Invalid amount purchased');
                              return;
                            }

                            const newListRequest: AddItemRequestBody = {
                              list_name: newListName.trim(),
                              product_id: target?.product_id || '',
                              amount: parsedAmount,
                            };

                            console.log('Creating new list with item:', newListRequest); // Debug log

                            const response = await axios.post(
                              `${backend_url}/lists/add-item`,
                              newListRequest,
                              {
                                headers: {
                                  Authorization: `Bearer ${session.access_token}`,
                                  'Content-Type': 'application/json',
                                },
                              }
                            );

                            console.log('Response status:', response.status); // Debug log
                            console.log('Response data:', response.data); // Debug log

                            if (response.status === 200 || response.status === 201) {
                              console.log('New list created and item added successfully');
                              // Reset fields after successful creation
                              setAmountPurchased('1');
                              setNewListName('');
                              setShowCreateNewList(false);
                              setTarget(null);
                              setShowAddToList(false);
                              
                              // Trigger grocery list refresh
                              setRefreshVersion((prev) => prev + 1);
                            } else {
                              console.error('Failed to create new list:', response.statusText);
                            }
                          } catch (error: any) {
                            console.error('Error creating new list:', error);
                            console.error('Actual error:', error.response?.data || error.message);
                          }
                        }}
                      >
                        <Text className="text-white text-center font-semibold">Create List & Add Item</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {groceryListHistory !== null && groceryListHistory.length > 0 ? (
                    groceryListHistory
                      .filter((list) => list.list_status === 'incomplete')
                      .map((list, index) => (
                      <Pressable onPress={async () => {
                        try {
                          // Check if session and access token exist
                          if (!session?.access_token) {
                            console.error('No access token found. Please log in again.');
                            return;
                          }

                          const parsedAmount = parseFloat(amountPurchased);
                          if (isNaN(parsedAmount) || parsedAmount <= 0) {
                            console.error('Invalid amount purchased');
                            return;
                          }

                          const updatedList: AddItemRequestBody = {
                            list_id: list.list_id,
                            product_id: target?.product_id || '',
                            amount: parsedAmount,
                          };

                          console.log('Adding item to list:', updatedList); // Debug log

                          const response = await axios.post(
                            `${backend_url}/lists/add-item`,
                            updatedList,
                            {
                              headers: {
                                Authorization: `Bearer ${session.access_token}`,
                                'Content-Type': 'application/json',
                              },
                            }
                          );

                          console.log('Response status:', response.status); // Debug log
                          console.log('Response data:', response.data); // Debug log

                          if (response.status === 200 || response.status === 201) {
                            console.log('Item added to grocery list successfully');
                            // Reset amount after successful addition
                            setAmountPurchased('1');
                            setTarget(null);
                            setShowAddToList(false);
                            
                            // Trigger grocery list refresh
                            setRefreshVersion((prev) => prev + 1);
                          } else {
                            console.error('Failed to add item to grocery list:', response.statusText);
                          }
                        } catch (error: any) {
                          console.error('Error adding item to grocery list:', error);
                          console.error('Actual error:', error.response?.data || error.message);
                        }
                      }} key={index} className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                        <Text className="text-gray-900 dark:text-white font-bold text-base mb-1">
                          {list.title}
                        </Text>
                        <Text className="text-gray-500 dark:text-gray-400 text-sm">
                          {list.metadata || 'No description'}
                        </Text>
                      </Pressable>
                    ))
                  ) : (
                    <Text className="text-gray-500 dark:text-gray-400 text-center mt-10">
                      No grocery lists found
                    </Text>
                  )}
                </ScrollView>

                {/* Amount Purchased Input */}
                <View className="mt-4">
                  <Text className="text-gray-900 dark:text-white font-bold mb-2">
                    Amount Purchased
                  </Text>
                  <TextInput
                    className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                    placeholder="Enter amount"
                    placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                    keyboardType="numeric"
                    value={amountPurchased}
                    onChangeText={setAmountPurchased}
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export default GrocerySearch;
