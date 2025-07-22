import React, { useState } from 'react';
import { Alert, TouchableOpacity, Animated, View, TextInput, Dimensions } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { ScrollView } from 'react-native';
import { Heading } from '@/components/ui/heading';
import { useSession } from '@/context/authContext';
import { useGroceryContext } from '@/context/groceryContext';
import { router } from 'expo-router';
import { backend_url } from '@/lib/api';
import {
  AiPromptRequestBody,
  GroceryMetadataTitleOutput,
} from '@/app/(tabs)/interface';
import AntDesign from '@expo/vector-icons/AntDesign';
import { DropdownSelector } from '@/components/DropDownSelector';
import { SUPERMARKET, ALLOWED_SUPERMARKETS } from '@/app/(tabs)/interface';
import { useColorScheme } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';

// Main Grocery Input Component
const GroceryInputPage = () => {
  const [groceryTextArea, setGroceryTextArea] = useState('');
  const [selectedGroceryShop, setSelectedGroceryShop] = useState(ALLOWED_SUPERMARKETS.map(x => x));
  const [selectGroceryShopAlert, setSelectGroceryShopAlert] = useState(false);

  const { session } = useSession();
  const { setIsLoading, setGroceryRefinement, setGroceryShop, isLoading } =
    useGroceryContext();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Get screen dimensions for textarea height
  const { height: screenHeight } = Dimensions.get('window');
  const textareaHeight = screenHeight * 0.3; // 30% of screen height

  const postData = async () => {
    try {
      if (groceryTextArea.length === 0) {
        Alert.alert('Error', 'Please enter some grocery items.');
        return;
      }

      if (selectedGroceryShop.length === 0) {
        setSelectGroceryShopAlert(true);
        Alert.alert('Error', 'Please select at least one grocery shop.');
        return;
      }

      setIsLoading(true);
      const req: AiPromptRequestBody = {
        message: groceryTextArea,
        supermarketFilter: {
          exclude: ALLOWED_SUPERMARKETS.filter(
            (x) => !selectedGroceryShop.includes(x),
          ),
        },
      };

      const response = await fetch(`${backend_url}/lists/generate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req),
      });

      const output: GroceryMetadataTitleOutput = await response.json();

      if (response.ok && output.title !== '!@#$%^') {
        setGroceryRefinement(output);
        setGroceryShop(selectedGroceryShop);
        setIsLoading(false);
        router.push('/groceryRefinement');
      } else if (response.status === 403) {
        Alert.alert(
          'Error',
          'You are not authorized to perform this action. Please log in again.',
        );
        setIsLoading(false);
      } else {
        Alert.alert('Error', 'Your Grocery List Contains Invalid Items!');
        setIsLoading(false);
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Error',
        'An error occurred while generating your grocery list.',
      );
      setIsLoading(false);
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
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center', // Center vertically
          alignItems: 'center', // Center horizontally
          paddingHorizontal: 24,
          paddingVertical: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Centered Content Container */}
        <View
          className="w-full max-w-md"
          style={{
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Header Section */}
          <View className="items-center mb-8 gap-4">
            <Heading className="text-4xl font-bold text-center text-gray-900 dark:text-white">
              Create Grocery List
            </Heading>
            <View className="items-center gap-1">
              <Text className="text-sm text-gray-700 dark:text-white/80 text-center">
                Unsure of what groceries?
              </Text>
              <Text className="text-sm text-gray-700 dark:text-white/80 text-center">
                Describe it and we will do the work!
              </Text>
            </View>
          </View>

          {/* Input Form Section */}
          <View className="w-full">
            {/* Grocery Text Area */}
            <View className="w-full gap-2 mb-4">
              <Text className="text-lg font-medium text-gray-800 dark:text-white text-left">
                What groceries do you need?
              </Text>
              <TextInput
                style={{
                  height: textareaHeight,
                  backgroundColor: isDark ? 'rgba(55, 65, 81, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(75, 85, 99, 1)' : 'rgba(209, 213, 219, 1)',
                  padding: 16,
                  fontSize: 16,
                  color: isDark ? 'white' : 'rgb(17, 24, 39)',
                  textAlignVertical: 'top',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}
                placeholder="Enter groceries or description..."
                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                value={groceryTextArea}
                onChangeText={setGroceryTextArea}
                multiline
              />
            </View>

            {/* Grocery Shops Selector */}
            <View className="w-full gap-2 mb-8">
              <Text className="text-lg font-medium text-gray-800 dark:text-white text-left">
                Select Grocery Shops
              </Text>
              <DropdownSelector
                title="Select Grocery Shops"
                items={SUPERMARKET}
                selectedItems={selectedGroceryShop}
                onSelectionChange={(e) => setSelectedGroceryShop(e as ("FairPrice" | "Cold Storage" | "Sheng Siong")[])}
              />
            </View>

            {/* Alert Message */}
            {selectGroceryShopAlert && (
              <Box className="p-4 bg-red-50 dark:bg-red-900/90 border border-red-200 dark:border-red-700 shadow-sm backdrop-blur-md rounded-xl w-full">
                <HStack className="items-center justify-center" space="sm">
                  <AntDesign
                    name="exclamationcircle"
                    size={20}
                    color="#ef4444"
                  />
                  <Text className="text-red-600 dark:text-red-400 font-medium">
                    Please select a grocery shop
                  </Text>
                </HStack>
              </Box>
            )}

            {/* Generate Button */}
            <TouchableOpacity
              onPress={postData}
              disabled={isLoading}
              activeOpacity={0.8}
              style={{
                opacity: isLoading ? 0.5 : 1,
                width: '100%',
              }}
            >
              <LinearGradient
                colors={
                  isDark
                    ? ['#4f46e5', '#7c3aed', '#db2777']
                    : ['#6366f1', '#8b5cf6', '#ec4899']
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
                  {isLoading ? (
                    <Text className="text-white font-bold text-lg">
                      Generating...
                    </Text>
                  ) : (
                    <>
                      <AntDesign name="plus" size={20} color="white" />
                      <Text className="text-white font-bold text-lg">
                        Generate Grocery List!
                      </Text>
                    </>
                  )}
                </HStack>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default GroceryInputPage;
