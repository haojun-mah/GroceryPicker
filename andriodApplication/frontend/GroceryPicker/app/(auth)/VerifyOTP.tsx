import BackButton from '@/components/BackButton';
import { Text } from '@/components/ui/text';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Pressable, ScrollView } from 'react-native';
import OtpInput from 'react-native-animated-otp-input';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { Alert, AlertText } from '@/components/ui/alert';
import AntDesign from '@expo/vector-icons/AntDesign';

const OTPInput = () => {
    const { email } = useLocalSearchParams();
    const [countdown, setCountdown] = useState(30);
    const [canResend, setCanResend] = useState(false);
    const [invalidOTP, setInvalidOTP] = useState(false);
    const [otpKey, setOtpKey] = useState(0); // For clearing input

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [countdown]);

    const handleOTP = async (token: string) => {
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email: email as string,
                token: token,
                type: 'recovery'
            });
            
            if (error) {
                setInvalidOTP(true);
                setOtpKey(prev => prev + 1); // Clear input by re-rendering
                console.error(error);
            } else {
                setInvalidOTP(false);
                router.push(`/ResetPassword?email=${email}`);
            }
        } catch (error) {
            setInvalidOTP(true);
            setOtpKey(prev => prev + 1); // Clear input by re-rendering
            alert('Error with OTP verification.');
            console.error(error);
        }
    }

    const handleResendOTP = async () => {
        if (canResend) {
            setCountdown(30);
            setCanResend(false);
            setInvalidOTP(false);
            
            try {
                const { error } = await supabase.auth.resetPasswordForEmail(
                    email as string,
                    {
                        redirectTo: Linking.createURL('/ResetPassword'),
                    }
                );
                
                if (error) {
                    alert('Error resending OTP.');
                    console.error(error);
                } else {
                    alert('OTP resent successfully!');
                }
            } catch (error) {
                console.error('Error sending reset password email:', error);
                alert('Failed to resend OTP.');
            }
        }
    }

    return (
        <ScrollView className='bg-[#EEEEEE] dark:bg-gray-900' contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
            <BackButton goBack={() => router.push('/ResetEmail')}/>
            <Text className='text-4xl font-roboto font-semibold mb-4 text-black dark:text-white'>
                Enter your OTP
            </Text>
            <Text className='text-xs font-roboto font-normal mb-4 text-gray-500 dark:text-gray-300'>
                Check {email} for your OTP
            </Text>
            
            <OtpInput
                key={otpKey} // This will clear the input when key changes
                otpCount={6}
                autoFocus={true}
                onCodeFilled={(code: string) => {
                    handleOTP(code);
                }}
            />
            
            {invalidOTP && (
                <Alert className="mt-2">
                    <AntDesign name="frowno" size={24} color='red' />
                    <AlertText className='text-sm font-roboto font-normal text-red-500 dark:text-red-300'>
                        Invalid OTP. Please try again.
                    </AlertText>
                </Alert>
            )}
            
            <Pressable onPress={handleResendOTP} disabled={!canResend} className='mt-6'>
                <Text className={`text-xs font-roboto font-normal mt-4 text-gray-500 dark:text-gray-300 ${canResend ? 'text-blue-500' : 'text-gray-400'}`}>
                    {canResend ? 'You can resend the OTP now.' : `Resend OTP in ${countdown} seconds.`}
                </Text>
            </Pressable>
        </ScrollView>
    );
}

export default OTPInput;