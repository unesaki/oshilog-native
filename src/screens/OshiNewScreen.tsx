import React, { useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { supabase } from '../lib/supabase/client'
import { useAuth } from '../context/AuthContext'
import { colors } from '../constants/colors'
import { RootStackParamList } from '../navigation/RootNavigator'

const EMOJI_OPTIONS = [
  '🌸', '⭐', '💎', '🎀', '🌙', '☀️', '🦋', '🌺',
  '🍀', '🐾', '🎵', '🎤', '🎸', '👑', '🌈', '❤️',
  '💜', '💙', '💚', '🧡', '🌟', '✨', '🔥', '💫',
]

const COLOR_OPTIONS = [
  { label: 'ピンク', value: '#FF3D87' },
  { label: 'パープル', value: '#7B68EE' },
  { label: 'ブルー', value: '#4A90D9' },
  { label: 'ティール', value: '#26C6DA' },
  { label: 'グリーン', value: '#66BB6A' },
  { label: 'オレンジ', value: '#FF8C42' },
  { label: 'レッド', value: '#EF5350' },
  { label: 'ゴールド', value: '#FFCA28' },
]

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>
}

export default function OshiNewScreen({ navigation }: Props) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('🌸')
  const [selectedColor, setSelectedColor] = useState('#FF3D87')
  const [budget, setBudget] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('入力エラー', '推しの名前を入力してください')
      return
    }
    if (!user) return

    setSaving(true)
    try {
      // Get current oshi count for sort_order
      const { data: existingOshis } = await supabase
        .from('oshis')
        .select('id')
        .eq('user_id', user.id)

      const { data: newOshi, error: oshiError } = await supabase
        .from('oshis')
        .insert({
          user_id: user.id,
          name: name.trim(),
          color: selectedColor,
          icon_emoji: selectedEmoji,
          icon_url: null,
          sort_order: existingOshis?.length ?? 0,
        })
        .select()
        .single()

      if (oshiError) throw oshiError

      // Set budget if provided
      if (budget.trim() && newOshi) {
        const budgetAmount = parseInt(budget, 10)
        if (!isNaN(budgetAmount) && budgetAmount > 0) {
          const now = new Date()
          const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
          await supabase.from('budgets').insert({
            user_id: user.id,
            oshi_id: newOshi.id,
            amount: budgetAmount,
            year_month: yearMonth,
          })
        }
      }

      navigation.goBack()
    } catch (error: any) {
      Alert.alert('エラー', error.message || '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>推しを追加</Text>
        <View style={styles.closeBtn} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Preview */}
          <View style={styles.previewContainer}>
            <View style={[styles.previewAvatar, { backgroundColor: selectedColor + '30' }]}>
              <Text style={styles.previewEmoji}>{selectedEmoji}</Text>
            </View>
            <Text style={[styles.previewName, name ? {} : { color: colors.textLight }]}>
              {name || '推しの名前'}
            </Text>
          </View>

          {/* Name Input */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>推しの名前 *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="例: 桜山あかり"
              placeholderTextColor={colors.textLight}
              maxLength={30}
              autoFocus
            />
            <Text style={styles.charCount}>{name.length}/30</Text>
          </View>

          {/* Emoji Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>アイコン絵文字</Text>
            <View style={styles.emojiGrid}>
              {EMOJI_OPTIONS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.emojiChip,
                    selectedEmoji === emoji && styles.emojiChipSelected,
                    selectedEmoji === emoji && { backgroundColor: selectedColor + '20', borderColor: selectedColor },
                  ]}
                  onPress={() => setSelectedEmoji(emoji)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Color Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>テーマカラー</Text>
            <View style={styles.colorGrid}>
              {COLOR_OPTIONS.map(color => (
                <TouchableOpacity
                  key={color.value}
                  style={styles.colorChip}
                  onPress={() => setSelectedColor(color.value)}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.colorCircle,
                    { backgroundColor: color.value },
                    selectedColor === color.value && styles.colorCircleSelected,
                  ]}>
                    {selectedColor === color.value && (
                      <Text style={styles.colorCheck}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.colorLabel}>{color.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Budget */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>今月の予算（任意）</Text>
            <TextInput
              style={styles.input}
              value={budget}
              onChangeText={setBudget}
              placeholder="例: 10000"
              placeholderTextColor={colors.textLight}
              keyboardType="number-pad"
            />
            <Text style={styles.inputHint}>円単位で入力してください</Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveBtnGradient}
            >
              {saving ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.saveBtnText}>推しを登録する 💝</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.pinkSoft,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 18,
    color: colors.textMid,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textDark,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  previewAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  previewEmoji: {
    fontSize: 40,
  },
  previewName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textDark,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMid,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textDark,
    backgroundColor: colors.white,
  },
  charCount: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'right',
    marginTop: 4,
  },
  inputHint: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 4,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiChip: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  emojiChipSelected: {
    borderWidth: 2,
  },
  emojiText: {
    fontSize: 26,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorChip: {
    alignItems: 'center',
    gap: 4,
  },
  colorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  colorCheck: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  colorLabel: {
    fontSize: 11,
    color: colors.textMid,
  },
  saveBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: colors.pinkVivid,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
})
