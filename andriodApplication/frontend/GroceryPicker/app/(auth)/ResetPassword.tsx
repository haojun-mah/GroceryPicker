import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Input, InputField } from '@/components/ui/input';
import { Button, ButtonText } from '@/components/ui/button';
import BackButton from '@/components/BackButton';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams();
  const router = useRouter();
  const { colorScheme } = useColorScheme();

  const [password, setPassword] = useState({ value: '', error: '' });
  const [reconfirm, setReconfirm] = useState({ value: '', error: '' });
  const [loading, setLoading] = useState(false);

  async function sendResetPasswordEmail() {
    if (!password.value || password.value.length === 0) {
      Alert.alert('Error', 'Please enter your password.');
      return;
    }

    if (password.value !== reconfirm.value) {
      setPassword({ value: password.value, error: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: password.value,
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Password has been reset. Check your email.');
      router.replace('/Login');
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingVertical: 48,
        }}
        className="bg-[#EEEEEE] dark:bg-gray-900"
      >
        <BackButton goBack={() => router.back()} />

        <Box className="items-center gap-6 w-full">
          <Heading
            size="3xl"
            className="text-center text-black dark:text-white"
          >
            Reset Password
          </Heading>

          <VStack space="md" className="w-full">
            <Input
              isInvalid={!!password.error}
              size="xl"
              className={`p-2 h-16 w-full bg-gray-100 dark:bg-gray-800 border ${
                colorScheme === 'dark' ? 'border-gray-400' : 'border-white'
              }`}
            >
              <InputField
                placeholder="New Password"
                type="password"
                autoCapitalize="none"
                value={password.value}
                onChangeText={(text) => setPassword({ value: text, error: '' })}
                className="text-black dark:text-white"
              />
            </Input>
            <Input
              isInvalid={!!password.error}
              size="xl"
              className={`p-2 h-16 w-full bg-gray-100 dark:bg-gray-800 border ${
                colorScheme === 'dark' ? 'border-gray-400' : 'border-white'
              }`}
            >
              <InputField
                placeholder="Confirm Password"
                type="password"
                autoCapitalize="none"
                value={reconfirm.value}
                onChangeText={(text) =>
                  setReconfirm({ value: text, error: '' })
                }
                className="text-black dark:text-white"
              />
            </Input>

            {password.error ? (
              <Text className="text-red-500 text-xs">{password.error}</Text>
            ) : (
              <Text className="text-gray-500 dark:text-gray-300 text-xs"></Text>
            )}

            <Button
              className="mt-4 bg-blue-500 active:bg-blue-600 dark:bg-gray-600 dark:active:bg-gray-400"
              onPress={sendResetPasswordEmail}
              disabled={loading}
            >
              <ButtonText className="text-black dark:text-white">
                {loading ? 'Sending...' : 'Send Instructions'}
              </ButtonText>
            </Button>
          </VStack>
        </Box>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
