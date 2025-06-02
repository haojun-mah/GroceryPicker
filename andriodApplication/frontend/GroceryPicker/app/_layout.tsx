import { Redirect, Stack } from 'expo-router';
import React from 'react';
import '../global.css';
import { SessionProvider, useSession } from '@/lib/session';
import 'cross-fetch/polyfill';


export default function RootLayout() {
  const session = useSession();
  if (!session) {
    return <Redirect href='/(auth)/Login'/>
  }

  return (
    <SessionProvider>
      <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
          <Stack.Screen name='(auth)' options={{ headerShown: false }}/>
      </Stack>
    </SessionProvider>
  );
}
