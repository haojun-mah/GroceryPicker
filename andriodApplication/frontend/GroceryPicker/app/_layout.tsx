import { Redirect, Stack } from 'expo-router';
import React from 'react';
import '../global.css';
import { SessionProvider, useSession } from '@/context/authContext';
import { GroceryContextProvider } from '@/context/groceryContext';
import 'cross-fetch/polyfill';

export default function RootLayout() {
  // session checks
  const session = useSession();
  if (!session) {
    return <Redirect href="/(auth)/Login" />;
  }

  return (
    <GroceryContextProvider>
      <SessionProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack>
      </SessionProvider>
    </GroceryContextProvider>
  );
}
