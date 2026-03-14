/**
 * TODO: Supabase設定
 *
 * 以下の手順で設定してください：
 * 1. .env ファイルを作成
 * 2. EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url> を設定
 * 3. EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key> を設定
 *
 * Supabase Dashboardから取得：
 * Project Settings > API > Project URL & anon key
 */

import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
