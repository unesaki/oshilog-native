import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import FontAwesome5 from '@expo/vector-icons/FontAwesome5'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { supabase } from '@/lib/supabase'
import { Colors, CATEGORIES } from '@/constants/colors'
import { formatAmount, formatDate, lightenHex } from '@/lib/utils'
import { sanitizeText, validateOshiName, validateBudget, validateAmount, validateExpenseTitle, validateMemo, validateDate } from '@/lib/validate'
import type { Oshi, Expense, Budget } from '@/types'
import AppHeader, { HeaderTextButton } from '@/components/AppHeader'
import BottomTabBar from '@/components/BottomTabBar'
import NumpadModal from '@/components/NumpadModal'
import Toast from '@/components/Toast'
import { useToast } from '@/components/useToast'
import OshiIcon from '@/components/OshiIcon'
import { Fonts } from '@/constants/fonts'

type Category = 'goods' | 'ticket' | 'streaming' | 'photobook' | 'other'

function CategoryIcon({ category, size = 14 }: { category: string; size?: number }) {
  switch (category) {
    case 'goods': return <MaterialCommunityIcons name="teddy-bear" size={size} color="#E8956D" />
    case 'ticket': return <FontAwesome5 name="ticket-alt" size={size} color="#9B59B6" />
    case 'streaming': return <Ionicons name="tv-outline" size={size} color="#5BB8FF" />
    case 'photobook': return <Ionicons name="camera-outline" size={size} color="#FF8FB8" />
    default: return <Ionicons name="sparkles" size={size} color="#F59E0B" />
  }
}

