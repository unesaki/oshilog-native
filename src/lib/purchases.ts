import { Platform } from 'react-native'
import Purchases, { LOG_LEVEL } from 'react-native-purchases'
import { supabase } from './supabase'

const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? ''
const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? ''

export function configurePurchases(userId?: string) {
  if (Platform.OS === 'android' && !ANDROID_API_KEY) return
  if (Platform.OS === 'ios' && !IOS_API_KEY) return

  const apiKey = Platform.OS === 'ios' ? IOS_API_KEY : ANDROID_API_KEY
  Purchases.setLogLevel(LOG_LEVEL.ERROR)
  Purchases.configure({ apiKey })

  if (userId) {
    Purchases.logIn(userId).catch(() => {})
  }
}

export async function loginPurchases(userId: string) {
  if (Platform.OS === 'ios') return
  try {
    await Purchases.logIn(userId)
  } catch {
    // ログイン失敗は無視
  }
}

export async function syncSubscriptionStatus(userId: string): Promise<boolean> {
  if (Platform.OS === 'ios') return false
  try {
    const info = await Purchases.getCustomerInfo()
    const isPremium = typeof info.entitlements.active['premium'] !== 'undefined'

    await supabase.from('subscriptions').upsert(
      {
        user_id: userId,
        plan: isPremium ? 'premium' : 'free',
        status: isPremium ? 'active' : 'inactive',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    return isPremium
  } catch {
    return false
  }
}
