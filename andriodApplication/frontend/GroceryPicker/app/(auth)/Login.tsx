import React, { useState } from 'react'
import { Pressable } from 'react-native'
import { supabase } from '@/lib/supabase'
import { Box } from '@/components/ui/box'
import { Text } from '@/components/ui/text'
import { Input, InputField, InputIcon } from '@/components/ui/input'
import { Button, ButtonGroup, ButtonText } from '@/components/ui/button'
import { VStack } from '@/components/ui/vstack'
import { Heading } from '@/components/ui/heading'
import { Alert } from 'react-native'
import { Image } from '@/components/ui/image'
import { EyeIcon, EyeOffIcon, MailIcon, LockIcon } from '@/components/ui/icon'
import { useNavigation } from 'expo-router'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '@/lib/RootStackParamList'
import { useRouter } from 'expo-router'
import Logo from "../../assets/images/icon.png"

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState({ value: '', error: '' })
  const [password, setPassword] = useState({ value: '', error: '' })
  const [loading, setLoading] = useState(false) // archive, set splash screen when loading


  async function signInWithEmail() {
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })

    if (error) {
      Alert.alert(error.message)
    } else {
      router.replace('../(tabs)');
    }
      
    setLoading(false)
  }

  return (
    <Box className="flex-1 px-6 bg-white dark:bg-gray-900 justify-center">
      <Box className='items-center mb-16'>
        <Image source={Logo} size='2xl' alt="Logo"/>
      </Box>
      <VStack space='md'>
        <Heading size="4xl" className="text-center mb-8">GroceryPicker</Heading>
        <Box>
          <Input className="p-2 h-16" isInvalid={!!email.error}>
            <InputIcon as={MailIcon} className='w-6 h-6'/>
            <InputField
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email.value}
              className='m-0'
              onChangeText={(text) => setEmail({ value: text, error: '' })}
            />
          </Input>
          {email.error ? <Text className="text-red-500 text-xs mt-1">{email.error}</Text> : null}
        </Box>

        <Box>
          <Input className="p-2 h-16" isInvalid={!!password.error}>
            <InputIcon as={LockIcon} className='w-6 h-6'/>
            <InputField
              placeholder="Password"
              secureTextEntry
              value={password.value}
              className='m-0'
              onChangeText={(text) => setPassword({ value: text, error: '' })}
            />
          </Input>
          {password.error ? <Text className="text-red-500 text-xs mt-1">{password.error}</Text> : null}
        </Box>

        <Pressable onPress={() => router.push('/ResetPassword')}>
          <Text className="text-right text-sm text-blue-600 dark:text-blue-400">
            Forgot your password?
          </Text>
        </Pressable>
        <ButtonGroup>
          <Button className='bg-blue-500 h-16' onPress={() => signInWithEmail()}>
            <ButtonText className="text-white text-base font-semibold">Login</ButtonText>
          </Button>
        </ButtonGroup>
        <Box className="flex-row justify-center mt-4">
          <Text className="text-sm">Don’t have an account? </Text>
          <Pressable onPress={() => router.push('/Register')}>
            <Text className="text-sm text-blue-600 font-bold">Sign up</Text>
          </Pressable>
        </Box>
      </VStack>
    </Box>
  )
}
