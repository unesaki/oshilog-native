import { Stack } from 'expo-router'

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="upgrade" options={{ presentation: 'modal' }} />
      <Stack.Screen name="oshi/index" />
      <Stack.Screen name="oshi/new" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="oshi/[id]" />
    </Stack>
  )
}
