import React from 'react'
import { ImageBackground, KeyboardAvoidingView, Platform } from 'react-native'

export default function Background({ children }: { children: React.ReactNode }) {
  return (
    <ImageBackground
      source={require('@/assets/images/background_dot.png')}
      resizeMode="repeat"
      className="flex-1 w-full bg-white dark:bg-gray-900"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 px-5 w-full max-w-[340px] self-center items-center justify-center"
      >
        {children}
      </KeyboardAvoidingView>
    </ImageBackground>
  )
}