export default function OshiDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { toast, showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [oshi, setOshi] = useState<Oshi | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [budget, setBudget] = useState<Budget | null>(null)
  const [currentYear, setCurrentYear] = useState(0)
  const [currentMonth, setCurrentMonth] = useState(0)

  // 推し編集
  const [oshiEditOpen, setOshiEditOpen] = useState(false)
  const [editOshiName, setEditOshiName] = useState('')
  const [editBudgetStr, setEditBudgetStr] = useState('')
  const [oshiNameError, setOshiNameError] = useState<string | null>(null)
  const [oshiBudgetError, setOshiBudgetError] = useState<string | null>(null)
  const [oshiSaving, setOshiSaving] = useState(false)
  const [deleteOshiConfirm, setDeleteOshiConfirm] = useState(false)

  // 支出アクション
  const [expenseMenuId, setExpenseMenuId] = useState<string | null>(null)
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  // 支出編集フォーム
  const [editAmountStr, setEditAmountStr] = useState('0')
  const [editNumpadOpen, setEditNumpadOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<Category>('goods')
  const [editTitle, setEditTitle] = useState('')
  const [editMemo, setEditMemo] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [expenseSaving, setExpenseSaving] = useState(false)
  const [dateModalOpen, setDateModalOpen] = useState(false)
  const [tempDate, setTempDate] = useState(new Date())

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`
    const monthStart = `${yearMonth}-01`
    const monthEnd = new Date(year, month, 0).toISOString().split('T')[0]

    setCurrentYear(year)
    setCurrentMonth(month)

    const [{ data: oshiData }, { data: expensesData }, { data: budgetData }] = await Promise.all([
      supabase.from('oshi').select('*').eq('id', id).single(),
      supabase.from('expenses').select('*').eq('oshi_id', id).gte('spent_at', monthStart).lte('spent_at', monthEnd).order('spent_at', { ascending: false }),
      supabase.from('budgets').select('*').eq('oshi_id', id).eq('year_month', yearMonth).maybeSingle(),
    ])

    setOshi(oshiData)
    setExpenses(expensesData ?? [])
    setBudget(budgetData)
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      fetchData().finally(() => setLoading(false))
    }, [id])
  )

  const color = oshi?.color || Colors.pinkVivid
  const lightColor = lightenHex(color, 0.35)
  const monthTotal = expenses.reduce((s, e) => s + e.amount, 0)
  const budgetAmount = budget?.amount ?? 0
  const percentage = budgetAmount > 0 ? Math.min((monthTotal / budgetAmount) * 100, 100) : 0
  const remaining = budgetAmount > 0 ? budgetAmount - monthTotal : null

  const categoryStats = CATEGORIES.map((cat) => ({
    ...cat,
    amount: expenses.filter((e) => e.category === cat.value).reduce((s, e) => s + e.amount, 0),
  }))
  const maxCatAmount = Math.max(...categoryStats.map((c) => c.amount), 1)

  function openOshiEdit() {
    setEditOshiName(oshi?.name ?? '')
    setEditBudgetStr(String(budget?.amount ?? ''))
    setOshiNameError(null)
    setOshiBudgetError(null)
    setDeleteOshiConfirm(false)
    setOshiEditOpen(true)
  }

  async function handleSaveOshi() {
    const nErr = validateOshiName(editOshiName)
    const bErr = editBudgetStr ? validateBudget(editBudgetStr) : null
    setOshiNameError(nErr)
    setOshiBudgetError(bErr)
    if (nErr || bErr || !oshi) return

    setOshiSaving(true)
    try {
      await supabase.from('oshi').update({ name: sanitizeText(editOshiName) }).eq('id', oshi.id)
      const yearMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
      const newBudgetAmount = editBudgetStr ? parseInt(editBudgetStr) : 0
      if (newBudgetAmount > 0) {
        if (budget) {
          await supabase.from('budgets').update({ amount: newBudgetAmount }).eq('id', budget.id)
        } else {
          await supabase.from('budgets').insert({ user_id: oshi.user_id, oshi_id: oshi.id, amount: newBudgetAmount, year_month: yearMonth })
        }
      } else if (budget) {
        await supabase.from('budgets').delete().eq('id', budget.id)
      }
      showToast('保存したよ')
      setOshiEditOpen(false)
      fetchData()
    } catch {
      showToast('保存できなかったよ… もう一度試してね', true)
    } finally {
      setOshiSaving(false)
    }
  }

  async function handleDeleteOshi() {
    if (!oshi) return
    try {
      await supabase.from('oshi').delete().eq('id', oshi.id)
      router.back()
    } catch {
      showToast('削除できなかったよ… もう一度試してね', true)
    }
  }

  function openEditExpense(expense: Expense) {
    setEditingExpense(expense)
    setEditAmountStr(String(expense.amount))
    setEditCategory(expense.category)
    setEditTitle(expense.title)
    setEditMemo(expense.memo ?? '')
    setEditDate(expense.spent_at)
    setEditErrors({})
    setExpenseMenuId(null)
  }

  function setEditFieldError(field: string, msg: string | null) {
    setEditErrors((prev) => {
      const next = { ...prev }
      if (msg) next[field] = msg
      else delete next[field]
      return next
    })
  }

  const editAmount = parseInt(editAmountStr) || 0

  function handleEditNumpad(key: string) {
    if (key === 'del') {
      setEditAmountStr((s) => (s.length <= 1 ? '0' : s.slice(0, -1)))
    } else if (key === 'ok') {
      const err = validateAmount(editAmount)
      setEditFieldError('amount', err)
      if (!err) setEditNumpadOpen(false)
    } else {
      setEditAmountStr((s) => {
        const next = s === '0' ? key : s + key
        if (parseInt(next) > 9_999_999) return s
        return next
      })
    }
  }

  async function handleSaveExpense() {
    const amountErr = validateAmount(editAmount)
    const titleErr = validateExpenseTitle(editTitle)
    const memoErr = validateMemo(editMemo)
    const dateErr = validateDate(editDate)
    const newErrors: Record<string, string> = {}
    if (amountErr) newErrors.amount = amountErr
    if (titleErr) newErrors.title = titleErr
    if (memoErr) newErrors.memo = memoErr
    if (dateErr) newErrors.date = dateErr
    setEditErrors(newErrors)
    if (Object.keys(newErrors).length > 0 || !editingExpense) return

    setExpenseSaving(true)
    try {
      const updates = {
        amount: editAmount,
        category: editCategory,
        title: sanitizeText(editTitle),
        memo: sanitizeText(editMemo) || null,
        spent_at: editDate,
      }
      await supabase.from('expenses').update(updates).eq('id', editingExpense.id)
      setExpenses((prev) => prev.map((e) => e.id === editingExpense.id ? { ...e, ...updates } : e))
      showToast('更新したよ')
      setEditingExpense(null)
    } catch {
      showToast('保存できなかったよ… もう一度試してね', true)
    } finally {
      setExpenseSaving(false)
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    try {
      await supabase.from('expenses').delete().eq('id', expenseId)
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId))
      setDeleteExpenseId(null)
      setExpenseMenuId(null)
      showToast('削除したよ')
    } catch {
      showToast('削除できなかったよ… もう一度試してね', true)
    }
  }

  if (loading || !oshi) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={Colors.pinkVivid} size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <AppHeader
        left={
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
        }
        right={
          <HeaderTextButton onPress={openOshiEdit} label="編集" />
        }
      />

      {/* ヒーローエリア */}
      <View style={[styles.hero, { backgroundColor: color }]}>
        <View style={styles.heroDecor} />
        <View style={styles.heroIconWrap}>
          <OshiIcon emoji={oshi.icon_emoji || '🌸'} size={28} color="rgba(255,255,255,0.9)" />
        </View>
        <Text style={styles.heroName}>{oshi.name}</Text>
        <Text style={styles.heroPeriod}>{currentYear}年{currentMonth}月の合計</Text>
        <Text style={styles.heroAmount}>¥{formatAmount(monthTotal)}</Text>
        {budgetAmount > 0 ? (
          <>
            <View style={styles.heroProgressBg}>
              <View style={[styles.heroProgressBar, { width: `${percentage}%` }]} />
            </View>
            <Text style={styles.heroBudgetText}>
              予算 ¥{formatAmount(budgetAmount)} まで
              {remaining !== null && remaining >= 0
                ? ` 残り ¥${formatAmount(remaining)}`
                : ' オーバー'}
            </Text>
          </>
        ) : (
          <Text style={styles.heroBudgetText}>予算未設定</Text>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchData(); setRefreshing(false) }} tintColor={Colors.pinkVivid} />
        }
      >
        {/* カテゴリ内訳 */}
        <View style={styles.sectionTitleRow}>
          <Ionicons name="bar-chart-outline" size={12} color="#8A5070" />
          <Text style={styles.sectionTitle}>カテゴリ内訳</Text>
        </View>
        <View style={styles.card}>
          {categoryStats.filter((c) => c.amount > 0).length === 0 ? (
            <Text style={styles.emptyText}>まだ記録がないよ</Text>
          ) : (
            categoryStats.filter((c) => c.amount > 0).map((cat) => (
              <View key={cat.value} style={styles.catRow}>
                <View style={{ width: 18, alignItems: 'center' }}>
                  <CategoryIcon category={cat.value} size={14} />
                </View>
                <Text style={styles.catLabel}>{cat.label}</Text>
                <View style={styles.catProgressBg}>
                  <View style={[styles.catProgressBar, { width: `${(cat.amount / maxCatAmount) * 100}%`, backgroundColor: color }]} />
                </View>
                <Text style={styles.catAmount}>¥{formatAmount(cat.amount)}</Text>
              </View>
            ))
          )}
        </View>

        {/* 支出履歴 */}
        <View style={[styles.sectionTitleRow, { marginTop: 12 }]}>
          <Ionicons name="document-text-outline" size={12} color="#8A5070" />
          <Text style={styles.sectionTitle}>支出履歴</Text>
        </View>
        {expenses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="heart" size={36} color={Colors.pinkLight} style={{ marginBottom: 10 }} />
            <Text style={styles.emptyCardText}>まだ記録がないよ{'\n'}支出を記録してみよう！</Text>
          </View>
        ) : (
          expenses.map((expense) => {
            const d = new Date(expense.spent_at)
            const dateStr = `${d.getMonth() + 1}/${d.getDate()}`
            const cat = CATEGORIES.find((c) => c.value === expense.category)
            return (
              <TouchableOpacity
                key={expense.id}
                style={styles.expenseRow}
                onPress={() => setExpenseMenuId(expense.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.expenseDate}>{dateStr}</Text>
                <View style={styles.expenseCatIcon}>
                  <CategoryIcon category={expense.category} size={13} />
                </View>
                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseTitle} numberOfLines={1}>{expense.title}</Text>
                  {expense.memo ? <Text style={styles.expenseMemo} numberOfLines={1}>{expense.memo}</Text> : null}
                </View>
                <Text style={styles.expenseAmount}>¥{formatAmount(expense.amount)}</Text>
                <Text style={styles.expenseArrow}>›</Text>
              </TouchableOpacity>
            )
          })
        )}
        <View style={{ height: 12 }} />
      </ScrollView>

      <BottomTabBar />
      <Toast message={toast.message} isError={toast.isError} visible={toast.visible} />

      {/* 推し編集シート */}
      <Modal visible={oshiEditOpen} transparent animationType="slide" onRequestClose={() => setOshiEditOpen(false)}>
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setOshiEditOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          {deleteOshiConfirm ? (
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Ionicons name="trash-outline" size={36} color="#ef4444" style={{ marginBottom: 8 }} />
              <Text style={styles.deleteTitle}>{oshi.name} を削除する</Text>
              <Text style={styles.deleteMsg}>この推しの支出データもすべて削除されます。{'\n'}この操作は取り消せません。</Text>
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteOshi} activeOpacity={0.8}>
                <Text style={styles.deleteBtnText}>削除する</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDeleteOshiConfirm(false)} activeOpacity={0.7}>
                <Text style={styles.cancelText}>キャンセル</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <View style={styles.sheetTitleIcon}>
                  <OshiIcon emoji={oshi.icon_emoji || '🌸'} size={16} color={Colors.pinkVivid} />
                </View>
                <Text style={styles.sheetTitle}>推しの設定</Text>
              </View>
              <Text style={styles.fieldLabel}>推しの名前</Text>
              <TextInput
                style={[styles.sheetInput, oshiNameError ? styles.sheetInputError : null]}
                value={editOshiName}
                onChangeText={(v) => { const s = sanitizeText(v); setEditOshiName(s); setOshiNameError(validateOshiName(s)) }}
                maxLength={31}
              />
              {oshiNameError ? <Text style={styles.errorText}>{oshiNameError}</Text> : null}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>今月の予算（任意）</Text>
              <View style={styles.budgetInputWrap}>
                <Text style={styles.yen}>¥</Text>
                <TextInput
                  style={[styles.sheetInput, { flex: 1, paddingLeft: 28 }, oshiBudgetError ? styles.sheetInputError : null]}
                  value={editBudgetStr}
                  onChangeText={(v) => { const d = v.replace(/[^\d]/g, ''); setEditBudgetStr(d); setOshiBudgetError(d ? validateBudget(d) : null) }}
                  keyboardType="number-pad"
                  placeholder="20000"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
              {oshiBudgetError ? <Text style={styles.errorText}>{oshiBudgetError}</Text> : null}
              <TouchableOpacity style={[styles.saveBtn, oshiSaving && styles.saveBtnDisabled]} onPress={handleSaveOshi} disabled={oshiSaving} activeOpacity={0.85}>
                <Text style={styles.saveBtnText}>{oshiSaving ? '保存中…' : '保存する'}</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.dangerBtn} onPress={() => setDeleteOshiConfirm(true)} activeOpacity={0.7}>
                <Text style={styles.dangerBtnText}>この推しを削除する</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      {/* 支出アクションシート */}
      <Modal visible={!!expenseMenuId} transparent animationType="slide" onRequestClose={() => { setExpenseMenuId(null); setDeleteExpenseId(null) }}>
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => { setExpenseMenuId(null); setDeleteExpenseId(null) }} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          {(() => {
            const target = expenses.find((e) => e.id === expenseMenuId)
            if (!target) return null
            return (
              <>
                <Text style={styles.expenseMenuTitle} numberOfLines={1}>{target.title}</Text>
                {deleteExpenseId === expenseMenuId ? (
                  <>
                    <Text style={styles.deleteMsg}>この支出を削除します。{'\n'}この操作は取り消せません。</Text>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteExpense(expenseMenuId!)} activeOpacity={0.8}>
                      <Text style={styles.deleteBtnText}>削除する</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteExpenseId(null)} activeOpacity={0.7}>
                      <Text style={styles.cancelBtnText}>キャンセル</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity style={styles.editExpenseBtn} onPress={() => openEditExpense(target)} activeOpacity={0.85}>
                      <Text style={styles.editExpenseBtnText}>編集する</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.dangerBtn} onPress={() => setDeleteExpenseId(expenseMenuId)} activeOpacity={0.7}>
                      <Text style={styles.dangerBtnText}>削除する</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )
          })()}
        </View>
      </Modal>

      {/* 支出編集オーバーレイ */}
      <Modal visible={!!editingExpense} animationType="slide" onRequestClose={() => setEditingExpense(null)}>
        <View style={styles.editOverlay}>
          <AppHeader
            left={<HeaderTextButton onPress={() => setEditingExpense(null)} label="✕ キャンセル" />}
            right={
              <TouchableOpacity
                style={[styles.saveHeaderBtn, expenseSaving && styles.saveHeaderBtnDisabled]}
                onPress={handleSaveExpense}
                disabled={expenseSaving}
                activeOpacity={0.85}
              >
                <Text style={styles.saveHeaderBtnText}>{expenseSaving ? '保存中…' : '保存する'}</Text>
              </TouchableOpacity>
            }
          />
          <ScrollView style={styles.editScroll} contentContainerStyle={styles.editScrollContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.pageTitle}>支出を編集する</Text>
            <TouchableOpacity style={[styles.amountBtn, editErrors.amount ? styles.amountBtnError : null]} onPress={() => setEditNumpadOpen(true)} activeOpacity={0.85}>
              <View>
                <Text style={styles.amountLabel}>金額</Text>
                <Text style={styles.amountValue}><Text style={styles.amountCurrency}>¥</Text>{formatAmount(editAmount)}</Text>
              </View>
              <Text style={styles.amountHint}>タップして変更 ›</Text>
            </TouchableOpacity>
            {editErrors.amount ? <Text style={styles.errorText}>{editErrors.amount}</Text> : null}

            <View style={styles.editSection}>
              <Text style={styles.editSectionLabel}>カテゴリ</Text>
              <View style={styles.categoryRow}>
                {CATEGORIES.map((cat) => {
                  const active = editCategory === cat.value
                  return (
                    <TouchableOpacity key={cat.value} style={[styles.categoryChip, active && styles.categoryChipActive]} onPress={() => setEditCategory(cat.value)} activeOpacity={0.7}>
                      <View style={styles.categoryChipInner}>
                        <CategoryIcon category={cat.value} size={12} />
                        <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{cat.label}</Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            <View style={styles.editSection}>
              <Text style={styles.editSectionLabel}>タイトル・メモ</Text>
              <TextInput
                style={[styles.input, editErrors.title ? styles.inputError : null]}
                placeholder="何を買った？（必須）"
                placeholderTextColor={Colors.textLight}
                value={editTitle}
                onChangeText={(v) => { const s = sanitizeText(v); setEditTitle(s); setEditFieldError('title', validateExpenseTitle(s)) }}
                maxLength={51}
              />
              {editErrors.title ? <Text style={styles.errorText}>{editErrors.title}</Text> : null}
              <TextInput
                style={[styles.input, editErrors.memo ? styles.inputError : null, { marginTop: 8 }]}
                placeholder="ひとことメモ（任意）"
                placeholderTextColor={Colors.textLight}
                value={editMemo}
                onChangeText={(v) => { const s = sanitizeText(v); setEditMemo(s); setEditFieldError('memo', validateMemo(s)) }}
                maxLength={201}
              />
              {editErrors.memo ? <Text style={styles.errorText}>{editErrors.memo}</Text> : null}
            </View>

            <View style={styles.editSection}>
              <Text style={styles.editSectionLabel}>日付</Text>
              <TouchableOpacity
                style={[styles.dateDisplay, editErrors.date ? styles.inputError : null]}
                onPress={() => {
                  setTempDate(editDate ? new Date(editDate) : new Date())
                  setDateModalOpen(true)
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.dateBtnText}>{editDate ? formatDate(editDate) : '日付を選択'}</Text>
                <Text style={styles.dateChangeHint}>変更 ›</Text>
              </TouchableOpacity>
              {editErrors.date ? <Text style={styles.errorText}>{editErrors.date}</Text> : null}
            </View>
          </ScrollView>

          <NumpadModal
            visible={editNumpadOpen}
            amount={editAmount}
            errorMessage={editErrors.amount}
            onKey={handleEditNumpad}
            onClose={() => setEditNumpadOpen(false)}
          />

          {/* 日付選択モーダル */}
          <Modal visible={dateModalOpen} transparent animationType="fade" onRequestClose={() => setDateModalOpen(false)}>
            <View style={styles.dateModalBackdrop}>
              <View style={styles.dateModalCard}>
                <Text style={styles.dateModalTitle}>日付を選択</Text>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={(_, selected) => { if (selected) setTempDate(selected) }}
                  locale="ja-JP"
                  maximumDate={new Date()}
                />
                <View style={styles.dateModalBtns}>
                  <TouchableOpacity style={styles.dateModalCancel} onPress={() => setDateModalOpen(false)} activeOpacity={0.7}>
                    <Text style={styles.dateModalCancelText}>キャンセル</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dateModalConfirm}
                    onPress={() => {
                      const y = tempDate.getFullYear()
                      const m = String(tempDate.getMonth() + 1).padStart(2, '0')
                      const d = String(tempDate.getDate()).padStart(2, '0')
                      setEditDate(`${y}-${m}-${d}`)
                      setEditFieldError('date', null)
                      setDateModalOpen(false)
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.dateModalConfirmText}>確定</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.pinkSoft, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 14, fontFamily: Fonts.zenMaruBold, color: Colors.textMid },
  // ヒーロー
  hero: {
    margin: 16, borderRadius: 22, padding: 20, position: 'relative', overflow: 'hidden',
  },
  heroDecor: {
    position: 'absolute', right: -16, top: -16,
    width: 100, height: 100, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 50,
  },
  heroIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  heroName: { fontSize: 20, fontFamily: Fonts.zenMaruBold, color: Colors.white, marginBottom: 2 },
  heroPeriod: { fontSize: 10, fontFamily: Fonts.zenMaruRegular, color: 'rgba(255,255,255,0.8)', letterSpacing: 0.5, marginBottom: 3 },
  heroAmount: { fontSize: 29, fontFamily: Fonts.zenMaruBold, color: Colors.white, letterSpacing: -0.5, marginBottom: 8 },
  heroProgressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 99, overflow: 'hidden', marginBottom: 4 },
  heroProgressBar: { height: '100%', borderRadius: 99, backgroundColor: Colors.white },
  heroBudgetText: { fontSize: 10, fontFamily: Fonts.zenMaruRegular, color: 'rgba(255,255,255,0.78)' },
  // スクロール
  scroll: { flex: 1 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 11, fontFamily: Fonts.zenMaruBold, color: Colors.textMid, letterSpacing: 1.5 },
  card: { marginHorizontal: 16, marginBottom: 12, backgroundColor: Colors.white, borderRadius: 16, padding: 14, shadowColor: Colors.pinkVivid, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  catLabel: { fontSize: 12, color: Colors.textMid, fontFamily: Fonts.zenMaruBold, flex: 1 },
  catProgressBg: { width: 68, height: 4, backgroundColor: Colors.pinkSoft, borderRadius: 99, overflow: 'hidden', flexShrink: 0 },
  catProgressBar: { height: '100%', borderRadius: 99 },
  catAmount: { fontSize: 12, fontFamily: Fonts.zenMaruBold, color: Colors.textDark, width: 52, textAlign: 'right', flexShrink: 0 },
  emptyText: { fontSize: 12, fontFamily: Fonts.zenMaruRegular, color: Colors.textLight, textAlign: 'center', paddingVertical: 8 },
  emptyCard: { marginHorizontal: 16, marginBottom: 6, backgroundColor: Colors.white, borderRadius: 12, padding: 36, alignItems: 'center', shadowColor: Colors.pinkVivid, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  emptyCardText: { fontSize: 13, fontFamily: Fonts.zenMaruRegular, color: Colors.textLight, textAlign: 'center', lineHeight: 22 },
  // 支出行
  expenseRow: { marginHorizontal: 16, marginBottom: 6, backgroundColor: Colors.white, borderRadius: 12, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9, shadowColor: Colors.pinkVivid, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  expenseDate: { fontSize: 9, color: Colors.textLight, fontFamily: Fonts.zenMaruBold, width: 26, textAlign: 'center', flexShrink: 0 },
  expenseCatIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.pinkSoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  expenseInfo: { flex: 1, minWidth: 0 },
  expenseTitle: { fontSize: 12, fontFamily: Fonts.zenMaruBold, color: Colors.textDark },
  expenseMemo: { fontSize: 9, fontFamily: Fonts.zenMaruRegular, color: Colors.textLight, marginTop: 1 },
  expenseAmount: { fontSize: 13, fontFamily: Fonts.zenMaruBold, color: Colors.textDark, flexShrink: 0 },
  expenseArrow: { fontSize: 16, fontFamily: Fonts.zenMaruRegular, color: Colors.textLight },
  // シート
  sheetBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(45,27,37,0.45)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40, shadowColor: Colors.pinkVivid, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.14, shadowRadius: 16, elevation: 20 },
  sheetHandle: { width: 36, height: 4, borderRadius: 999, backgroundColor: Colors.pinkSoft, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 16, fontFamily: Fonts.zenMaruBold, color: Colors.textDark },
  sheetTitleIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.pinkSoft, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: 10, fontFamily: Fonts.zenMaruBold, color: Colors.textMid, letterSpacing: 1, marginBottom: 6 },
  sheetInput: { height: 44, borderRadius: 12, borderWidth: 2, borderColor: Colors.pinkSoft, backgroundColor: Colors.white, paddingHorizontal: 14, fontSize: 14, fontFamily: Fonts.zenMaruBold, color: Colors.textDark },
  sheetInputError: { borderColor: Colors.error },
  budgetInputWrap: { position: 'relative', flexDirection: 'row', alignItems: 'center' },
  yen: { position: 'absolute', left: 14, zIndex: 1, fontSize: 14, color: '#999' },
  saveBtn: { height: 48, borderRadius: 12, backgroundColor: Colors.pinkVivid, alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 12, shadowColor: Colors.pinkVivid, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 5 },
  saveBtnDisabled: { backgroundColor: Colors.pinkLight, shadowOpacity: 0, elevation: 0 },
  saveBtnText: { color: Colors.white, fontSize: 15, fontFamily: Fonts.zenMaruBold },
  divider: { height: 1, backgroundColor: Colors.pinkSoft, marginVertical: 12 },
  dangerBtn: { height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.error, alignItems: 'center', justifyContent: 'center' },
  dangerBtnText: { color: Colors.error, fontSize: 14, fontFamily: Fonts.zenMaruBold },
  errorText: { fontSize: 10, color: Colors.error, marginTop: 2 },
  deleteTitle: { fontSize: 16, fontFamily: Fonts.zenMaruBold, color: Colors.textDark, marginBottom: 6 },
  deleteMsg: { fontSize: 12, fontFamily: Fonts.zenMaruRegular, color: Colors.textLight, lineHeight: 20, textAlign: 'center', marginBottom: 24 },
  deleteBtn: { width: '100%', height: 48, borderRadius: 12, backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  deleteBtnText: { color: Colors.white, fontSize: 15, fontFamily: Fonts.zenMaruBold },
  cancelText: { fontSize: 14, fontFamily: Fonts.zenMaruRegular, color: Colors.textLight, paddingVertical: 8 },
  cancelBtn: { width: '100%', height: 44, borderRadius: 12, backgroundColor: Colors.pinkSoft, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  cancelBtnText: { fontSize: 14, fontFamily: Fonts.zenMaruBold, color: Colors.textMid },
  expenseMenuTitle: { fontSize: 13, fontFamily: Fonts.zenMaruBold, color: Colors.textDark, textAlign: 'center', marginBottom: 16 },
  editExpenseBtn: { height: 52, borderRadius: 12, backgroundColor: Colors.pinkVivid, alignItems: 'center', justifyContent: 'center', marginBottom: 10, shadowColor: Colors.pinkVivid, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  editExpenseBtnText: { color: Colors.white, fontSize: 15, fontFamily: Fonts.zenMaruBold },
  // 支出編集オーバーレイ
  editOverlay: { flex: 1, backgroundColor: Colors.cream },
  editScroll: { flex: 1 },
  editScrollContent: { padding: 20, gap: 0 },
  pageTitle: { fontSize: 16, fontFamily: Fonts.zenMaruBold, color: Colors.textDark, marginBottom: 16 },
  amountBtn: { borderRadius: 18, backgroundColor: Colors.pinkVivid, paddingHorizontal: 22, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, shadowColor: Colors.pinkVivid, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 6 },
  amountBtnError: { backgroundColor: Colors.error },
  amountLabel: { fontSize: 10, fontFamily: Fonts.zenMaruRegular, color: 'rgba(255,255,255,0.8)', letterSpacing: 1, marginBottom: 4 },
  amountValue: { fontSize: 36, fontFamily: Fonts.zenMaruBold, color: Colors.white, letterSpacing: -0.5 },
  amountCurrency: { fontSize: 18, fontFamily: Fonts.zenMaruRegular, opacity: 0.7 },
  amountHint: { fontSize: 10, fontFamily: Fonts.zenMaruRegular, color: 'rgba(255,255,255,0.7)' },
  editSection: { marginTop: 16 },
  editSectionLabel: { fontSize: 10, fontFamily: Fonts.zenMaruBold, color: Colors.textMid, letterSpacing: 1.5, marginBottom: 7 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  categoryChip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 99, backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.pinkSoft },
  categoryChipActive: { backgroundColor: Colors.pinkVivid, borderColor: Colors.pinkVivid },
  categoryChipInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  categoryChipText: { fontSize: 11, fontFamily: Fonts.zenMaruBold, color: Colors.textMid },
  categoryChipTextActive: { color: Colors.white },
  input: { height: 44, borderRadius: 12, borderWidth: 2, borderColor: Colors.pinkSoft, backgroundColor: Colors.white, paddingHorizontal: 14, fontSize: 13, color: Colors.textDark },
  inputError: { borderColor: Colors.error },
  dateDisplay: { height: 44, borderRadius: 12, borderWidth: 2, borderColor: Colors.pinkSoft, backgroundColor: Colors.white, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateBtnText: { fontSize: 13, fontFamily: Fonts.zenMaruBold, color: Colors.textDark },
  dateChangeHint: { fontSize: 11, color: Colors.pinkVivid, fontFamily: Fonts.zenMaruRegular },
  dateModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  dateModalCard: { backgroundColor: Colors.white, borderRadius: 20, padding: 24, width: '100%', maxWidth: 340 },
  dateModalTitle: { fontSize: 15, fontFamily: Fonts.zenMaruBold, color: Colors.textDark, textAlign: 'center', marginBottom: 8 },
  dateModalBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  dateModalCancel: { flex: 1, height: 44, borderRadius: 12, backgroundColor: Colors.pinkSoft, alignItems: 'center', justifyContent: 'center' },
  dateModalCancelText: { fontSize: 14, fontFamily: Fonts.zenMaruBold, color: Colors.textMid },
  dateModalConfirm: { flex: 1, height: 44, borderRadius: 12, backgroundColor: Colors.pinkVivid, alignItems: 'center', justifyContent: 'center' },
  dateModalConfirmText: { fontSize: 14, fontFamily: Fonts.zenMaruBold, color: Colors.white },
  saveHeaderBtn: { height: 34, paddingHorizontal: 14, borderRadius: 99, backgroundColor: Colors.pinkVivid, alignItems: 'center', justifyContent: 'center' },
  saveHeaderBtnDisabled: { backgroundColor: Colors.pinkLight },
  saveHeaderBtnText: { fontSize: 12, fontFamily: Fonts.zenMaruBold, color: Colors.white },
})
