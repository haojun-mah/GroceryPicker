"use client"

import { useState, useMemo } from "react"
import { View, Text, TextInput, ScrollView, TouchableOpacity, FlatList, Image } from "react-native"
import { Search, Star, Flame, Tag } from "lucide-react-native"

// Mock grocery data
const groceries = [
  {
    id: 1,
    name: "Organic Bananas",
    category: "Fruits",
    price: 2.99,
    unit: "lb",
    inStock: true,
    rating: 4.5,
    brand: "Fresh Farms",
    description: "Sweet and ripe organic bananas",
    isHot: false,
    discount: 0,
  },
  {
    id: 2,
    name: "Whole Milk",
    category: "Dairy",
    price: 3.49,
    unit: "gallon",
    inStock: true,
    rating: 4.2,
    brand: "Dairy Best",
    description: "Fresh whole milk from local farms",
    isHot: true,
    discount: 15,
  },
  {
    id: 3,
    name: "Sourdough Bread",
    category: "Bakery",
    price: 4.99,
    unit: "loaf",
    inStock: true,
    rating: 4.8,
    brand: "Artisan Bakery",
    description: "Freshly baked sourdough bread",
    isHot: true,
    discount: 20,
  },
  {
    id: 4,
    name: "Free Range Eggs",
    category: "Dairy",
    price: 5.99,
    unit: "dozen",
    inStock: true,
    rating: 4.6,
    brand: "Happy Hens",
    description: "Farm fresh free range eggs",
    isHot: false,
    discount: 0,
  },
  {
    id: 5,
    name: "Organic Spinach",
    category: "Vegetables",
    price: 3.99,
    unit: "bag",
    inStock: false,
    rating: 4.3,
    brand: "Green Valley",
    description: "Fresh organic baby spinach",
    isHot: false,
    discount: 0,
  },
  {
    id: 6,
    name: "Greek Yogurt",
    category: "Dairy",
    price: 6.49,
    unit: "32oz",
    inStock: true,
    rating: 4.7,
    brand: "Mediterranean",
    description: "Creamy Greek yogurt with probiotics",
    isHot: true,
    discount: 25,
  },
  {
    id: 7,
    name: "Avocados",
    category: "Fruits",
    price: 1.99,
    unit: "each",
    inStock: true,
    rating: 4.4,
    brand: "Tropical Fresh",
    description: "Ripe Hass avocados",
    isHot: true,
    discount: 10,
  },
  {
    id: 8,
    name: "Chicken Breast",
    category: "Meat",
    price: 8.99,
    unit: "lb",
    inStock: true,
    rating: 4.5,
    brand: "Farm Fresh",
    description: "Boneless skinless chicken breast",
    isHot: false,
    discount: 0,
  },
  {
    id: 9,
    name: "Pasta",
    category: "Pantry",
    price: 2.49,
    unit: "box",
    inStock: true,
    rating: 4.1,
    brand: "Italian Classic",
    description: "Premium durum wheat pasta",
    isHot: true,
    discount: 30,
  },
  {
    id: 10,
    name: "Olive Oil",
    category: "Pantry",
    price: 12.99,
    unit: "bottle",
    inStock: true,
    rating: 4.9,
    brand: "Mediterranean Gold",
    description: "Extra virgin olive oil",
    isHot: false,
    discount: 0,
  },
  {
    id: 11,
    name: "Tomatoes",
    category: "Vegetables",
    price: 3.49,
    unit: "lb",
    inStock: true,
    rating: 4.2,
    brand: "Garden Fresh",
    description: "Vine-ripened tomatoes",
    isHot: false,
    discount: 0,
  },
  {
    id: 12,
    name: "Salmon Fillet",
    category: "Seafood",
    price: 15.99,
    unit: "lb",
    inStock: true,
    rating: 4.8,
    brand: "Ocean Fresh",
    description: "Wild-caught Atlantic salmon",
    isHot: true,
    discount: 15,
  },
]

