import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button, ButtonGroup, ButtonText } from '@/components/ui/button';
import { Input, InputIcon, InputField } from '@/components/ui/input';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import BackButton from '@/components/BackButton';
import Background from '@/components/Background';
import { useNavigation, useRouter } from 'expo-router';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/lib/RootStackParamList';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';
import { Box } from '@/components/ui/box';
import { EyeIcon, EyeOffIcon, MailIcon, LockIcon } from '@/components/ui/icon'; // to add password reveal feature
import { UserPen } from 'lucide-react-native';

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState({ value: '', error: '' });
  const [email, setEmail] = useState({ value: '', error: '' });
  const [password, setPassword] = useState({ value: '', error: '' });
  const [loading, setLoading] = useState(false); // archive, set splash screen when loading

  async function signUpWithEmail() {
    setLoading(true);
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
    });

    if (error) {
      Alert.alert(error.message);
    } else {
      Alert.alert('Sign up successful');
      router.replace('/Login');
    }

    setLoading(false);
  }

  return (
    <Background>
      <BackButton goBack={() => router.back()} />
      <Box className="gap-12 items-center">
        <Heading size="4xl">Create Account</Heading>

        <VStack space="md" className="w-full">
          {/* lucide icon library error. i really like the library thou. consider solutions further down the line
            <InputIcon as={UserPen} className='w-6 h-6'/> */}
          <Input className="p-2 h-16 w-full" isInvalid={!!name.error}>
            <InputField
              variant="outline"
              placeholder="Name"
              value={name.value}
              onChangeText={(text) => setName({ value: text, error: '' })}
            />
          </Input>
          {name.error ? (
            <Text className="text-red-500 text-xs">{name.error}</Text>
          ) : null}

          <Input className="p-2 h-16 w-full" isInvalid={!!email.error}>
            <InputIcon as={MailIcon} className="w-6 h-6" />
            <InputField
              variant="outline"
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email.value}
              onChangeText={(text) => setEmail({ value: text, error: '' })}
            />
          </Input>
          {email.error ? (
            <Text className="text-red-500 text-xs">{email.error}</Text>
          ) : null}

          <Input className="p-2 h-16 w-full" isInvalid={!!password.error}>
            <InputIcon as={LockIcon} className="w-6 h-6" />
            <InputField
              variant="outline"
              placeholder="Password"
              secureTextEntry
              value={password.value}
              onChangeText={(text) => setPassword({ value: text, error: '' })}
            />
          </Input>
          {password.error ? (
            <Text className="text-red-500 text-xs">{password.error}</Text>
          ) : null}

          <ButtonGroup>
            <Button
              onPress={() => signUpWithEmail()}
              className="bg-blue-500 mt-2"
            >
              <ButtonText className="text-black">Sign Up</ButtonText>
            </Button>
          </ButtonGroup>
          <HStack className="mt-4 justify-center">
            <Text>Already have an account? </Text>
            <Pressable onPress={() => router.replace('/Login')}>
              <Text className="text-blue-500 font-bold">Login</Text>
            </Pressable>
          </HStack>
        </VStack>
      </Box>
    </Background>
  );
}
