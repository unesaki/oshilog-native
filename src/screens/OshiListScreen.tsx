import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  Dimensions,
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
import { Oshi, Budget } from '../types'
import { RootStackParamList } from '../navigation/RootNavigator'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

const EMOJI_OPTIONS = [
  '🌸', '⭐', '💎', '🎀', '🌙', '☀️', '🦋', '🌺',
  '🍀', '🐾', '🎵', '🎤', '🎸', '👑', '🌈', '❤️',
  '💜', '💙', '💚', '🧡', '🌟', '✨', '🔥', '💫',
]

const COLOR_OPTIONS = [
  '#FF3D87', '#7B68EE', '#4A90D9', '#26C6DA',
  '#66BB6A', '#FF8C42', '#EF5350', '#FFCA28',
]

const DUMMY_OSHIS: Oshi[] = [
  {
    id: '1', user_id: 'dummy', name: '桜山あかり',
    color: '#FF3D87', icon_emoji: '🌸', icon_url: null,
    sort_order: 0, created_at: '',
  },
  {
    id: '2', user_id: 'dummy', name: '星野ゆい',
    color: '#7B68EE', icon_emoji: '⭐', icon_url: null,
    sort_order: 1, created_at: '',
  },
]

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>
  onBack?: () => void
}

export default function OshiListScreen({ navigation, onBack }: Props) {
  const { user } = useAuth()
  const [oshis, setOshis] = useState<Oshi[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [monthlyTotals, setMonthlyTotals] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [editTarget, setEditTarget] = useState<Oshi | null>(null)
  const [editName, setEditName] = useState('')
  const [editBudget, setEditBudget] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [editColor, setEditColor] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const sheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      const [oshisRes, budgetsRes, expensesRes] = await Promise.all([
        supabase.from('oshis').select('*').eq('user_id', user.id).order('sort_order'),
        supabase.from('budgets').select('*').eq('user_id', user.id).eq('year_month', currentMonth),
        supabase
          .from('expenses')
          .select('oshi_id, amount')
          .eq('user_id', user.id)
          .gte('spent_at', `${currentMonth}-01`)
          .lte('spent_at', `${currentMonth}-31`),
      ])

      if (!oshisRes.error) {
        setOshis(oshisRes.data ?? [])
      } else {
        throw oshisRes.error
      }
      setBudgets(budgetsRes.data ?? [])

      const totals: Record<string, number> = {}
      for (const e of expensesRes.data ?? []) {
        totals[e.oshi_id] = (totals[e.oshi_id] ?? 0) + e.amount
      }
      setMonthlyTotals(totals)
    } catch {
      // Supabase 未設定 or ネットワークエラー → ダミーデータ表示
      setOshis(DUMMY_OSHIS)
    } finally {
      setLoading(false)
    }
  }, [user, currentMonth])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openEdit = (oshi: Oshi) => {
    setEditTarget(oshi)
    setEditName(oshi.name)
    setEditEmoji(oshi.icon_emoji)
    setEditColor(oshi.color)
    const budget = budgets.find(b => b.oshi_id === oshi.id)
    setEditBudget(budget ? String(budget.amount) : '')
    setShowDeleteConfirm(false)
    Animated.spring(sheetAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start()
  }

  const closeEdit = () => {
    Animated.timing(sheetAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 280,
      useNativeDriver: true,
    }).start(() => {
      setEditTarget(null)
      setShowDeleteConfirm(false)
    })
  }

  const saveEdit = async () => {
    if (!editTarget || !user) return
    if (!editName.trim()) {
      Alert.alert('入力エラー', '推しの名前を入力してください')
      return
    }
    setSaving(true)
    try {
      await supabase
        .from('oshis')
        .update({ name: editName.trim(), icon_emoji: editEmoji, color: editColor })
        .eq('id', editTarget.id)

      if (editBudget.trim()) {
        const budgetAmount = parseInt(editBudget, 10)
        if (!isNaN(budgetAmount) && budgetAmount > 0) {
          const existing = budgets.find(b => b.oshi_id === editTarget.id)
          if (existing) {
            await supabase
              .from('budgets')
              .update({ amount: budgetAmount })
              .eq('id', existing.id)
          } else {
            await supabase.from('budgets').insert({
              user_id: user.id,
              oshi_id: editTarget.id,
              amount: budgetAmount,
              year_month: currentMonth,
            })
          }
        }
      }

      await loadData()
      closeEdit()
    } catch (error: any) {
      Alert.alert('エラー', error.message || '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const deleteOshi = async () => {
    if (!editTarget) return
    setSaving(true)
    try {
      await supabase.from('oshis').delete().eq('id', editTarget.id)
      await loadData()
      closeEdit()
    } catch (error: any) {
      Alert.alert('エラー', error.message || '削除に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const getBudget = (oshiId: string) => budgets.find(b => b.oshi_id === oshiId)?.amount ?? 0
  const getTotal = (oshiId: string) => monthlyTotals[oshiId] ?? 0
  const getProgress = (oshiId: string) => {
    const budget = getBudget(oshiId)
    if (budget === 0) return 0
    return Math.min(getTotal(oshiId) / budget, 1)
  }
  const formatAmount = (amount: number) => `¥${amount.toLocaleString('ja-JP')}`

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.pinkVivid} />
      </View>
    )
  }

  return (
    <View style={styles.wrapper}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          {onBack ? (
            <TouchableOpacity style={styles.headerBtn} onPress={onBack} activeOpacity={0.7}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerBtn} />
          )}
          <Text style={styles.headerLogo}>oshilog</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('OshiNew')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addBtnGradient}
            >
              <Text style={styles.addBtnText}>＋ 追加</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageTitle}>推し一覧</Text>
          <Text style={styles.pageSubtitle}>{now.getMonth() + 1}月の推し活まとめ</Text>

          {oshis.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyCard}
              onPress={() => navigation.navigate('OshiNew')}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyIcon}>💝</Text>
              <Text style={styles.emptyTitle}>推しを追加しよう</Text>
              <Text style={styles.emptySubtitle}>タップして最初の推しを登録</Text>
            </TouchableOpacity>
          ) : (
            oshis.map(oshi => {
              const spent = getTotal(oshi.id)
              const budget = getBudget(oshi.id)
              const ratio = getProgress(oshi.id)
              return (
                <View key={oshi.id} style={styles.oshiCard}>
                  <View style={styles.oshiCardTop}>
                    <View style={[styles.oshiAvatar, { backgroundColor: oshi.color + '30' }]}>
                      <Text style={styles.oshiEmoji}>{oshi.icon_emoji}</Text>
                    </View>
                    <View style={styles.oshiInfo}>
                      <Text style={styles.oshiName}>{oshi.name}</Text>
                      <Text style={styles.oshiSpent}>{formatAmount(spent)}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => openEdit(oshi)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.editBtnText}>編集</Text>
                    </TouchableOpacity>
                  </View>

                  {budget > 0 && (
                    <View style={styles.oshiCardBottom}>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${ratio * 100}%`,
                              backgroundColor: ratio >= 0.9 ? '#FF6B35' : oshi.color,
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.budgetRow}>
                        <Text style={styles.budgetText}>
                          予算 {formatAmount(budget)}
                        </Text>
                        <Text style={[
                          styles.budgetPercent,
                          { color: ratio >= 0.9 ? '#FF6B35' : colors.textMid },
                        ]}>
                          {Math.round(ratio * 100)}%
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )
            })
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Edit Bottom Sheet */}
      {editTarget && (
        <TouchableOpacity
          style={styles.sheetOverlay}
          onPress={closeEdit}
          activeOpacity={1}
        >
          <Animated.View
            style={[styles.sheet, { transform: [{ translateY: sheetAnim }] }]}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <TouchableOpacity activeOpacity={1}>
                <SafeAreaView edges={['bottom']}>
                  <View style={styles.sheetHandle} />

                  {showDeleteConfirm ? (
                    <View style={styles.sheetContent}>
                      <Text style={styles.sheetDeleteTitle}>
                        「{editTarget.name}」を削除しますか？
                      </Text>
                      <Text style={styles.sheetDeleteSub}>
                        削除すると支出記録も含めてすべて削除されます。この操作は取り消せません。
                      </Text>
                      <TouchableOpacity
                        style={styles.deleteConfirmBtn}
                        onPress={deleteOshi}
                        disabled={saving}
                        activeOpacity={0.8}
                      >
                        {saving ? (
                          <ActivityIndicator color={colors.white} size="small" />
                        ) : (
                          <Text style={styles.deleteConfirmBtnText}>削除する</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => setShowDeleteConfirm(false)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.cancelBtnText}>キャンセル</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
                    <View style={styles.sheetContent}>
                      <View style={styles.sheetHeader}>
                        <View style={[styles.sheetAvatar, { backgroundColor: editColor + '30' }]}>
                          <Text style={styles.sheetAvatarEmoji}>{editEmoji}</Text>
                        </View>
                        <Text style={styles.sheetTitle}>推しを編集</Text>
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>推しの名前</Text>
                        <TextInput
                          style={styles.input}
                          value={editName}
                          onChangeText={setEditName}
                          placeholder="名前を入力"
                          placeholderTextColor={colors.textLight}
                          maxLength={30}
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>アイコン絵文字</Text>
                        <View style={styles.emojiGrid}>
                          {EMOJI_OPTIONS.map(emoji => (
                            <TouchableOpacity
                              key={emoji}
                              style={[
                                styles.emojiChip,
                                editEmoji === emoji && { backgroundColor: editColor + '20', borderColor: editColor, borderWidth: 2 },
                              ]}
                              onPress={() => setEditEmoji(emoji)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.emojiText}>{emoji}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>テーマカラー</Text>
                        <View style={styles.colorRow}>
                          {COLOR_OPTIONS.map(color => (
                            <TouchableOpacity
                              key={color}
                              style={[
                                styles.colorCircle,
                                { backgroundColor: color },
                                editColor === color && styles.colorCircleSelected,
                              ]}
                              onPress={() => setEditColor(color)}
                              activeOpacity={0.8}
                            >
                              {editColor === color && (
                                <Text style={styles.colorCheck}>✓</Text>
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>今月の予算（円）</Text>
                        <TextInput
                          style={styles.input}
                          value={editBudget}
                          onChangeText={setEditBudget}
                          placeholder="例: 10000"
                          placeholderTextColor={colors.textLight}
                          keyboardType="number-pad"
                        />
                      </View>

                      <TouchableOpacity
                        style={styles.saveBtn}
                        onPress={saveEdit}
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
                            <Text style={styles.saveBtnText}>保存する</Text>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => setShowDeleteConfirm(true)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.deleteBtnText}>この推しを削除</Text>
                      </TouchableOpacity>
                    </View>
                    </ScrollView>
                  )}
                </SafeAreaView>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </Animated.View>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerBtn: {
    width: 60,
    height: 40,
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: colors.textDark,
    fontWeight: '600',
  },
  headerLogo: {
    fontSize: 22,
    fontStyle: 'italic',
    fontWeight: '800',
    color: colors.pinkVivid,
    letterSpacing: -0.5,
  },
  addBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  addBtnGradient: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  addBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: colors.textMid,
    marginBottom: 20,
  },
  emptyCard: {
    backgroundColor: colors.pinkSoft,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.pinkMid,
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMid,
  },
  oshiCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  oshiCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  oshiAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  oshiEmoji: {
    fontSize: 26,
  },
  oshiInfo: {
    flex: 1,
  },
  oshiName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 2,
  },
  oshiSpent: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.pinkVivid,
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMid,
  },
  oshiCardBottom: {
    marginTop: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.pinkSoft,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetText: {
    fontSize: 12,
    color: colors.textLight,
  },
  budgetPercent: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Bottom sheet
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(45, 27, 37, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sheetAvatarEmoji: {
    fontSize: 22,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMid,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textDark,
    backgroundColor: colors.cream,
  },
  saveBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  saveBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  deleteBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  sheetDeleteTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textDark,
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sheetDeleteSub: {
    fontSize: 13,
    color: colors.textMid,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  deleteConfirmBtn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteConfirmBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    color: colors.textMid,
    fontWeight: '600',
  },
  sheetScroll: {
    maxHeight: 540,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiChip: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  emojiText: {
    fontSize: 24,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: 16,
    fontWeight: '800',
  },
})
