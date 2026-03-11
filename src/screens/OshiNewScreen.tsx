import React, { useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import { fonts } from '../constants/fonts'
import { PLAN_LIMITS, SUBSCRIPTION_PRICE_JPY } from '../constants'
import { validateOshiName, validateBudget, sanitizeText } from '../lib/validate'
import { RootStackParamList } from '../navigation/RootNavigator'

// Webアプリと同じ12個
const EMOJI_OPTIONS = ['🐰', '⭐', '🌿', '🌸', '💎', '🎀', '🦋', '🌙', '🔥', '💫', '🎭', '🎪']

// Webアプリと同じ12色
const COLOR_OPTIONS = [
  '#FF3D87', '#FF8FB8', '#FFB6D0', '#FF6B6B',
  '#FFA500', '#FFD700', '#98FB98', '#4CC47A',
  '#87CEEB', '#5BB8FF', '#DDA0DD', '#9B59B6',
]

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>
}

export default function OshiNewScreen({ navigation }: Props) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [selectedEmoji, setSelectedEmoji] = useState('🌸')
  const [selectedColor, setSelectedColor] = useState('#FF3D87')
  const [budget, setBudget] = useState('')
  const [budgetError, setBudgetError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showPremiumModal, setShowPremiumModal] = useState(false)

  const handleSave = async () => {
    const nameErr = validateOshiName(name)
    const budgetErr = validateBudget(budget)
    setNameError(nameErr)
    setBudgetError(budgetErr)
    if (nameErr || budgetErr) return
    if (!user) return

    setSaving(true)
    try {
      const { data: existingOshis } = await supabase
        .from('oshis')
        .select('id')
        .eq('user_id', user.id)

      const count = existingOshis?.length ?? 0

      // フリープラン上限チェック（3人）
      if (count >= PLAN_LIMITS.free.oshiCount) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('plan')
          .eq('user_id', user.id)
          .single()
        const isPremium = sub?.plan === 'premium'
        if (!isPremium) {
          setShowPremiumModal(true)
          setSaving(false)
          return
        }
      }

      const { data: newOshi, error: oshiError } = await supabase
        .from('oshis')
        .insert({
          user_id: user.id,
          name: sanitizeText(name),
          color: selectedColor,
          icon_emoji: selectedEmoji,
          icon_url: null,
          sort_order: count,
        })
        .select()
        .single()

      if (oshiError) throw oshiError

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

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
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

          {/* Name */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>推しの名前（必須）</Text>
            <TextInput
              style={[styles.input, nameError ? styles.inputError : null]}
              value={name}
              onChangeText={v => { setName(v); setNameError(validateOshiName(v)) }}
              placeholder="例: 桜山あかり"
              placeholderTextColor={colors.textLight}
              maxLength={30}
              autoFocus
            />
            <View style={styles.inputFooter}>
              {nameError ? (
                <Text style={styles.errorText}>{nameError}</Text>
              ) : (
                <View />
              )}
              <Text style={[styles.charCount, name.length >= 28 ? styles.charCountWarn : null]}>
                {name.length}/30
              </Text>
            </View>
          </View>

          {/* Emoji */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>アイコン絵文字</Text>
            <View style={styles.emojiGrid}>
              {EMOJI_OPTIONS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.emojiChip,
                    selectedEmoji === emoji && {
                      backgroundColor: selectedColor + '20',
                      borderColor: selectedColor,
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => setSelectedEmoji(emoji)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Color */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>テーマカラー</Text>
            <View style={styles.colorGrid}>
              {COLOR_OPTIONS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorCircleSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                  activeOpacity={0.8}
                >
                  {selectedColor === color && (
                    <Text style={styles.colorCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Budget */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>月の予算（任意）</Text>
            <TextInput
              style={[styles.input, budgetError ? styles.inputError : null]}
              value={budget}
              onChangeText={v => { setBudget(v); setBudgetError(validateBudget(v)) }}
              placeholder="20000"
              placeholderTextColor={colors.textLight}
              keyboardType="number-pad"
            />
            {budgetError ? <Text style={styles.errorText}>{budgetError}</Text> : null}
          </View>

          {/* Save */}
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

      {/* Premium Modal */}
      <Modal visible={showPremiumModal} transparent animationType="fade" onRequestClose={() => setShowPremiumModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>👑</Text>
            <Text style={styles.modalTitle}>プレミアムプランへアップグレード</Text>
            <Text style={styles.modalBody}>
              フリープランでは推しを{PLAN_LIMITS.free.oshiCount}人まで登録できます。{'\n'}
              4人以上登録するにはプレミアムプランが必要です。
            </Text>
            <View style={styles.modalPriceBadge}>
              <Text style={styles.modalPrice}>¥{SUBSCRIPTION_PRICE_JPY.toLocaleString('ja-JP')}/月</Text>
            </View>
            <TouchableOpacity style={styles.modalUpgradeBtn} activeOpacity={0.85}>
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modalUpgradeBtnGradient}
              >
                <Text style={styles.modalUpgradeBtnText}>アップグレードする</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowPremiumModal(false)} activeOpacity={0.7}>
              <Text style={styles.modalCancelText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.pinkSoft,
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 18, color: colors.textMid, fontFamily: fonts.body },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.textDark, fontFamily: fonts.bodyBold },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 24 },
  previewContainer: { alignItems: 'center', marginBottom: 28 },
  previewAvatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  previewEmoji: { fontSize: 40 },
  previewName: { fontSize: 20, fontWeight: '700', color: colors.textDark, fontFamily: fonts.bodyBold },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.textMid, marginBottom: 10, fontFamily: fonts.bodyMedium },
  input: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: colors.textDark, backgroundColor: colors.white,
    fontFamily: fonts.body,
  },
  inputError: { borderColor: '#EF5350' },
  inputFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  errorText: { fontSize: 12, color: '#EF5350', fontFamily: fonts.body },
  charCount: { fontSize: 12, color: colors.textLight, fontFamily: fonts.body },
  charCountWarn: { color: '#EF5350' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  emojiChip: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.border,
  },
  emojiText: { fontSize: 26 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  colorCircleSelected: {
    borderWidth: 3, borderColor: colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
  },
  colorCheck: { color: colors.white, fontSize: 18, fontWeight: '800' },
  saveBtn: { borderRadius: 14, overflow: 'hidden', shadowColor: colors.pinkVivid, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  saveBtnGradient: { paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: colors.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.3, fontFamily: fonts.bodyBold },
  // Premium Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(45,27,37,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalCard: { backgroundColor: colors.white, borderRadius: 24, padding: 28, alignItems: 'center', width: '100%' },
  modalEmoji: { fontSize: 48, marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textDark, textAlign: 'center', marginBottom: 12, fontFamily: fonts.bodyBold },
  modalBody: { fontSize: 14, color: colors.textMid, textAlign: 'center', lineHeight: 22, marginBottom: 16, fontFamily: fonts.body },
  modalPriceBadge: { backgroundColor: colors.pinkSoft, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 99, marginBottom: 20 },
  modalPrice: { fontSize: 16, fontWeight: '700', color: colors.pinkVivid, fontFamily: fonts.bodyBold },
  modalUpgradeBtn: { width: '100%', borderRadius: 14, overflow: 'hidden', marginBottom: 10 },
  modalUpgradeBtnGradient: { paddingVertical: 14, alignItems: 'center' },
  modalUpgradeBtnText: { color: colors.white, fontSize: 15, fontWeight: '700', fontFamily: fonts.bodyBold },
  modalCancelBtn: { paddingVertical: 10 },
  modalCancelText: { fontSize: 14, color: colors.textMid, fontFamily: fonts.body },
})
