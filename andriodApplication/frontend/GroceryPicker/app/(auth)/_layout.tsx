import { Stack, Redirect } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="Login" options={{ headerShown: false }} />
      <Stack.Screen name="Register" options={{ headerShown: false }} />
      <Stack.Screen name="ResetPassword" options={{ headerShown: false }} />
      <Stack.Screen name="ResetEmail" options={{ headerShown: false }} />
      <Stack.Screen name="VerifyOTP" options={{ headerShown: false }} />
    </Stack>
  );
}
