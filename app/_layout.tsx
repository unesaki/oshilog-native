import React, { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useFonts, PlayfairDisplay_700Bold_Italic } from '@expo-google-fonts/playfair-display'
import { ZenMaruGothic_400Regular, ZenMaruGothic_700Bold } from '@expo-google-fonts/zen-maru-gothic'
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { useRouter, useSegments } from 'expo-router'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [isReady, setIsReady] = useState(false)
  const router = useRouter()
  const segments = useSegments()

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold_Italic,
    ZenMaruGothic_400Regular,
    ZenMaruGothic_700Bold,
    ...Ionicons.font,
    ...FontAwesome5.font,
    ...MaterialCommunityIcons.font,
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!isReady || !fontsLoaded) return

    const inAuthGroup = segments[0] === '(auth)'

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (session && inAuthGroup) {
      router.replace('/(app)/')
    }

    SplashScreen.hideAsync()
  }, [session, isReady, fontsLoaded, segments])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
