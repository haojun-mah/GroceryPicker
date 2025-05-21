import React from 'react';
import { Slot } from 'expo-router';
import { Layout, Text } from '@ui-kitten/components';

export default function TabsLayout() {
  return (
    <Layout className='flex'>
      <Text category="h5" className='flex align-middle justify-center text-cyan-400'>
        Test header
      </Text>
      <Slot />
    </Layout>
  );
}
