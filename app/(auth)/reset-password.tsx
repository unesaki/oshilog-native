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

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function validate() {
    let valid = true
    if (!password) {
      setPasswordError('パスワードを入力してください')
      valid = false
    } else if (password.length < 8) {
      setPasswordError('パスワードは8文字以上で入力してください')
      valid = false
    } else {
      setPasswordError(null)
    }
    if (!confirmPassword) {
      setConfirmError('確認用パスワードを入力してください')
      valid = false
    } else if (password !== confirmPassword) {
      setConfirmError('パスワードが一致しません')
      valid = false
    } else {
      setConfirmError(null)
    }
    return valid
  }

  async function handleSubmit() {
    if (!validate()) return
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      Alert.alert(
        'パスワードを変更しました',
        '新しいパスワードでログインしてください。',
        [{ text: 'ログイン画面へ', onPress: () => router.replace('/(auth)/login') }]
      )
    } catch (err: any) {
      Alert.alert('エラー', err.message ?? 'パスワードの変更に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <LinearGradient colors={['#FFF0F5', '#FFE4EF']} style={styles.container}>
      <View style={styles.card}>
        <Ionicons name="lock-closed-outline" size={48} color={Colors.pinkVivid} style={styles.icon} />
        <Text style={styles.title}>パスワード再設定</Text>
        <Text style={styles.subtitle}>新しいパスワードを入力してください。{'\n'}8文字以上で設定してください。</Text>

        <View style={styles.fieldWrap}>
          <TextInput
            style={[styles.input, passwordError ? styles.inputError : null]}
            placeholder="新しいパスワード"
            placeholderTextColor="#ccc"
            value={password}
            onChangeText={(v) => { setPassword(v); setPasswordError(null) }}
            secureTextEntry
            autoCapitalize="none"
          />
          {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
        </View>

        <View style={styles.fieldWrap}>
          <TextInput
            style={[styles.input, confirmError ? styles.inputError : null]}
            placeholder="パスワード（確認）"
            placeholderTextColor="#ccc"
            value={confirmPassword}
            onChangeText={(v) => { setConfirmPassword(v); setConfirmError(null) }}
            secureTextEntry
            autoCapitalize="none"
          />
          {confirmError && <Text style={styles.errorText}>{confirmError}</Text>}
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
            <Text style={styles.buttonText}>パスワードを変更する</Text>
          )}
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
})
