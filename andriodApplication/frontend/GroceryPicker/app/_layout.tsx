import { Redirect, Stack } from 'expo-router';
import React, { useEffect } from 'react';
import '../global.css';
import { SessionProvider, useSession } from '@/context/authContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { wakeUpBackend } from '@/lib/backendWakeupService';
import 'cross-fetch/polyfill';

const queryClient = new QueryClient();

export default function RootLayout() {
  // session checks
  const session = useSession();
  
  // Wake up backend on app launch to avoid 50-second cold starts on Render
  // This makes a health check request when the app loads, which warms up
  // the server before users try to interact with it
  useEffect(() => {
    wakeUpBackend();
  }, []);
  
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
