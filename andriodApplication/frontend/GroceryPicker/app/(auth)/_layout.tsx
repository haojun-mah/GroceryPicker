import { Stack, Redirect } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="sign-in-screen" />
    </Stack>
  )
} 