import React, { useState } from 'react';
import { Alert } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Input, InputField } from '@/components/ui/input';
import { Button, ButtonText } from '@/components/ui/button';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/lib/RootStackParamList';
import Background from '@/components/Background';
import BackButton from '@/components/BackButton';
import { supabase } from '@/lib/supabase';
import { router, useRouter } from 'expo-router';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState({ value: '', error: '' });
  const [loading, setLoading] = useState(false);

  async function sendResetPasswordEmail() {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.value);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Password has been reset. Check email.');
      router.replace('/Login');
    }
  }

  return (
    <Background>
      <BackButton goBack={() => router.back()} />

      <Box className="items-center gap-6 px-6 w-full">
        <Heading size="3xl" className="text-center">
          Restore Password
        </Heading>
        <VStack space="md" className="w-full">
          <Input isInvalid={!!email.error} size="xl">
            <InputField
              placeholder="E-mail address"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email.value}
              onChangeText={(text) => setEmail({ value: text, error: '' })}
            />
          </Input>
          {email.error ? (
            <Text className="text-red-500 text-xs">{email.error}</Text>
          ) : (
            <Text className="text-gray-500 text-xs">
              You will receive an email with a password reset link.
            </Text>
          )}

          <Button className="mt-4 bg-blue-500" onPress={sendResetPasswordEmail}>
            <ButtonText className="text-black">Send Instructions</ButtonText>
          </Button>
        </VStack>
      </Box>
    </Background>
  );
}
