import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { supabase } from './supabase'

// フォアグラウンド時の通知表示設定
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

/**
 * デバイスのExpo Push Tokenを取得してSupabaseに保存する
 */
export async function registerPushToken(userId: string): Promise<void> {
  if (!Device.isDevice) return

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    })
  }

  const tokenData = await Notifications.getExpoPushTokenAsync()
  const token = tokenData.data

  await supabase
    .from('push_tokens')
    .upsert({ user_id: userId, token }, { onConflict: 'user_id' })
}

/**
 * 予算アラート通知をローカルに即時表示し、通知テーブルに記録する
 */
export async function triggerBudgetAlert(
  userId: string,
  oshiName: string,
  remaining: number,
  totalBudget: number
): Promise<void> {
  const percent = Math.floor((remaining / totalBudget) * 100)
  const title = `💸 予算アラート：${oshiName}`
  const body = `今月の予算残額が${percent}%（¥${remaining.toLocaleString()}）になりました`

  // ローカル通知を即時表示
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null,
  })

  // 通知テーブルに記録
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'budget_alert',
    title,
    body,
    is_read: false,
  })
}

/**
 * 未読通知数を取得する
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false)
    .or(`user_id.eq.${userId},user_id.is.null`)

  return count ?? 0
}

/**
 * ユーザーの通知設定を取得（なければデフォルトで作成）
 */
export async function getOrCreateNotificationSettings(userId: string) {
  const { data } = await supabase
    .from('user_notification_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (data) return data

  const { data: created } = await supabase
    .from('user_notification_settings')
    .insert({ user_id: userId, budget_alert: true, announcement: true })
    .select()
    .single()

  return created
}
