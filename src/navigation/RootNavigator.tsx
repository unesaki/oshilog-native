import React from 'react'
import { ActivityIndicator, View } from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '../context/AuthContext'
import LoginScreen from '../screens/LoginScreen'
import MainTabsScreen from '../screens/MainTabsScreen'
import AddExpenseScreen from '../screens/AddExpenseScreen'
import OshiNewScreen from '../screens/OshiNewScreen'
import { colors } from '../constants/colors'

export type RootStackParamList = {
  Login: undefined
  MainTabs: undefined
  AddExpense: { oshiId?: string } | undefined
  OshiNew: { oshiId?: string } | undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function RootNavigator() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cream }}>
        <ActivityIndicator size="large" color={colors.pinkVivid} />
      </View>
    )
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabsScreen} />
          <Stack.Screen
            name="AddExpense"
            component={AddExpenseScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="OshiNew"
            component={OshiNewScreen}
            options={{ presentation: 'modal' }}
          />
        </>
      )}
    </Stack.Navigator>
  )
}
