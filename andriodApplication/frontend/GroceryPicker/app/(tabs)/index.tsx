import { router } from 'expo-router';
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Button } from 'react-native-paper';


export default function HomePage() {
  return (
    <ScrollView>
      <View>
        <Text className='text-cyan-500'>
          hello
        </Text>
        <Button onPress={() => router.push("./groceryInput")}>To Grocery Input</Button>
      </View>
    </ScrollView>
 );
}
