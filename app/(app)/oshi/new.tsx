import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import FontAwesome5 from '@expo/vector-icons/FontAwesome5'
import { supabase } from '@/lib/supabase'
import { Colors, OSHI_EMOJIS, OSHI_COLORS } from '@/constants/colors'
import { sanitizeText, validateOshiName, validateBudget } from '@/lib/validate'
import { formatYearMonth } from '@/lib/utils'
import AppHeader, { HeaderTextButton } from '@/components/AppHeader'
import Toast from '@/components/Toast'
import { useToast } from '@/components/useToast'
import OshiIcon from '@/components/OshiIcon'
import { Fonts } from '@/constants/fonts'

export default function OshiNewScreen() {
  const { toast, showToast } = useToast()

  const [userId, setUserId] = useState<string | null>(null)
  const [oshiCount, setOshiCount] = useState(0)
  const [isPremium, setIsPremium] = useState(false)
  const [initializing, setInitializing] = useState(true)

  const [selectedEmoji, setSelectedEmoji] = useState('🌸')
  const [name, setName] = useState('')
  const [selectedColor, setSelectedColor] = useState('#FF3D87')
  const [budgetStr, setBudgetStr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [budgetError, setBudgetError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { count } = await supabase.from('oshi').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      setOshiCount(count ?? 0)
      // TODO: サブスクリプション状態を確認する
      setIsPremium(false)
      setInitializing(false)
    }
    init()
  }, [])

  async function handleSubmit() {
    const nameErr = validateOshiName(name)
    const budgetErr = validateBudget(budgetStr)
    setNameError(nameErr)
    setBudgetError(budgetErr)
    if (nameErr || budgetErr) return

    if (!isPremium && oshiCount >= 3) {
      setShowPremiumModal(true)
      return
    }

    setSubmitting(true)
    try {
      const { yearMonth } = formatYearMonth()
      const { data: newOshi, error: oshiError } = await supabase
        .from('oshi')
        .insert({
          user_id: userId,
          name: sanitizeText(name),
          color: selectedColor,
          icon_emoji: selectedEmoji,
          icon_url: null,
          sort_order: oshiCount,
        })
        .select()
        .single()

      if (oshiError) throw oshiError

      if (budgetStr && parseInt(budgetStr) > 0) {
        await supabase.from('budgets').insert({
          user_id: userId,
          oshi_id: newOshi.id,
          amount: parseInt(budgetStr),
          year_month: yearMonth,
        })
      }

      showToast('推しを登録したよ')
      setTimeout(() => router.back(), 800)
    } catch (err) {
      console.error('[oshi insert error]', err)
      showToast('保存できなかったよ… もう一度試してね', true)
      setSubmitting(false)
    }
  }

  if (initializing) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={Colors.pinkVivid} size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <AppHeader left={<HeaderTextButton onPress={() => router.back()} label="✕ キャンセル" />} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>推しを登録する</Text>

        {/* 絵文字選択 */}
        <View style={styles.section}>
          <View style={styles.emojiPreviewRow}>
            <View style={[styles.emojiPreview, { backgroundColor: `${selectedColor}22`, borderColor: `${selectedColor}66` }]}>
              <OshiIcon emoji={selectedEmoji} size={26} color={selectedColor} />
            </View>
            <Text style={styles.emojiHint}>アイコンを選んでね</Text>
          </View>
          <View style={styles.emojiGrid}>
            {OSHI_EMOJIS.map((emoji) => {
              const active = selectedEmoji === emoji
              return (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.emojiBtn, active && { borderColor: selectedColor, backgroundColor: `${selectedColor}18` }]}
                  onPress={() => setSelectedEmoji(emoji)}
                  activeOpacity={0.7}
                >
                  <OshiIcon emoji={emoji} size={22} color={active ? selectedColor : '#C49AB0'} />
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* 名前入力 */}
        <View style={styles.section}>
          <TextInput
            style={[styles.input, nameError ? styles.inputError : null]}
            placeholder="推しの名前（必須）"
            placeholderTextColor={Colors.textLight}
            value={name}
            onChangeText={(v) => {
              const s = sanitizeText(v)
              setName(s)
              setNameError(s ? validateOshiName(s) : null)
            }}
            maxLength={31}
          />
          <View style={styles.inputMeta}>
            {nameError ? <Text style={styles.errorText}>{nameError}</Text> : <Text />}
            <Text style={[styles.charCount, name.length >= 28 ? styles.charCountError : null]}>
              {name.length}/30
            </Text>
          </View>
        </View>

        {/* カラー選択 */}
        <View style={styles.section}>
          <Text style={styles.sectionHint}>推し色を選んでね</Text>
          <View style={styles.colorGrid}>
            {OSHI_COLORS.map((color) => {
              const active = selectedColor === color
              return (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorBtn,
                    { backgroundColor: color },
                    active && { borderWidth: 3, borderColor: Colors.white },
                  ]}
                  onPress={() => setSelectedColor(color)}
                  activeOpacity={0.7}
                >
                  {active && <Ionicons name="checkmark" size={16} color={Colors.white} style={{ lineHeight: 16 }} />}
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* 予算 */}
        <View style={styles.section}>
          <Text style={styles.sectionHint}>月の予算（任意）</Text>
          <View style={styles.budgetInputWrap}>
            <Text style={styles.yen}>¥</Text>
            <TextInput
              style={[styles.input, { flex: 1, paddingLeft: 28 }, budgetError ? styles.inputError : null]}
              keyboardType="number-pad"
              placeholder="20000"
              placeholderTextColor={Colors.textLight}
              value={budgetStr}
              onChangeText={(v) => {
                const d = v.replace(/[^\d]/g, '')
                setBudgetStr(d)
                setBudgetError(d ? validateBudget(d) : null)
              }}
            />
          </View>
          {budgetError ? <Text style={styles.errorText}>{budgetError}</Text> : null}
        </View>

        {/* 登録ボタン */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.submitBtnText}>登録する</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* プレミアム誘導モーダル */}
      <Modal visible={showPremiumModal} transparent animationType="fade" onRequestClose={() => setShowPremiumModal(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowPremiumModal(false)}
        >
          <TouchableOpacity style={styles.premiumModal} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <FontAwesome5 name="gem" size={44} color="#9B59B6" style={{ marginBottom: 12 }} />
            <Text style={styles.premiumTitle}>プレミアムプランへ{'\n'}アップグレードしよう！</Text>
            <Text style={styles.premiumDesc}>
              無料プランでは推しは<Text style={{ color: Colors.pinkVivid, fontFamily: Fonts.zenMaruBold }}>3人まで</Text>登録できます。{'\n'}
              プレミアムプランなら<Text style={{ color: Colors.pinkVivid, fontFamily: Fonts.zenMaruBold }}>無制限</Text>に登録できます！
            </Text>
            <View style={styles.planRow}>
              <View style={styles.planFree}>
                <Text style={styles.planFreeLabel}>無料</Text>
                <Text style={styles.planFreeValue}>推し 3人まで</Text>
              </View>
              <View style={styles.planPremium}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <FontAwesome5 name="gem" size={10} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.planPremiumLabel}>プレミアム</Text>
                </View>
                <Text style={styles.planPremiumValue}>推し 無制限</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={() => { setShowPremiumModal(false); router.push('/upgrade') }}
              activeOpacity={0.85}
            >
              <Text style={styles.upgradeBtnText}>プレミアムプランを見る →</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPremiumModal(false)} activeOpacity={0.7}>
              <Text style={styles.modalCancelText}>キャンセル</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Toast message={toast.message} isError={toast.isError} visible={toast.visible} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10 },
  pageTitle: { fontSize: 17, fontFamily: Fonts.zenMaruBold, color: Colors.textDark, marginBottom: 4 },
  section: { gap: 0 },
  sectionHint: { fontSize: 12, color: '#888', fontFamily: Fonts.zenMaruBold, marginBottom: 6 },
  // 絵文字
  emojiPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  emojiPreview: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
  },
  emojiHint: { fontSize: 12, fontFamily: Fonts.zenMaruRegular, color: '#aaa' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  emojiBtn: {
    width: '14.5%', aspectRatio: 1, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.pinkSoft, borderWidth: 2, borderColor: 'transparent',
  },
  // 入力
  input: {
    height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.pinkSoft,
    backgroundColor: Colors.white, paddingHorizontal: 14,
    fontSize: 14, color: Colors.textDark,
  },
  inputError: { borderColor: Colors.error },
  inputMeta: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 3 },
  charCount: { fontSize: 10, fontFamily: Fonts.zenMaruRegular, color: Colors.textLight },
  charCountError: { color: Colors.error },
  errorText: { fontSize: 10, color: Colors.error, marginTop: 2 },
  // カラー
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorBtn: {
    width: '14%', aspectRatio: 1, borderRadius: 99,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 2, elevation: 2,
  },
  // 予算
  budgetInputWrap: { position: 'relative', flexDirection: 'row', alignItems: 'center' },
  yen: { position: 'absolute', left: 14, zIndex: 1, fontSize: 14, color: '#999' },
  // 送信
  submitBtn: {
    height: 52, borderRadius: 14, backgroundColor: Colors.pinkVivid,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
    shadowColor: Colors.pinkVivid, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38, shadowRadius: 9, elevation: 6,
  },
  submitBtnDisabled: { backgroundColor: Colors.pinkLight, shadowOpacity: 0, elevation: 0 },
  submitBtnText: { color: Colors.white, fontSize: 16, fontFamily: Fonts.zenMaruBold },
  // モーダル
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.50)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  premiumModal: {
    backgroundColor: Colors.white, borderRadius: 24, padding: 32,
    width: '100%', maxWidth: 340, alignItems: 'center',
  },
  premiumTitle: { fontSize: 17, fontFamily: Fonts.zenMaruBold, color: Colors.textDark, textAlign: 'center', marginBottom: 10, lineHeight: 24 },
  premiumDesc: { fontSize: 13, fontFamily: Fonts.zenMaruRegular, color: '#999', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  planRow: { flexDirection: 'row', gap: 8, marginBottom: 24, width: '100%' },
  planFree: {
    flex: 1, backgroundColor: Colors.cream, borderRadius: 12,
    padding: 12, borderWidth: 1.5, borderColor: Colors.pinkSoft, alignItems: 'center',
  },
  planFreeLabel: { fontSize: 11, fontFamily: Fonts.zenMaruRegular, color: '#aaa', marginBottom: 4 },
  planFreeValue: { fontSize: 13, fontFamily: Fonts.zenMaruBold, color: '#555' },
  planPremium: {
    flex: 1, backgroundColor: Colors.pinkVivid, borderRadius: 12, padding: 12, alignItems: 'center',
  },
  planPremiumLabel: { fontSize: 11, fontFamily: Fonts.zenMaruRegular, color: 'rgba(255,255,255,0.8)' },
  planPremiumValue: { fontSize: 13, fontFamily: Fonts.zenMaruBold, color: Colors.white },
  upgradeBtn: {
    height: 48, borderRadius: 12, backgroundColor: Colors.pinkVivid,
    paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center',
    width: '100%', marginBottom: 10,
    shadowColor: Colors.pinkVivid, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
  },
  upgradeBtnText: { color: Colors.white, fontSize: 15, fontFamily: Fonts.zenMaruBold },
  modalCancelText: { fontSize: 14, fontFamily: Fonts.zenMaruRegular, color: '#aaa', paddingVertical: 8 },
})
