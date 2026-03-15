/**
 * TODO: Google OAuth設定
 *
 * Supabase DashboardでGoogle OAuth Providerを有効化し、
 * app.jsonのscheme（"oshilog"）をリダイレクトURLに設定してください：
 *   oshilog://auth/callback
 *
 * また、iOS/AndroidのOAuth設定（GoogleSignIn）が必要です。
 * 詳細: https://supabase.com/docs/guides/auth/social-login/auth-google?platform=react-native
 */

import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/colors'
import { Fonts } from '@/constants/fonts'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } catch (err: any) {
      Alert.alert('ログインエラー', err.message ?? 'ログインに失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <LinearGradient colors={['#FFF0F5', '#FFE4EF']} style={styles.container}>
      <View style={styles.card}>
        <Ionicons name="heart" size={52} color={Colors.pinkVivid} style={styles.emoji} />
        <Text style={styles.title}>oshilog</Text>
        <Text style={styles.subtitle}>推し活の記録を、もっと楽しく。</Text>

        <TextInput
          style={styles.input}
          placeholder="メールアドレス"
          placeholderTextColor="#ccc"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="パスワード"
          placeholderTextColor="#ccc"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.buttonText}>ログイン</Text>
          )}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    paddingHorizontal: 40,
    paddingVertical: 48,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  emoji: {
    marginBottom: 12,
  },
  title: {
    fontFamily: Fonts.playfairBoldItalic,
    fontSize: 32,
    color: Colors.pinkVivid,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: Fonts.zenMaruRegular,
    fontSize: 13,
    color: '#aaa',
    marginBottom: 24,
  },
  input: {
    fontFamily: Fonts.zenMaruRegular,
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.pinkSoft,
    paddingHorizontal: 14,
    fontSize: 14,
    color: Colors.textDark,
    marginBottom: 12,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.pinkVivid,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 14,
    width: '100%',
    marginTop: 8,
    shadowColor: Colors.pinkVivid,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonText: {
    fontFamily: Fonts.zenMaruBold,
    color: Colors.white,
    fontSize: 15,
  },
})
