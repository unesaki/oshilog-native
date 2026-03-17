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
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/colors'
import { Fonts } from '@/constants/fonts'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

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

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    try {
      const redirectUrl = Linking.createURL('auth/callback')
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      })
      if (error || !data.url) throw error ?? new Error('URLの取得に失敗しました。')

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl)
      if (result.type === 'success') {
        const { error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url)
        if (sessionError) throw sessionError
      }
    } catch (err: any) {
      Alert.alert('Googleログインエラー', err.message ?? 'ログインに失敗しました。')
    } finally {
      setGoogleLoading(false)
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

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>または</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleLogin}
          disabled={googleLoading}
          activeOpacity={0.85}
        >
          {googleLoading ? (
            <ActivityIndicator color={Colors.pinkVivid} />
          ) : (
            <>
              <Ionicons name="logo-google" size={18} color="#4285F4" style={styles.googleIcon} />
              <Text style={styles.googleButtonText}>Googleでログイン</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password' as any)} style={styles.forgotLink} activeOpacity={0.7}>
          <Text style={styles.forgotLinkText}>パスワードをお忘れの方</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/signup' as any)} style={styles.signupLink} activeOpacity={0.7}>
          <Text style={styles.signupLinkText}>アカウントをお持ちでない方は</Text>
          <Text style={styles.signupLinkBold}>新規登録</Text>
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.pinkSoft,
  },
  dividerText: {
    fontFamily: Fonts.zenMaruRegular,
    fontSize: 12,
    color: '#aaa',
    marginHorizontal: 8,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 14,
    width: '100%',
    borderWidth: 1.5,
    borderColor: Colors.pinkSoft,
  },
  googleIcon: {
    marginRight: 8,
  },
  googleButtonText: {
    fontFamily: Fonts.zenMaruBold,
    color: Colors.textDark,
    fontSize: 15,
  },
  forgotLink: { marginTop: 16 },
  forgotLinkText: { fontSize: 12, color: Colors.textLight, fontFamily: Fonts.zenMaruRegular },
  signupLink: { marginTop: 16, alignItems: 'center', gap: 2 },
  signupLinkText: { fontSize: 12, color: '#aaa', fontFamily: Fonts.zenMaruRegular },
  signupLinkBold: { fontSize: 13, color: Colors.pinkVivid, fontFamily: Fonts.zenMaruBold },
})
