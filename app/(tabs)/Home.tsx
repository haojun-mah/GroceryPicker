import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import { ScrollView } from 'react-native';
import { VStack } from '@/components/ui/vstack';
// ...other imports

const HomePage = () => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <LinearGradient
            colors={isDark 
                ? ['#374151', '#4b5563', '#6b7280'] // Subtle gray gradient for dark mode
                : ['#f3f4f6', '#e5e7eb', '#d1d5db'] // Subtle gray gradient for light mode
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
        >
            <ScrollView 
                className="flex-1"
                contentContainerStyle={{ flexGrow: 1 }}
                style={{ backgroundColor: 'transparent' }} // Make ScrollView transparent
            >
                <VStack className="flex-1 p-6" space="lg">
                    {/* Your existing Home page content */}
                    {/* Just remove any background color classes from containers */}
                </VStack>
            </ScrollView>
        </LinearGradient>
    );
};

export default HomePage;