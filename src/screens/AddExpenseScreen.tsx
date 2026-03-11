import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Dimensions,
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
import { Oshi } from '../types'
import { RootStackParamList } from '../navigation/RootNavigator'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

type Category = 'goods' | 'ticket' | 'streaming' | 'photobook' | 'other'

const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'goods', label: 'グッズ', emoji: '🧸' },
  { value: 'ticket', label: 'チケット', emoji: '🎫' },
  { value: 'streaming', label: '配信', emoji: '📺' },
  { value: 'photobook', label: '写真集', emoji: '📸' },
  { value: 'other', label: 'その他', emoji: '✨' },
]

const NUM_PAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '⌫']

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>
  route: { params?: { oshiId?: string } }
}

export default function AddExpenseScreen({ navigation, route }: Props) {
  const { user } = useAuth()
  const [oshis, setOshis] = useState<Oshi[]>([])
  const [selectedOshiId, setSelectedOshiId] = useState<string>(route.params?.oshiId ?? '')
  const [selectedCategory, setSelectedCategory] = useState<Category>('goods')
  const [amountStr, setAmountStr] = useState('0')
  const [title, setTitle] = useState('')
  const [memo, setMemo] = useState('')
  const [spentAt, setSpentAt] = useState(new Date().toISOString().slice(0, 10))
  const [showNumPad, setShowNumPad] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadOshis = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('oshis')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order')
    if (data && data.length > 0) {
      setOshis(data)
      if (!selectedOshiId && data.length > 0) {
        setSelectedOshiId(data[0].id)
      }
    }
  }, [user, selectedOshiId])

  useEffect(() => {
    loadOshis()
  }, [loadOshis])

  const handleNumPad = (key: string) => {
    if (key === '⌫') {
      setAmountStr(prev => (prev.length <= 1 ? '0' : prev.slice(0, -1)))
    } else if (key === '000') {
      setAmountStr(prev => {
        const next = prev === '0' ? '0' : prev + '000'
        return next.length > 9 ? prev : next
      })
    } else {
      setAmountStr(prev => {
        if (prev === '0') return key
        const next = prev + key
        return next.length > 9 ? prev : next
      })
    }
  }

  const handleSave = async () => {
    const amount = parseInt(amountStr, 10)
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('入力エラー', '金額を入力してください')
      return
    }
    if (!selectedOshiId) {
      Alert.alert('入力エラー', '推しを選択してください')
      return
    }
    if (!title.trim()) {
      Alert.alert('入力エラー', 'タイトルを入力してください')
      return
    }
    if (!user) return

    setSaving(true)
    try {
      const { error } = await supabase.from('expenses').insert({
        user_id: user.id,
        oshi_id: selectedOshiId,
        amount,
        category: selectedCategory,
        title: title.trim(),
        memo: memo.trim() || null,
        spent_at: spentAt,
      })
      if (error) throw error
      navigation.goBack()
    } catch (error: any) {
      Alert.alert('エラー', error.message || '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const formatDisplayAmount = (str: string) => {
    const num = parseInt(str, 10)
    if (isNaN(num)) return '0'
    return num.toLocaleString('ja-JP')
  }

  const formatDateDisplay = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-')
    return `${y}年${parseInt(m)}月${parseInt(d)}日`
  }

  const adjustDate = (days: number) => {
    const d = new Date(spentAt)
    d.setDate(d.getDate() + days)
    setSpentAt(d.toISOString().slice(0, 10))
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>支出を記録</Text>
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
          {/* Amount */}
          <TouchableOpacity
            style={styles.amountCard}
            onPress={() => setShowNumPad(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.amountLabel}>金額</Text>
            <Text style={styles.amountValue}>¥{formatDisplayAmount(amountStr)}</Text>
            <Text style={styles.amountHint}>タップして入力</Text>
          </TouchableOpacity>

          {/* Oshi Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>推し</Text>
            {oshis.length === 0 ? (
              <View style={styles.noOshiHint}>
                <Text style={styles.noOshiText}>推しを先に登録してください</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.oshiRow}
              >
                {oshis.map(oshi => (
                  <TouchableOpacity
                    key={oshi.id}
                    style={[
                      styles.oshiChip,
                      selectedOshiId === oshi.id && styles.oshiChipSelected,
                      selectedOshiId === oshi.id && { borderColor: oshi.color },
                    ]}
                    onPress={() => setSelectedOshiId(oshi.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[
                      styles.oshiAvatar,
                      { backgroundColor: oshi.color + '25' },
                    ]}>
                      <Text style={styles.oshiEmoji}>{oshi.icon_emoji}</Text>
                    </View>
                    <Text style={[
                      styles.oshiChipName,
                      selectedOshiId === oshi.id && { color: oshi.color, fontWeight: '700' },
                    ]}>
                      {oshi.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>カテゴリ</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat.value && styles.categoryChipSelected,
                  ]}
                  onPress={() => setSelectedCategory(cat.value)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text style={[
                    styles.categoryLabel,
                    selectedCategory === cat.value && styles.categoryLabelSelected,
                  ]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Title */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>タイトル</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="例: コンサートチケット"
              placeholderTextColor={colors.textLight}
              maxLength={50}
            />
          </View>

          {/* Memo */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>メモ（任意）</Text>
            <TextInput
              style={[styles.input, styles.memoInput]}
              value={memo}
              onChangeText={setMemo}
              placeholder="メモを入力"
              placeholderTextColor={colors.textLight}
              multiline
              maxLength={200}
            />
          </View>

          {/* Date */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>日付</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={styles.dateArrow}
                onPress={() => adjustDate(-1)}
                activeOpacity={0.7}
              >
                <Text style={styles.dateArrowText}>◀</Text>
              </TouchableOpacity>
              <View style={styles.datePill}>
                <Text style={styles.dateText}>{formatDateDisplay(spentAt)}</Text>
              </View>
              <TouchableOpacity
                style={styles.dateArrow}
                onPress={() => adjustDate(1)}
                activeOpacity={0.7}
              >
                <Text style={styles.dateArrowText}>▶</Text>
              </TouchableOpacity>
            </View>
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
                <Text style={styles.saveBtnText}>記録する 🌸</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* NumPad Modal */}
      <Modal
        visible={showNumPad}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNumPad(false)}
      >
        <TouchableOpacity
          style={styles.numPadOverlay}
          onPress={() => setShowNumPad(false)}
          activeOpacity={1}
        >
          <TouchableOpacity activeOpacity={1}>
            <SafeAreaView edges={['bottom']} style={styles.numPadSheet}>
              <View style={styles.numPadHandle} />
              <Text style={styles.numPadDisplay}>
                ¥{formatDisplayAmount(amountStr)}
              </Text>
              <View style={styles.numPadGrid}>
                {NUM_PAD_KEYS.map(key => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.numPadKey,
                      key === '⌫' && styles.numPadKeyDelete,
                    ]}
                    onPress={() => handleNumPad(key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.numPadKeyText,
                      key === '⌫' && styles.numPadKeyDeleteText,
                    ]}>
                      {key}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={styles.numPadDone}
                onPress={() => setShowNumPad(false)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[colors.gradientStart, colors.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.numPadDoneGradient}
                >
                  <Text style={styles.numPadDoneText}>決定</Text>
                </LinearGradient>
              </TouchableOpacity>
            </SafeAreaView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    paddingTop: 20,
  },
  amountCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  amountLabel: {
    fontSize: 13,
    color: colors.textLight,
    fontWeight: '600',
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.pinkVivid,
    letterSpacing: -1,
    marginBottom: 4,
  },
  amountHint: {
    fontSize: 12,
    color: colors.textLight,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMid,
    marginBottom: 10,
  },
  noOshiHint: {
    backgroundColor: colors.pinkSoft,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  noOshiText: {
    fontSize: 14,
    color: colors.textMid,
  },
  oshiRow: {
    paddingHorizontal: 2,
    paddingVertical: 2,
    gap: 10,
  },
  oshiChip: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    minWidth: 80,
  },
  oshiChipSelected: {
    backgroundColor: colors.pinkSoft,
    borderWidth: 2,
  },
  oshiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  oshiEmoji: {
    fontSize: 20,
  },
  oshiChipName: {
    fontSize: 12,
    color: colors.textMid,
    textAlign: 'center',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 6,
  },
  categoryChipSelected: {
    backgroundColor: colors.pinkSoft,
    borderColor: colors.pinkVivid,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: 13,
    color: colors.textMid,
    fontWeight: '600',
  },
  categoryLabelSelected: {
    color: colors.pinkVivid,
    fontWeight: '700',
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
  memoInput: {
    height: 88,
    textAlignVertical: 'top',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  dateArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.pinkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateArrowText: {
    fontSize: 14,
    color: colors.pinkVivid,
    fontWeight: '700',
  },
  datePill: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textDark,
  },
  saveBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
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
  // NumPad Modal
  numPadOverlay: {
    flex: 1,
    backgroundColor: 'rgba(45, 27, 37, 0.5)',
    justifyContent: 'flex-end',
  },
  numPadSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  numPadHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  numPadDisplay: {
    fontSize: 44,
    fontWeight: '800',
    color: colors.pinkVivid,
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: 16,
  },
  numPadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  numPadKey: {
    width: (SCREEN_WIDTH - 80) / 3,
    height: 60,
    backgroundColor: colors.cream,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  numPadKeyDelete: {
    backgroundColor: colors.pinkSoft,
  },
  numPadKeyText: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.textDark,
  },
  numPadKeyDeleteText: {
    fontSize: 22,
    color: colors.pinkVivid,
  },
  numPadDone: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 8,
  },
  numPadDoneGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  numPadDoneText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
})
