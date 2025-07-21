import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  View,
  Animated,
} from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Input, InputField } from '@/components/ui/input';
import { Button, ButtonText } from '@/components/ui/button';
import BackButton from '@/components/BackButton';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const prefix = Linking.createURL('/');

  const [email, setEmail] = useState({ value: '', error: '' });
  const [loading, setLoading] = useState(false);

  async function sendResetPasswordEmail() {
    if (!email.value || email.value.length === 0) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email: email.value,
        options: {
          emailRedirectTo: Linking.createURL(`/ResetPassword`),
        },
      });
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        router.push(`/VerifyOTP?email=${encodeURIComponent(email.value)}`);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error sending reset password email:', error);
    }
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
      >
        <BackButton goBack={() => router.replace('/Login')} />

        <Box className="items-center gap-6 w-full">
          <Heading
            size="3xl"
            className="text-center text-black dark:text-white"
          >
            Restore Password
          </Heading>

          <VStack space="md" className="w-full">
            <Input
              isInvalid={!!email.error}
              size="xl"
              className={`p-2 h-16 w-full bg-gray-100 dark:bg-gray-800 border ${
                colorScheme === 'dark' ? 'border-gray-400' : 'border-white'
              }`}
            >
              <InputField
                placeholder="E-mail address"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email.value}
                onChangeText={(text) => setEmail({ value: text, error: '' })}
                className="text-black dark:text-white"
              />
            </Input>

            {email.error ? (
              <Text className="text-red-500 text-xs">{email.error}</Text>
            ) : (
              <Text className="text-gray-500 dark:text-gray-300 text-xs">
                You will receive an email with a password reset link.
              </Text>
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
    </View>
  );
}
