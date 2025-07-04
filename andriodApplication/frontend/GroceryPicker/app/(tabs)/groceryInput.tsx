import React, { useState } from 'react';
import { Alert } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Input, InputField } from '@/components/ui/input';
import { Button, ButtonText } from '@/components/ui/button';
import { ScrollView } from 'react-native';
import { Heading } from '@/components/ui/heading';
import { useSession } from '@/context/authContext';
import { useGroceryContext } from '@/context/groceryContext';
import { router } from 'expo-router';
import { backend_url } from '@/lib/api';
import { AiPromptRequestBody, GroceryMetadataTitleOutput } from '@/app/(tabs)/interface';
import AntDesign from '@expo/vector-icons/AntDesign';
import { DropdownSelector } from '@/components/DropDownSelector';
import { SUPERMARKET, ALLOWED_SUPERMARKETS } from '@/app/(tabs)/interface';
import { useColorScheme } from 'nativewind';


// Main Grocery Input Component
const GroceryInputPage = () => {
    const [groceryTextArea, setGroceryTextArea] = useState('');
    const [selectedGroceryShop, setSelectedGroceryShop] = useState(["FairPrice"]);
    const [selectGroceryShopAlert, setSelectGroceryShopAlert] = useState(false);

    const { session } = useSession();
    const { setIsLoading, setGroceryRefinement, setGroceryShop, isLoading } = useGroceryContext();
    const { colorScheme } = useColorScheme();

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
                        (x) => !selectedGroceryShop.includes(x)
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
                Alert.alert('Error', 'You are not authorized to perform this action. Please log in again.');
                setIsLoading(false);
            } else {
                Alert.alert('Error', 'Your Grocery List Contains Invalid Items!');
                setIsLoading(false);
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'An error occurred while generating your grocery list.');
            setIsLoading(false);
        }
    };

    return (
        <ScrollView 
            className="flex-1 bg-[#667eea] dark:bg-[#1f2937]" 
            contentContainerStyle={{ flexGrow: 1 }}
        >
            <VStack className="flex-1 p-6 justify-center" space="lg">
                {/* Header */}
                <VStack space="md" className="items-center">
                    <Heading className="text-4xl font-bold text-center text-white dark:text-gray-100">
                        Create Grocery List
                    </Heading>
                    <VStack space="xs" className="items-center">
                        <Text className="text-sm text-gray-300 dark:text-gray-300 text-center">
                            Unsure of what groceries?
                        </Text>
                        <Text className="text-sm text-gray-300 dark:text-gray-300 text-center">
                            Describe it and we will do the work!
                        </Text>
                    </VStack>
                </VStack>

                {/* Input Form */}
                <VStack space="lg" className="w-full">
                    {/* Grocery Text Area */}
                    <VStack space="sm">
                        <Text className="text-lg font-medium text-gray-100 dark:text-white">
                            What groceries do you need?
                        </Text>
                        <Input className='min-h-32 bg-white dark:bg-gray-700 rounded-xl shadow-sm backdrop-blur-md border-gray-200 dark:border-gray-700'>
                            <InputField
                                placeholder="Enter groceries or description..."
                                value={groceryTextArea}
                                onChangeText={setGroceryTextArea}
                                multiline
                                textAlignVertical="top"
                                className="text-black dark:text-gray-100 p-4"
                            />
                        </Input>
                    </VStack>

                    {/* Grocery Shops Selector */}
                    <VStack space="sm">
                        <Text className="text-lg font-medium text-white dark:text-gray-100">
                            Select Grocery Shops
                        </Text>
                        <DropdownSelector
                            title="Select Grocery Shops"
                            items={SUPERMARKET}
                            selectedItems={selectedGroceryShop}
                            onSelectionChange={setSelectedGroceryShop}
                        />
                    </VStack>

                    {/* Alert Message */}
                    {selectGroceryShopAlert && (
                        <Box className="p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 shadow-sm backdrop-blur-md rounded-xl">
                            <HStack className="items-center" space="sm">
                                <AntDesign name="exclamationcircle" size={20} color="#ef4444" />
                                <Text className="text-red-600 dark:text-white font-medium">
                                    Please select a grocery shop
                                </Text>
                            </HStack>
                        </Box>
                    )}

                    {/* Generate Button */}
                    <Button
                        onPress={postData}
                        disabled={isLoading}
                        className="h-14 bg-blue-600 hover:bg-blue-700 active:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 dark:active:bg-blue-600 rounded-xl shadow-lg disabled:opacity-50"
                    >
                        <HStack className="items-center" space="sm">
                            {isLoading ? (
                                <>
                                    <Text className="text-white font-bold text-lg">
                                        Generating...
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <AntDesign name="plus" size={20} color="white" />
                                    <ButtonText className="text-white font-bold text-lg">
                                        Generate Grocery List!
                                    </ButtonText>
                                </>
                            )}
                        </HStack>
                    </Button>

                </VStack>
            </VStack>
        </ScrollView>
    );
};

export default GroceryInputPage;