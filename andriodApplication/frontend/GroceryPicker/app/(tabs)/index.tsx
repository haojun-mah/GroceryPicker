import React from 'react';
import { View } from 'react-native';
import { Layout, Text } from '@ui-kitten/components';

export default function HomePage() {
  return (
    <View className='flex-1 items-center justify-center bg-blue-500'>
        <Layout className="flex-1 items-center justify-center bg-blue-500">
        <Text category="h1">test</Text>
        </Layout>
    </View>
 );
}
