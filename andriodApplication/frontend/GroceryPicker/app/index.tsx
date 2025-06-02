import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useSession } from "../lib/session"
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { session, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) { // loading check logic supposed to be here, to replace with a splash page
      if (session) {
        router.replace('/(tabs)/Home');
      } else {
        router.replace('/(auth)/Login');
      }
    }
  }, [session, isLoading]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
