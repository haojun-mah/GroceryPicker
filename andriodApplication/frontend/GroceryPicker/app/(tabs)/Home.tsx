import { router } from 'expo-router';
import { ScrollView, View, Animated, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { supabase } from '@/lib/supabase';
import { ColorModeSwitch } from '@/components/ColorModeSwitch';
import { useSession } from '@/context/authContext';
import { useColorScheme } from 'nativewind';
import { useEffect, useRef, useState } from 'react';
import { backend_url } from '@/lib/api';
import { ControllerError, SavedGroceryList, SavedGroceryListItem } from './interface';
import { useGroceryContext } from '@/context/groceryContext';

export default function HomePage() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { session } = useSession();
  const [noListCreated, setNoListCreated] = useState<number>(0);
  const [noItems, setNoItems] = useState<number>(0);
  const [totalExpenditure, setTotalExpenditure] = useState<number>(0);
  const { refreshVersion, setGroceryListHistory } = useGroceryContext();

  // Animation values
  const translateX = useRef(new Animated.Value(0)).current;
  const backgroundOpacity = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  const sunScale = useRef(new Animated.Value(isDark ? 0.8 : 1.2)).current;
  const moonScale = useRef(new Animated.Value(isDark ? 1.2 : 0.8)).current;
  const sunRotate = useRef(new Animated.Value(0)).current;
  const moonRotate = useRef(new Animated.Value(0)).current;

  // Stars animation for dark mode
  const starsOpacity = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  // Define animation functions BEFORE swipeGesture
  const animateToLight = () => {
    Animated.parallel([
      Animated.timing(backgroundOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.spring(sunScale, {
        toValue: 1.2,
        useNativeDriver: true,
      }),
      Animated.spring(moonScale, {
        toValue: 0.8,
        useNativeDriver: true,
      }),
      Animated.timing(starsOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const animateToDark = () => {
    Animated.parallel([
      Animated.timing(backgroundOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.spring(moonScale, {
        toValue: 1.2,
        useNativeDriver: true,
      }),
      Animated.spring(sunScale, {
        toValue: 0.8,
        useNativeDriver: true,
      }),
      Animated.timing(starsOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const resetToCurrentMode = () => {
    if (isDark) {
      animateToDark();
    } else {
      animateToLight();
    }
  };

  // Handle double-tap gesture
  let lastTap = 0;
  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      // Toggle the color scheme
      if (isDark) {
        setColorScheme('light');
      } else {
        setColorScheme('dark');
      }
    }
    lastTap = now;
  };

  useEffect(() => {
    // Start continuous rotation animations
    const sunRotation = Animated.loop(
      Animated.timing(sunRotate, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      })
    );

    const moonRotation = Animated.loop(
      Animated.timing(moonRotate, {
        toValue: 1,
        duration: 15000,
        useNativeDriver: true,
      })
    );

    sunRotation.start();
    moonRotation.start();

    return () => {
      sunRotation.stop();
      moonRotation.stop();
    };
  }, []);

  useEffect(() => {
    // Animate to the current mode when color scheme changes
    const animationDelay = setTimeout(() => {
      if (isDark) {
        animateToDark();
      } else {
        animateToLight();
      }
    }, 150); // Small delay to prevent conflicts with gesture

    return () => clearTimeout(animationDelay);
  }, [isDark]);

  const fetchGroceryHistory = async () => {
    try {
      console.log('🔍 Fetching grocery history...');
      const response = await fetch(`${backend_url}/lists/getAll`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: SavedGroceryList[] = await response.json();
        console.log('🔍 Fetched grocery lists:', data);
        setNoListCreated(data.length);
        setNoItems(data.flatMap((list) => list.grocery_list_items).length);
        setTotalExpenditure(
          data
            .flatMap(list =>
              list.grocery_list_items.filter(item =>
                list.list_status === "purchased" || item.item_status === 'purchased'
              )
            )
            .reduce((acc, item) => {
              let price = 0;

              if (item.purchased_price != null) {
                price = item.purchased_price;
              } else if (item.product?.price != null) {
                price = parseFloat(item.product.price as string);
              }

              const amount = item.amount ?? 1;
              return acc + (isNaN(price) ? 0 : price * amount);
            }, 0)
        );

        setGroceryListHistory(data);
      } else {
        const error: ControllerError = await response.json();
        console.error('🔍 Error fetching grocery history:', error);
        throw new Error(`Error ${error.statusCode}: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to fetch grocery history:', error);
    }
  };

  useEffect(() => {
    if (session) {
      fetchGroceryHistory();
    }
  }, [refreshVersion]);

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
    }
    router.replace('/(auth)/Login');
  }

  const sunRotateInterpolate = sunRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const moonRotateInterpolate = moonRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <TouchableWithoutFeedback onPress={handleDoubleTap}>
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
            opacity: backgroundOpacity,
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
            opacity: starsOpacity,
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

        {/* Sun */}
        <Animated.View
          style={{
            position: 'absolute',
            top: '15%',
            right: '15%',
            width: 120,
            height: 120,
            transform: [
              { scale: sunScale },
              { rotate: sunRotateInterpolate },
            ],
          }}
        >
          <LinearGradient
            colors={['#FFD700', '#FFA500', '#FF6B35']}
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              alignSelf: 'center',
              top: 20,
            }}
          />
          {/* Sun rays */}
          {[...Array(8)].map((ray, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                width: 4,
                height: 20,
                backgroundColor: '#FFD700',
                borderRadius: 2,
                left: '48%',
                top: -10,
                transformOrigin: '50% 70px',
                transform: [{ rotate: `${i * 45}deg` }],
              }}
            />
          ))}
        </Animated.View>

        {/* Moon */}
        <Animated.View
          style={{
            position: 'absolute',
            top: '15%',
            right: '15%',
            width: 120,
            height: 120,
            transform: [
              { scale: moonScale },
              { rotate: moonRotateInterpolate },
            ],
          }}
        >
          <LinearGradient
            colors={['#F5F5DC', '#E6E6FA', '#C0C0C0']}
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              alignSelf: 'center',
              top: 20,
            }}
          />
          {/* Moon craters */}
          <View
            style={{
              position: 'absolute',
              width: 12,
              height: 12,
              backgroundColor: '#D3D3D3',
              borderRadius: 6,
              top: 35,
              left: 45,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: 8,
              height: 8,
              backgroundColor: '#D3D3D3',
              borderRadius: 4,
              top: 50,
              left: 65,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: 6,
              height: 6,
              backgroundColor: '#D3D3D3',
              borderRadius: 3,
              top: 60,
              left: 50,
            }}
          />
        </Animated.View>

        {/* Content */}
        <Animated.View
          style={{
            flex: 1,
            transform: [{ translateX }],
          }}
        >
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
            {/* Floating Dark Mode Toggle */}
            <View className="absolute top-12 right-6 z-10">
              <ColorModeSwitch />
            </View>

            <View className="flex-1 px-6 relative justify-center items-center">
              {/* Header Section */}
              <View className="items-center py-8 w-full max-w-sm">
                <View className="flex-row items-center justify-items-center">
                  <Text
                    className={`text-4xl font-bold ${isDark ? 'text-gray-400' : 'text-gray-900'} mb-3 text-center`}
                  >
                    Grocery Picker
                  </Text>
                </View>

                <Text
                  className={`text-xl ${isDark ? 'text-gray-400' : 'text-gray-800'} mb-5 font-medium text-center`}
                >
                  Smart Shopping Made Simple
                </Text>

                <Text
                  className={`text-base ${isDark ? 'text-white/80' : 'text-gray-700'} text-center leading-6 max-w-xs`}
                >
                  Transform your shopping experience with AI-powered grocery lists
                  that save time and reduce waste
                </Text>
              </View>

              {/* Statistics */}
              <View className="flex-row gap-1 mb-8 w-full max-w-sm">
                <View
                  className={`flex-1 ${isDark ? 'bg-white/5' : 'bg-white/20'} backdrop-blur-md rounded-2xl p-4 items-center border ${isDark ? 'border-white/10' : 'border-white/30'}`}
                >
                  <Text className="text-lg mb-1">📝</Text>
                  <Text
                    className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold text-xl`}
                  >
                    {noListCreated}
                  </Text>
                  <Text
                    className={`${isDark ? 'text-white/80' : 'text-gray-700'} dark:text-white/80 text-sm text-center text-wrap`}
                  >
                    Lists Created
                  </Text>
                </View>

                <View
                  className={`flex-1 ${isDark ? 'bg-white/5' : 'bg-white/20'} backdrop-blur-md rounded-2xl p-4 items-center border ${isDark ? 'border-white/10' : 'border-white/30'}`}
                >
                  <Text className="text-lg mb-1">🛍️</Text>
                  <Text
                    className={`${isDark ? 'text-white' : 'text-gray-900'} dark:text-white/80 font-bold text-xl`}
                  >
                    {noItems}
                  </Text>
                  <Text
                    className={`${isDark ? 'text-white/80' : 'text-gray-700'} text-sm dark:text-white/80 text-center text-wrap`}
                  >
                    Items Managed
                  </Text>
                </View>

                <View
                  className={`flex-1 ${isDark ? 'bg-white/5' : 'bg-white/20'} backdrop-blur-md rounded-2xl p-4 items-center border ${isDark ? 'border-white/10' : 'border-white/30'}`}
                >
                  <Text className="text-lg mb-1">🛒</Text>
                  <Text
                    className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold text-xl`}
                  >
                    ${totalExpenditure.toFixed(2)}
                  </Text>
                  <Text
                    className={`${isDark ? 'text-white/80' : 'text-gray-700'} text-sm text-center dark:text-white/80 text-wrap`}
                  >
                    Total Expenditure
                  </Text>
                </View>
              </View>

              {/* Main CTA */}
              <View className="mb-4 w-full max-w-sm">
                <LinearGradient
                  colors={
                    isDark
                      ? ['#4f46e5', '#7c3aed', '#db2777']
                      : ['#ff6b6b', '#ffa726', '#ffcc02']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 16,
                    padding: 24,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.3,
                    shadowRadius: 16,
                    elevation: 8,
                  }}
                >
                  <Button
                    onPress={() => router.push('./groceryInput')}
                    className="bg-transparent border-0"
                    size="xl"
                  >
                    <View className="items-center">
                      <Text className="text-white text-2xl font-bold mb-1">
                        Create My List
                      </Text>
                      <Text className="text-white/90 text-base">
                        Start your smart shopping journey
                      </Text>
                    </View>
                  </Button>
                </LinearGradient>
              </View>

              {/* Secondary Actions */}
              <View className="flex-row gap-3 w-full max-w-sm">
                <View className="flex-1">
                  <View
                    className={`${isDark ? 'bg-white/5' : 'bg-white/10'} backdrop-blur-md rounded-xl p-4 border ${isDark ? 'border-white/10' : 'border-white/20'}`}
                  >
                    <Button
                      onPress={() => router.push('./groceryHistory')}
                      className="bg-transparent border-0"
                      size="md"
                    >
                      <View className="items-center">
                        <Text className="text-lg mb-1">📋</Text>
                        <Text
                          className={`${isDark ? 'text-white' : 'text-black'} font-semibold text-sm`}
                        >
                          History
                        </Text>
                      </View>
                    </Button>
                  </View>
                </View>

                <View className="flex-1">
                  <View
                    className={`${isDark ? 'bg-white/5' : 'bg-white/10'} backdrop-blur-md rounded-xl p-4 border ${isDark ? 'border-white/10' : 'border-white/20'}`}
                  >
                    <Button
                      onPress={() => signOut()}
                      className="bg-transparent border-0"
                      size="md"
                    >
                      <View className="items-center">
                        <Text className="text-lg mb-1">🚪</Text>
                        <Text
                          className={`${isDark ? 'text-white' : 'text-black'} font-semibold text-sm`}
                        >
                          Sign Out
                        </Text>
                      </View>
                    </Button>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
}
