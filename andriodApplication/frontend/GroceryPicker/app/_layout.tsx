import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { useState } from 'react';
import { Redirect, Stack } from 'expo-router';
import React from 'react';
import '../global.css';
import { SessionProvider, useSession } from '@/context/authContext';
import { GroceryContextProvider } from '@/context/groceryContext';
import 'cross-fetch/polyfill';
import { ThemeProvider } from '@/components/ThemeProvider';

export default function RootLayout() {
  const [colorMode, setColorMode] = useState<"light" | "dark">("light");

  // session checks
  const session = useSession();
  if (!session) {
    return <Redirect href="/(auth)/Login" />;
  }

  return (
    <ThemeProvider>
      <GluestackUIProvider mode={colorMode}>
        <GroceryContextProvider>
          <SessionProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            </Stack>
          </SessionProvider>
        </GroceryContextProvider>
      </GluestackUIProvider>
    </ThemeProvider>
  );
}
