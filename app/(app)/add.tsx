import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Colors, CATEGORIES } from '@/constants/colors'
import { formatAmount, getLocalDateString, formatDate } from '@/lib/utils'
import { sanitizeText, validateAmount, validateExpenseTitle, validateMemo, validateDate } from '@/lib/validate'
import type { Oshi } from '@/types'
import AppHeader, { HeaderTextButton } from '@/components/AppHeader'
import NumpadModal from '@/components/NumpadModal'
import Toast from '@/components/Toast'
import { useToast } from '@/components/useToast'

type Category = 'goods' | 'ticket' | 'streaming' | 'photobook' | 'other'

export default function AddExpenseScreen() {
  const { toast, showToast } = useToast()

  const [oshis, setOshis] = useState<Oshi[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [amountStr, setAmountStr] = useState('0')
  const [numpadOpen, setNumpadOpen] = useState(false)
  const [selectedOshiId, setSelectedOshiId] = useState<string | null>(null)
  const [category, setCategory] = useState<Category>('goods')
  const [title, setTitle] = useState('')
  const [memo, setMemo] = useState('')
  const [date, setDate] = useState(getLocalDateString())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const amount = parseInt(amountStr) || 0

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase.from('oshi').select('*').eq('user_id', user.id).order('sort_order')
      setOshis(data ?? [])
      if (data && data.length > 0) setSelectedOshiId(data[0].id)
      setLoading(false)
    }
    init()
  }, [])

  function setFieldError(field: string, msg: string | null) {
    setErrors((prev) => {
      const next = { ...prev }
      if (msg) next[field] = msg
      else delete next[field]
      return next
    })
  }

  function handleNumpad(key: string) {
    if (key === 'del') {
      setAmountStr((s) => (s.length <= 1 ? '0' : s.slice(0, -1)))
    } else if (key === 'ok') {
      const err = validateAmount(amount)
      setFieldError('amount', err ?? '')
      if (!err) setNumpadOpen(false)
    } else {
      setAmountStr((s) => {
        const next = s === '0' ? key : s + key
        if (parseInt(next) > 9_999_999) return s
        return next
      })
    }
  }

  async function handleSubmit() {
    const amountErr = validateAmount(amount)
    const titleErr = validateExpenseTitle(title)
    const memoErr = validateMemo(memo)
    const dateErr = validateDate(date)
    const oshiErr = selectedOshiId ? null : '推しを選んでね'

    const newErrors: Record<string, string> = {}
    if (amountErr) newErrors.amount = amountErr
    if (titleErr) newErrors.title = titleErr
    if (memoErr) newErrors.memo = memoErr
    if (dateErr) newErrors.date = dateErr
    if (oshiErr) newErrors.oshi = oshiErr
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setSubmitting(true)
    try {
      const { error } = await supabase.from('expenses').insert({
        user_id: userId,
        oshi_id: selectedOshiId,
        amount,
        category,
        title: sanitizeText(title),
        memo: sanitizeText(memo) || null,
        spent_at: date,
      })
      if (error) throw error
      showToast('記録したよ🌸')
      setTimeout(() => router.back(), 800)
    } catch (err) {
      console.error('[expense insert error]', err)
      showToast('保存できなかったよ… もう一度試してね', true)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={Colors.pinkVivid} size="large" />
      </View>
    )
  }

  if (oshis.length === 0) {
    return (
      <View style={styles.container}>
        <AppHeader left={<HeaderTextButton onPress={() => router.back()} label="✕ キャンセル" />} />
        <View style={styles.emptyCenter}>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🌸</Text>
            <Text style={styles.emptyText}>まだ推しが登録されていないよ🌸{'\n'}追加してみよう！</Text>
            <TouchableOpacity
              style={styles.addOshiBtn}
              onPress={() => router.push('/oshi/new')}
              activeOpacity={0.8}
            >
              <Text style={styles.addOshiBtnText}>推しを追加する</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <AppHeader left={<HeaderTextButton onPress={() => router.back()} label="✕ キャンセル" />} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>支出を記録する</Text>

        {/* 金額 */}
        <TouchableOpacity
          style={[styles.amountBtn, errors.amount ? styles.amountBtnError : null]}
          onPress={() => setNumpadOpen(true)}
          activeOpacity={0.85}
        >
          <View>
            <Text style={styles.amountLabel}>金額</Text>
            <Text style={styles.amountValue}>
              <Text style={styles.amountCurrency}>¥</Text>
              {formatAmount(amount)}
            </Text>
          </View>
          <Text style={styles.amountHint}>タップして入力 ›</Text>
        </TouchableOpacity>
        {errors.amount ? <Text style={styles.errorText}>{errors.amount}</Text> : null}

        {/* 推し選択 */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>推しを選ぶ</Text>
            {errors.oshi ? <Text style={styles.errorText}>{errors.oshi}</Text> : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.oshiScroll}>
            <View style={styles.oshiRow}>
              {oshis.map((oshi) => {
                const selected = selectedOshiId === oshi.id
                const color = oshi.color || Colors.pinkVivid
                return (
                  <TouchableOpacity
                    key={oshi.id}
                    style={styles.oshiItem}
                    onPress={() => setSelectedOshiId(oshi.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.oshiAvatar,
                        { backgroundColor: `${color}66` },
                        selected && { borderColor: Colors.pinkVivid, borderWidth: 3 },
                      ]}
                    >
                      <Text style={{ fontSize: 20 }}>{oshi.icon_emoji}</Text>
                    </View>
                    <Text style={[styles.oshiName, selected && styles.oshiNameSelected]}>
                      {oshi.name}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </ScrollView>
        </View>

        {/* カテゴリ */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>カテゴリ</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => {
              const active = category === cat.value
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                  onPress={() => setCategory(cat.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                    {cat.emoji} {cat.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* タイトル・メモ */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>タイトル・メモ</Text>
          <TextInput
            style={[styles.input, errors.title ? styles.inputError : null]}
            placeholder="何を買った？（必須）"
            placeholderTextColor={Colors.textLight}
            value={title}
            onChangeText={(v) => {
              const s = sanitizeText(v)
              setTitle(s)
              setFieldError('title', validateExpenseTitle(s) ?? '')
            }}
            maxLength={51}
          />
          <View style={styles.inputMeta}>
            {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : <Text />}
            <Text style={[styles.charCount, title.length >= 45 ? styles.charCountError : null]}>
              {title.length}/50
            </Text>
          </View>
          <TextInput
            style={[styles.input, errors.memo ? styles.inputError : null, { marginTop: 8 }]}
            placeholder="ひとことメモ（任意）"
            placeholderTextColor={Colors.textLight}
            value={memo}
            onChangeText={(v) => {
              const s = sanitizeText(v)
              setMemo(s)
              setFieldError('memo', validateMemo(s) ?? '')
            }}
            maxLength={201}
          />
          {errors.memo ? <Text style={styles.errorText}>{errors.memo}</Text> : null}
        </View>

        {/* 日付 */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>日付</Text>
            {errors.date ? <Text style={styles.errorText}>{errors.date}</Text> : null}
          </View>
          <TouchableOpacity
            style={[styles.dateBtn, errors.date ? styles.inputError : null]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.dateBtnText}>{formatDate(date)}</Text>
            <Text style={styles.dateBtnHint}>変更 ›</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={new Date(date)}
            mode="date"
            display="spinner"
            onChange={(_, selected) => {
              setShowDatePicker(false)
              if (selected) {
                const str = selected.toISOString().split('T')[0]
                setDate(str)
                setFieldError('date', validateDate(str) ?? '')
              }
            }}
          />
        )}

        {/* 記録ボタン */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.submitBtnText}>記録する 🌸</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <NumpadModal
        visible={numpadOpen}
        amount={amount}
        errorMessage={errors.amount}
        onKey={handleNumpad}
        onClose={() => setNumpadOpen(false)}
      />

      <Toast message={toast.message} isError={toast.isError} visible={toast.visible} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 0,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 16,
  },
  // 金額
  amountBtn: {
    borderRadius: 18,
    backgroundColor: Colors.pinkVivid,
    paddingHorizontal: 22,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    shadowColor: Colors.pinkVivid,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  amountBtnError: {
    backgroundColor: Colors.error,
  },
  amountLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  amountCurrency: {
    fontSize: 18,
    fontWeight: '400',
    opacity: 0.7,
  },
  amountHint: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  // セクション
  section: {
    marginTop: 16,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 7,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMid,
    letterSpacing: 1.5,
    marginBottom: 7,
  },
  // 推し選択
  oshiScroll: {
    marginLeft: -4,
  },
  oshiRow: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 4,
  },
  oshiItem: {
    alignItems: 'center',
    gap: 4,
  },
  oshiAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oshiName: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textMid,
  },
  oshiNameSelected: {
    color: Colors.pinkVivid,
  },
  // カテゴリ
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.pinkSoft,
  },
  categoryChipActive: {
    backgroundColor: Colors.pinkVivid,
    borderColor: Colors.pinkVivid,
    shadowColor: Colors.pinkVivid,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMid,
  },
  categoryChipTextActive: {
    color: Colors.white,
  },
  // 入力
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.pinkSoft,
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    fontSize: 13,
    color: Colors.textDark,
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 2,
  },
  charCount: {
    fontSize: 9,
    color: Colors.textLight,
  },
  charCountError: {
    color: Colors.error,
  },
  errorText: {
    fontSize: 10,
    color: Colors.error,
  },
  // 日付
  dateBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.pinkSoft,
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textDark,
  },
  dateBtnHint: {
    fontSize: 11,
    color: Colors.textLight,
  },
  // 送信ボタン
  submitBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.pinkVivid,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: Colors.pinkVivid,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.38,
    shadowRadius: 9,
    elevation: 6,
  },
  submitBtnDisabled: {
    backgroundColor: Colors.pinkLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // 空状態
  emptyCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    width: '100%',
    shadowColor: Colors.pinkVivid,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMid,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  addOshiBtn: {
    paddingHorizontal: 32,
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: Colors.pinkVivid,
    shadowColor: Colors.pinkVivid,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  addOshiBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
})
