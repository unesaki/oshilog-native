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
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/colors'
import { makeRedirectUri } from 'expo-auth-session'

WebBrowser.maybeCompleteAuthSession()

export default function LoginScreen() {
  const [loading, setLoading] = useState(false)

  async function handleGoogleLogin() {
    setLoading(true)
    try {
      const redirectTo = makeRedirectUri({ scheme: 'oshilog', path: 'auth/callback' })

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      })

      if (error) throw error
      if (!data.url) throw new Error('No auth URL')

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)

      if (result.type === 'success') {
        const url = result.url
        const params = new URLSearchParams(url.split('?')[1])
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
        }
      }
    } catch (err) {
      console.error('[Google login error]', err)
      Alert.alert('ログインエラー', 'ログインに失敗しました。もう一度試してください。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <LinearGradient colors={['#FFF0F5', '#FFE4EF']} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.emoji}>💖</Text>
        <Text style={styles.title}>oshilog</Text>
        <Text style={styles.subtitle}>推し活の記録を、もっと楽しく。</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={handleGoogleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <GoogleIcon />
              <Text style={styles.buttonText}>Googleでログイン</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  )
}

function GoogleIcon() {
  return (
    <Text style={{ fontSize: 16, marginRight: 8 }}>G</Text>
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
    fontSize: 52,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.pinkVivid,
    fontStyle: 'italic',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 32,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.pinkVivid,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 14,
    width: '100%',
    shadowColor: Colors.pinkVivid,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
})
