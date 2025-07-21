import { Redirect, Stack } from 'expo-router';
import React from 'react';
import '../global.css';
import { SessionProvider, useSession } from '@/context/authContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'cross-fetch/polyfill';

const queryClient = new QueryClient();

export default function RootLayout() {
  // session checks
  const session = useSession();
  if (!session) {
    return <Redirect href="/(auth)/Login" />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack>
        </SessionProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
