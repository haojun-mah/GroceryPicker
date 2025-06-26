import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Input, InputField, InputIcon } from '@/components/ui/input';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Button, ButtonGroup, ButtonText } from '@/components/ui/button';
import { MailIcon, LockIcon } from '@/components/ui/icon';
import BackButton from '@/components/BackButton';
import { useColorScheme } from 'nativewind';

export default function Register() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();

  const [name, setName] = useState({ value: '', error: '' });
  const [email, setEmail] = useState({ value: '', error: '' });
  const [password, setPassword] = useState({ value: '', error: '' });
  const [loading, setLoading] = useState(false);

  async function signUpWithEmail() {
    setLoading(true);
    if (
      name.value.length === 0 ||
      email.value.length === 0 ||
      password.value.length === 0
    )
      return;

    const { error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
    });

    if (error) {
      Alert.alert(error.message);
    } else {
      Alert.alert('Sign up successful!');
      router.replace('/Login');
    }

    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      className="bg-[#EEEEEE] dark:bg-gray-900"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingVertical: 48,
        }}
      >
        <BackButton goBack={() => router.back()} />

        <Box className="gap-12 items-center">
          <Heading size="4xl" className="text-black dark:text-white">
            Create Account
          </Heading>

          <VStack space="md" className="w-full">
            <Input
              className={`p-2 h-16 w-full bg-gray-100 dark:bg-gray-800 border ${
                colorScheme === 'dark' ? 'border-gray-400' : 'border-white'
              }`}
              isInvalid={!!name.error}
            >
              <InputField
                placeholder="Name"
                value={name.value}
                onChangeText={(text) => setName({ value: text, error: '' })}
                className="text-black dark:text-white"
              />
            </Input>
            {name.error && (
              <Text className="text-red-500 text-xs">{name.error}</Text>
            )}

            <Input
              className={`p-2 h-16 w-full bg-gray-100 dark:bg-gray-800 border ${
                colorScheme === 'dark' ? 'border-gray-400' : 'border-white'
              }`}
              isInvalid={!!email.error}
            >
              <InputIcon
                as={MailIcon}
                className="w-6 h-6 text-gray-700 dark:text-gray-300"
              />
              <InputField
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email.value}
                onChangeText={(text) => setEmail({ value: text, error: '' })}
                className="text-black dark:text-white"
              />
            </Input>
            {email.error && (
              <Text className="text-red-500 text-xs">{email.error}</Text>
            )}

            <Input
              className={`p-2 h-16 w-full bg-gray-100 dark:bg-gray-800 border ${
                colorScheme === 'dark' ? 'border-gray-400' : 'border-white'
              }`}
              isInvalid={!!password.error}
            >
              <InputIcon
                as={LockIcon}
                className="w-6 h-6 text-gray-700 dark:text-gray-300"
              />
              <InputField
                placeholder="Password"
                secureTextEntry
                value={password.value}
                onChangeText={(text) => setPassword({ value: text, error: '' })}
                className="text-black dark:text-white"
              />
            </Input>
            {password.error && (
              <Text className="text-red-500 text-xs">{password.error}</Text>
            )}

            <ButtonGroup>
              <Button
                className="bg-blue-500 mt-2 active:bg-blue-600 dark:bg-gray-600 dark:active:bg-gray-400"
                onPress={signUpWithEmail}
                disabled={loading}
              >
                <ButtonText className="text-black dark:text-white">
                  {loading ? 'Signing Up...' : 'Sign Up'}
                </ButtonText>
              </Button>
            </ButtonGroup>

            <HStack className="mt-4 justify-center">
              <Text className="text-gray-700 dark:text-gray-300">
                Already have an account?{' '}
              </Text>
              <Pressable onPress={() => router.replace('/Login')}>
                <Text className="text-blue-500 dark:text-blue-400 font-bold">
                  Login
                </Text>
              </Pressable>
            </HStack>
          </VStack>
        </Box>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