const GrocerySearch = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Filter groceries based on search query
  const filteredGroceries = useMemo(() => {
    return groceries.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSearch
    })
  }, [searchQuery])

  // Get hot/promotional items
  const hotItems = useMemo(() => {
    return groceries.filter((item) => item.isHot && item.discount > 0)
  }, [])

  // Get search suggestions
  const suggestions = useMemo(() => {
    if (!searchQuery) return []
    return groceries
      .filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.brand.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .slice(0, 5)
  }, [searchQuery])

  // Group groceries by category for display
  const groupedGroceries = useMemo(() => {
    const groups = {}
    filteredGroceries.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = []
      }
      groups[item.category].push(item)
    })
    return groups
  }, [filteredGroceries])

  const handleSuggestionPress = (suggestion) => {
    setSearchQuery(suggestion.name)
    setShowSuggestions(false)
  }

  const calculateDiscountedPrice = (price, discount) => {
    return price - (price * discount) / 100
  }

  const renderHotItem = ({ item }) => (
    <View className="bg-white rounded-2xl p-4 mr-4 shadow-sm border border-orange-100 w-48">
      <View className="relative">
        <View className="w-full h-32 bg-gray-100 rounded-xl mb-3 items-center justify-center">
          <Image source={{ uri: `/placeholder.svg?height=120&width=120` }} className="w-20 h-20" resizeMode="contain" />
        </View>
        <View className="absolute top-2 right-2 bg-red-500 rounded-full px-2 py-1">
          <Text className="text-white text-xs font-bold">{item.discount}% OFF</Text>
        </View>
      </View>

      <Text className="font-bold text-gray-900 text-sm mb-1" numberOfLines={2}>
        {item.name}
      </Text>
      <Text className="text-gray-500 text-xs mb-2">{item.brand}</Text>

      <View className="flex-row items-center mb-2">
        <Star size={12} color="#FCD34D" fill="#FCD34D" />
        <Text className="text-xs text-gray-600 ml-1">{item.rating}</Text>
      </View>

      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-green-600 font-bold">
            ${calculateDiscountedPrice(item.price, item.discount).toFixed(2)}
          </Text>
          <Text className="text-gray-400 text-xs line-through">${item.price}</Text>
        </View>
        <TouchableOpacity className="bg-orange-500 rounded-lg px-3 py-1">
          <Text className="text-white text-xs font-semibold">Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderGroceryItem = ({ item }) => (
    <View className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100">
      <View className="flex-row">
        <View className="w-20 h-20 bg-gray-100 rounded-lg mr-4 items-center justify-center">
          <Image source={{ uri: `/placeholder.svg?height=80&width=80` }} className="w-16 h-16" resizeMode="contain" />
        </View>

        <View className="flex-1">
          <View className="flex-row items-start justify-between mb-2">
            <View className="flex-1">
              <Text className="font-bold text-gray-900 text-base mb-1">{item.name}</Text>
              <Text className="text-gray-500 text-sm">{item.brand}</Text>
              <Text className="text-gray-400 text-xs mt-1" numberOfLines={2}>
                {item.description}
              </Text>
            </View>

            <View className="items-end ml-2">
              {item.isHot && item.discount > 0 ? (
                <View>
                  <Text className="text-green-600 font-bold text-lg">
                    ${calculateDiscountedPrice(item.price, item.discount).toFixed(2)}
                  </Text>
                  <Text className="text-gray-400 text-sm line-through">${item.price}</Text>
                  <View className="bg-red-100 rounded px-2 py-1 mt-1">
                    <Text className="text-red-600 text-xs font-semibold">{item.discount}% OFF</Text>
                  </View>
                </View>
              ) : (
                <Text className="text-green-600 font-bold text-lg">${item.price}</Text>
              )}
              <Text className="text-gray-500 text-sm">/{item.unit}</Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Star size={14} color="#FCD34D" fill="#FCD34D" />
              <Text className="text-sm text-gray-600 ml-1">{item.rating}</Text>
              <View className={`ml-3 px-2 py-1 rounded ${item.inStock ? "bg-green-100" : "bg-red-100"}`}>
                <Text className={`text-xs font-medium ${item.inStock ? "text-green-700" : "text-red-700"}`}>
                  {item.inStock ? "In Stock" : "Out of Stock"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              className={`rounded-lg px-4 py-2 ${item.inStock ? "bg-green-600" : "bg-gray-300"}`}
              disabled={!item.inStock}
            >
              <Text className="text-white text-sm font-semibold">Add to List</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  )

  return (
    <View className="flex-1 bg-gradient-to-br from-green-50 to-blue-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-white pt-12 pb-6 px-6 shadow-sm">
          <View className="mb-6">
            <Text className="text-3xl font-bold text-gray-900 mb-2">FreshMart Grocery</Text>
            <Text className="text-gray-600 text-base">Find fresh groceries delivered to your door</Text>
          </View>

          {/* Enhanced Search Bar */}
          <View className="relative">
            <View className="relative bg-gray-50 rounded-2xl border-2 border-gray-200 focus:border-green-500">
              <View className="absolute left-5 top-1/2 transform -translate-y-1/2 z-10">
                <Search size={24} color="#9CA3AF" />
              </View>
              <TextInput
                className="pl-14 pr-6 py-5 text-lg text-gray-900 bg-transparent rounded-2xl"
                placeholder="Search for groceries, brands, or categories..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
            </View>

            {/* Search Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <View className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-lg mt-2 z-50">
                {suggestions.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion.id}
                    className="px-5 py-4 border-b border-gray-100 last:border-b-0"
                    onPress={() => handleSuggestionPress(suggestion)}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="font-semibold text-gray-900 text-base">{suggestion.name}</Text>
                        <Text className="text-gray-500 text-sm">
                          {suggestion.brand} • {suggestion.category}
                        </Text>
                      </View>
                      <Text className="font-bold text-green-600 text-base">${suggestion.price}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Hot Items / Promotions Section */}
        <View className="px-6 py-6">
          <View className="flex-row items-center mb-4">
            <Flame size={24} color="#F97316" />
            <Text className="text-xl font-bold text-gray-900 ml-2">Hot Deals & Promotions</Text>
            <Tag size={20} color="#F97316" className="ml-2" />
          </View>

          <FlatList
            data={hotItems}
            renderItem={renderHotItem}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 24 }}
          />
        </View>

        {/* Results Summary */}
        <View className="px-6 py-2">
          <Text className="text-gray-600 text-base">
            Showing {filteredGroceries.length} results
            {searchQuery && ` for "${searchQuery}"`}
          </Text>
        </View>

        {/* Grocery Items by Category */}
        <View className="px-6 pb-6">
          {Object.entries(groupedGroceries).map(([category, items]) => (
            <View key={category} className="mb-6">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-xl font-bold text-gray-900">{category}</Text>
                <View className="bg-gray-100 rounded-full px-3 py-1">
                  <Text className="text-gray-600 text-sm font-medium">{items.length} items</Text>
                </View>
              </View>

              <FlatList
                data={items}
                renderItem={renderGroceryItem}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
              />
            </View>
          ))}
        </View>

        {/* No Results */}
        {filteredGroceries.length === 0 && (
          <View className="items-center py-12 px-6">
            <View className="mb-4">
              <Search size={64} color="#D1D5DB" />
            </View>
            <Text className="text-lg font-semibold text-gray-900 mb-2 text-center">No groceries found</Text>
            <Text className="text-gray-500 text-center">
              Try adjusting your search terms to find what you're looking for.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

export default GrocerySearch
