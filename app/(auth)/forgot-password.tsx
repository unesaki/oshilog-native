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
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/colors'
import { Fonts } from '@/constants/fonts'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  function validate() {
    if (!email) return 'メールアドレスを入力してください'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'メールアドレスの形式が正しくありません'
    return null
  }

  async function handleSubmit() {
    const err = validate()
    if (err) { setEmailError(err); return }
    setEmailError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
      Alert.alert(
        'メールを送信しました',
        `${email} にパスワードリセット用のメールを送りました。\nメール内のリンクからパスワードを変更してください。`,
        [{ text: 'ログイン画面へ', onPress: () => router.replace('/(auth)/login') }]
      )
    } catch (err: any) {
      Alert.alert('エラー', err.message ?? '送信に失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <LinearGradient colors={['#FFF0F5', '#FFE4EF']} style={styles.container}>
      <View style={styles.card}>
        <Ionicons name="lock-open-outline" size={48} color={Colors.pinkVivid} style={styles.icon} />
        <Text style={styles.title}>パスワードリセット</Text>
        <Text style={styles.subtitle}>登録済みのメールアドレスを入力してください。{'\n'}パスワード再設定用のメールをお送りします。</Text>

        <View style={styles.fieldWrap}>
          <TextInput
            style={[styles.input, emailError ? styles.inputError : null]}
            placeholder="メールアドレス"
            placeholderTextColor="#ccc"
            value={email}
            onChangeText={(v) => { setEmail(v); setEmailError(null) }}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          {emailError && <Text style={styles.errorText}>{emailError}</Text>}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.buttonText}>送信する</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.backLink} activeOpacity={0.7}>
          <Text style={styles.backLinkText}>ログイン画面に戻る</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
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
  icon: { marginBottom: 16 },
  title: {
    fontFamily: Fonts.zenMaruBold,
    fontSize: 18,
    color: Colors.textDark,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: Fonts.zenMaruRegular,
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
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
  backLink: { marginTop: 24 },
  backLinkText: {
    fontSize: 13,
    color: Colors.pinkVivid,
    fontFamily: Fonts.zenMaruBold,
  },
})
