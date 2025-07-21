import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  Alert,
  ScrollView,
  View,
  Animated,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Input, InputField, InputIcon } from '@/components/ui/input';
import { Button, ButtonGroup, ButtonText } from '@/components/ui/button';
import { VStack } from '@/components/ui/vstack';
import { Heading } from '@/components/ui/heading';
import { Image } from '@/components/ui/image';
import { EyeIcon, EyeOffIcon, MailIcon, LockIcon } from '@/components/ui/icon';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import Logo from '@/assets/images/icon.png';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState({ value: '', error: '' });
  const [password, setPassword] = useState({ value: '', error: '' });
  const [loading, setLoading] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  async function signInWithEmail() {
    if (email.value.length === 0 || password.value.length === 0) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });

    if (error) {
      Alert.alert(error.message);
    } else {
      router.replace('../(tabs)/Home');
    }

    setLoading(false);
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Day Background */}
      <LinearGradient
        colors={['#87CEEB', '#98D8E8', '#F0F8FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
      />

      {/* Night Background Overlay */}
      <Animated.View
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          opacity: isDark ? 1 : 0,
        }}
      >
        <LinearGradient
          colors={['#0f172a', '#1e293b', '#334155']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      {/* Stars */}
      <Animated.View
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          opacity: isDark ? 1 : 0,
        }}
      >
        {[...Array(50)].map((_, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: 2,
              height: 2,
              backgroundColor: 'white',
              borderRadius: 1,
              opacity: 0.3 + Math.random() * 0.7,
            }}
          />
        ))}
      </Animated.View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
      <Box className="flex-1 px-6 justify-center">
        <Box className="items-center mb-16">
          <Image
            source={Logo}
            className="w-40 h-40 mb-4"
          />
        </Box>

        <VStack space="md">
          <Heading
            size="4xl"
            className="w-full text-center mb-8 text-black dark:text-white"
          >
            GroceryPicker
          </Heading>

          <KeyboardAvoidingView>
            <Box>
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
                  autoComplete="email"
                  value={email.value}
                  className="m-0 text-black dark:text-white"
                  onChangeText={(text) => setEmail({ value: text, error: '' })}
                />
              </Input>
              {email.error ? (
                <Text className="text-red-500 text-xs mt-1">{email.error}</Text>
              ) : null}
            </Box>

            <Box className="mt-4">
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
                  className="m-0 text-black dark:text-white"
                  onChangeText={(text) =>
                    setPassword({ value: text, error: '' })
                  }
                />
              </Input>
              {password.error ? (
                <Text className="text-red-500 text-xs mt-1">
                  {password.error}
                </Text>
              ) : null}
            </Box>
          </KeyboardAvoidingView>

          <Pressable onPress={() => router.push('/ResetEmail')}>
            <Text className="text-right text-sm text-blue-600 dark:text-blue-400 mt-2">
              Forgot your password?
            </Text>
          </Pressable>

          <ButtonGroup className="mt-4">
            <Button
              className="bg-blue-500 h-16 active:bg-blue-600 dark:bg-gray-600 dark:active:bg-gray-400"
              onPress={signInWithEmail}
            >
              <ButtonText className="text-black dark:text-white text-base font-semibold">
                Login
              </ButtonText>
            </Button>
          </ButtonGroup>

          <Box className="flex-row justify-center mt-4">
            <Text className="text-sm text-gray-700 dark:text-gray-300">
              Don’t have an account?{' '}
            </Text>
            <Pressable onPress={() => router.push('/Register')}>
              <Text className="text-sm text-blue-600 dark:text-blue-400 font-bold">
                Sign up
              </Text>
            </Pressable>
          </Box>
        </VStack>
      </Box>
    </ScrollView>
    </View>
  );
}
