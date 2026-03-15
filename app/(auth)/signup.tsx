import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/colors'
import { Fonts } from '@/constants/fonts'

export default function SignupScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string }>({})

  function validate() {
    const newErrors: typeof errors = {}
    if (!email) newErrors.email = 'メールアドレスを入力してください'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'メールアドレスの形式が正しくありません'
    if (!password) newErrors.password = 'パスワードを入力してください'
    else if (password.length < 8) newErrors.password = 'パスワードは8文字以上で入力してください'
    if (!confirmPassword) newErrors.confirm = '確認用パスワードを入力してください'
    else if (password !== confirmPassword) newErrors.confirm = 'パスワードが一致しません'
    return newErrors
  }

  async function handleSignup() {
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      Alert.alert(
        '確認メールを送信しました',
        `${email} に確認メールを送りました。\nメール内のリンクをタップしてアカウントを有効化してください。`,
        [{ text: 'ログイン画面へ', onPress: () => router.replace('/(auth)/login') }]
      )
    } catch (err: any) {
      Alert.alert('登録エラー', err.message ?? '登録に失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <LinearGradient colors={['#FFF0F5', '#FFE4EF']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Ionicons name="heart" size={52} color={Colors.pinkVivid} style={styles.icon} />
          <Text style={styles.title}>oshilog</Text>
          <Text style={styles.subtitle}>アカウントを作成して{'\n'}推し活をはじめよう</Text>

          {/* メールアドレス */}
          <View style={styles.fieldWrap}>
            <TextInput
              style={[styles.input, errors.email ? styles.inputError : null]}
              placeholder="メールアドレス"
              placeholderTextColor="#ccc"
              value={email}
              onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: undefined })) }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* パスワード */}
          <View style={styles.fieldWrap}>
            <TextInput
              style={[styles.input, errors.password ? styles.inputError : null]}
              placeholder="パスワード（8文字以上）"
              placeholderTextColor="#ccc"
              value={password}
              onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: undefined })) }}
              secureTextEntry
              autoComplete="new-password"
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* パスワード確認 */}
          <View style={styles.fieldWrap}>
            <TextInput
              style={[styles.input, errors.confirm ? styles.inputError : null]}
              placeholder="パスワード（確認）"
              placeholderTextColor="#ccc"
              value={confirmPassword}
              onChangeText={(v) => { setConfirmPassword(v); setErrors((e) => ({ ...e, confirm: undefined })) }}
              secureTextEntry
              autoComplete="new-password"
            />
            {errors.confirm && <Text style={styles.errorText}>{errors.confirm}</Text>}
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.buttonText}>アカウントを作成</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={styles.loginLink} activeOpacity={0.7}>
            <Text style={styles.loginLinkText}>すでにアカウントをお持ちの方は</Text>
            <Text style={styles.loginLinkBold}>ログイン</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
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
  icon: { marginBottom: 12 },
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
    textAlign: 'center',
    lineHeight: 20,
  },
  fieldWrap: { width: '100%', marginBottom: 12 },
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
  },
  inputError: { borderColor: '#EF4444' },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 4,
    fontFamily: Fonts.zenMaruRegular,
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
  loginLink: { marginTop: 24, alignItems: 'center', gap: 2 },
  loginLinkText: { fontSize: 12, color: '#aaa', fontFamily: Fonts.zenMaruRegular },
  loginLinkBold: { fontSize: 13, color: Colors.pinkVivid, fontFamily: Fonts.zenMaruBold },
})
