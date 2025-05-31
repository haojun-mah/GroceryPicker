import { Stack, Redirect } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="Register" options={{ headerShown: false }}/>
    </Stack>
  )
} 