import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/colors'
import { formatAmount, lightenHex } from '@/lib/utils'
import { sanitizeText, validateOshiName, validateBudget } from '@/lib/validate'
import type { Oshi, Budget } from '@/types'
import AppHeader, { HeaderTextButton } from '@/components/AppHeader'
import BottomTabBar from '@/components/BottomTabBar'
import Toast from '@/components/Toast'
import { useToast } from '@/components/useToast'
import OshiIcon from '@/components/OshiIcon'
import { Fonts } from '@/constants/fonts'

type ExpenseSummary = { id: string; oshi_id: string; amount: number }

export default function OshiListScreen() {
  const { toast, showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [oshis, setOshis] = useState<Oshi[]>([])
  const [expenses, setExpenses] = useState<ExpenseSummary[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [currentYear, setCurrentYear] = useState(0)
  const [currentMonth, setCurrentMonth] = useState(0)

  const [editingOshi, setEditingOshi] = useState<Oshi | null>(null)
  const [editName, setEditName] = useState('')
  const [editBudgetStr, setEditBudgetStr] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [budgetError, setBudgetError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

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

    const [{ data: oshisData }, { data: expensesData }, { data: budgetsData }] = await Promise.all([
      supabase.from('oshi').select('*').eq('user_id', user.id).order('sort_order'),
      supabase.from('expenses').select('id,oshi_id,amount').eq('user_id', user.id).gte('spent_at', monthStart).lte('spent_at', monthEnd),
      supabase.from('budgets').select('*').eq('user_id', user.id).eq('year_month', yearMonth),
    ])

    setOshis(oshisData ?? [])
    setExpenses(expensesData ?? [])
    setBudgets(budgetsData ?? [])
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      fetchData().finally(() => setLoading(false))
    }, [])
  )

  function openEdit(oshi: Oshi) {
    const budget = budgets.find((b) => b.oshi_id === oshi.id)
    setEditingOshi(oshi)
    setEditName(oshi.name)
    setEditBudgetStr(String(budget?.amount ?? ''))
    setNameError(null)
    setBudgetError(null)
    setDeleteConfirm(false)
  }

  async function handleSave() {
    const nErr = validateOshiName(editName)
    const bErr = editBudgetStr ? validateBudget(editBudgetStr) : null
    setNameError(nErr)
    setBudgetError(bErr)
    if (nErr || bErr || !editingOshi) return

    setSaving(true)
    try {
      const newName = sanitizeText(editName)
      const yearMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
      const existingBudget = budgets.find((b) => b.oshi_id === editingOshi.id)
      const newAmount = editBudgetStr ? parseInt(editBudgetStr) : 0

      await supabase.from('oshi').update({ name: newName }).eq('id', editingOshi.id)

      if (newAmount > 0) {
        if (existingBudget) {
          await supabase.from('budgets').update({ amount: newAmount }).eq('id', existingBudget.id)
          setBudgets((prev) => prev.map((b) => b.id === existingBudget.id ? { ...b, amount: newAmount } : b))
        } else {
          const { data: newBudget } = await supabase.from('budgets').insert({
            user_id: editingOshi.user_id,
            oshi_id: editingOshi.id,
            amount: newAmount,
            year_month: yearMonth,
          }).select().single()
          if (newBudget) setBudgets((prev) => [...prev, newBudget])
        }
      } else if (existingBudget) {
        await supabase.from('budgets').delete().eq('id', existingBudget.id)
        setBudgets((prev) => prev.filter((b) => b.id !== existingBudget.id))
      }

      setOshis((prev) => prev.map((o) => o.id === editingOshi.id ? { ...o, name: newName } : o))
      showToast('保存したよ🌸')
      setEditingOshi(null)
    } catch (err) {
      console.error('[oshi update error]', err)
      showToast('保存できなかったよ… もう一度試してね', true)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editingOshi) return
    try {
      await supabase.from('oshi').delete().eq('id', editingOshi.id)
      setOshis((prev) => prev.filter((o) => o.id !== editingOshi.id))
      setBudgets((prev) => prev.filter((b) => b.oshi_id !== editingOshi.id))
      setEditingOshi(null)
      showToast('削除したよ')
    } catch (err) {
      console.error('[oshi delete error]', err)
      showToast('削除できなかったよ… もう一度試してね', true)
    }
  }

  if (loading) {
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
          <HeaderTextButton
            onPress={() => router.push('/oshi/new')}
            label="＋ 追加"
            variant="primary"
          />
        }
      />

      <View style={styles.listHeader}>
        <View style={styles.listTitleRow}>
          <Ionicons name="heart" size={12} color="#FF3D87" />
          <Text style={styles.listTitle}>推し一覧</Text>
        </View>
        <Text style={styles.listCount}>{oshis.length}人</Text>
        <Text style={styles.listPeriod}>{currentYear}年{currentMonth}月</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchData(); setRefreshing(false) }} tintColor={Colors.pinkVivid} />
        }
      >
        {oshis.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🌸</Text>
            <Text style={styles.emptyText}>まだ推しが登録されていないよ🌸</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/oshi/new')} activeOpacity={0.8}>
              <Text style={styles.addBtnText}>推しを追加する</Text>
            </TouchableOpacity>
          </View>
        ) : (
          oshis.map((oshi) => {
            const spend = expenses.filter((e) => e.oshi_id === oshi.id).reduce((s, e) => s + e.amount, 0)
            const budget = budgets.find((b) => b.oshi_id === oshi.id)?.amount ?? 0
            const percentage = budget > 0 ? Math.min((spend / budget) * 100, 100) : 0
            const isOver = percentage >= 90
            const color = oshi.color || Colors.pinkVivid
            const lightColor = lightenHex(color, 0.35)

            return (
              <View key={oshi.id} style={styles.oshiCard}>
                <TouchableOpacity
                  style={styles.oshiCardInner}
                  onPress={() => router.push(`/oshi/${oshi.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.avatar, { backgroundColor: `${color}88` }]}>
                    <OshiIcon emoji={oshi.icon_emoji || '🌸'} size={20} color={color} />
                  </View>
                  <View style={styles.oshiInfo}>
                    <Text style={styles.oshiName} numberOfLines={1}>{oshi.name}</Text>
                    {budget > 0 ? (
                      <View style={styles.progressRow}>
                        <View style={styles.progressBg}>
                          <View
                            style={[
                              styles.progressBar,
                              { width: `${percentage}%`, backgroundColor: isOver ? Colors.error : color },
                            ]}
                          />
                        </View>
                        <Text style={styles.progressLabel}>
                          {formatAmount(spend)} / {formatAmount(budget)}円
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.noBudgetLabel}>予算未設定</Text>
                    )}
                  </View>
                  <Text style={styles.spendAmount}>¥{formatAmount(spend)}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => openEdit(oshi)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editBtnText}>編集</Text>
                </TouchableOpacity>
              </View>
            )
          })
        )}
      </ScrollView>

      <BottomTabBar />
      <Toast message={toast.message} isError={toast.isError} visible={toast.visible} />

      {/* 編集シート */}
      <Modal visible={!!editingOshi} transparent animationType="slide" onRequestClose={() => setEditingOshi(null)}>
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setEditingOshi(null)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          {deleteConfirm ? (
            <View style={styles.deleteConfirm}>
              <Ionicons name="trash-outline" size={36} color="#ef4444" style={{ marginBottom: 8 }} />
              <Text style={styles.deleteTitle}>{editingOshi?.name} を削除する</Text>
              <Text style={styles.deleteMsg}>この推しの支出データもすべて削除されます。{'\n'}この操作は取り消せません。</Text>
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
                <Text style={styles.deleteBtnText}>削除する</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDeleteConfirm(false)} activeOpacity={0.7}>
                <Text style={styles.cancelText}>キャンセル</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <View style={styles.sheetTitleIcon}>
                  <OshiIcon emoji={editingOshi?.icon_emoji || '🌸'} size={16} color={Colors.pinkVivid} />
                </View>
                <Text style={styles.sheetTitle}>{editingOshi?.name} の設定</Text>
              </View>
              <Text style={styles.fieldLabel}>推しの名前</Text>
              <TextInput
                style={[styles.sheetInput, nameError ? styles.sheetInputError : null]}
                value={editName}
                onChangeText={(v) => { const s = sanitizeText(v); setEditName(s); setNameError(validateOshiName(s)) }}
                maxLength={31}
              />
              {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>今月の予算（任意）</Text>
              <View style={styles.budgetInputWrap}>
                <Text style={styles.yen}>¥</Text>
                <TextInput
                  style={[styles.sheetInput, { flex: 1, paddingLeft: 28 }, budgetError ? styles.sheetInputError : null]}
                  value={editBudgetStr}
                  onChangeText={(v) => { const d = v.replace(/[^\d]/g, ''); setEditBudgetStr(d); setBudgetError(d ? validateBudget(d) : null) }}
                  keyboardType="number-pad"
                  placeholder="20000"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
              {budgetError ? <Text style={styles.errorText}>{budgetError}</Text> : null}

              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                <Text style={styles.saveBtnText}>{saving ? '保存中…' : '保存する'}</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.dangerBtn}
                onPress={() => setDeleteConfirm(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dangerBtnText}>この推しを削除する</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 8 },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.pinkSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { fontSize: 14, fontFamily: Fonts.zenMaruBold, color: Colors.textMid },
  listHeader: {
    flexDirection: 'row', alignItems: 'baseline', gap: 6,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6,
  },
  listTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  listTitle: { fontSize: 11, fontFamily: Fonts.zenMaruBold, color: Colors.textMid, letterSpacing: 1.5 },
  listCount: { fontSize: 10, fontFamily: Fonts.zenMaruRegular, color: Colors.textLight },
  listPeriod: { fontSize: 10, fontFamily: Fonts.zenMaruRegular, color: Colors.textLight, marginLeft: 'auto' },
  oshiCard: {
    backgroundColor: Colors.white, borderRadius: 16,
    shadowColor: Colors.pinkVivid, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 3, overflow: 'hidden',
  },
  oshiCardInner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, paddingRight: 8,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  oshiInfo: { flex: 1, minWidth: 0 },
  oshiName: { fontSize: 14, fontFamily: Fonts.zenMaruBold, color: Colors.textDark, marginBottom: 5 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressBg: { flex: 1, height: 4, borderRadius: 99, backgroundColor: Colors.pinkSoft, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 99 },
  progressLabel: { fontSize: 9, color: Colors.textLight, flexShrink: 0 },
  noBudgetLabel: { fontSize: 10, fontFamily: Fonts.zenMaruRegular, color: Colors.textLight },
  spendAmount: { fontSize: 15, fontFamily: Fonts.zenMaruBold, color: Colors.textDark, flexShrink: 0 },
  editBtn: {
    height: 30, paddingHorizontal: 12, borderRadius: 99,
    backgroundColor: Colors.pinkSoft, alignSelf: 'center',
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  editBtnText: { fontSize: 11, fontFamily: Fonts.zenMaruBold, color: Colors.textMid },
  emptyCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 40,
    alignItems: 'center', marginTop: 8,
    shadowColor: Colors.pinkVivid, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 10 },
  emptyText: { fontSize: 13, fontFamily: Fonts.zenMaruRegular, color: Colors.textLight, marginBottom: 20, lineHeight: 20 },
  addBtn: {
    paddingHorizontal: 28, paddingVertical: 11, borderRadius: 999,
    backgroundColor: Colors.pinkVivid,
    shadowColor: Colors.pinkVivid, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 7, elevation: 5,
  },
  addBtnText: { color: Colors.white, fontSize: 14, fontFamily: Fonts.zenMaruBold },
  // Sheet
  sheetBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(45,27,37,0.45)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40,
    shadowColor: Colors.pinkVivid,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14, shadowRadius: 16, elevation: 20,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 999, backgroundColor: Colors.pinkSoft,
    alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle: { fontSize: 16, fontFamily: Fonts.zenMaruBold, color: Colors.textDark },
  sheetTitleIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.pinkSoft, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: 10, fontFamily: Fonts.zenMaruBold, color: Colors.textMid, letterSpacing: 1, marginBottom: 6 },
  sheetInput: {
    height: 44, borderRadius: 12, borderWidth: 2, borderColor: Colors.pinkSoft,
    backgroundColor: Colors.white, paddingHorizontal: 14,
    fontSize: 14, fontFamily: Fonts.zenMaruBold, color: Colors.textDark,
  },
  sheetInputError: { borderColor: Colors.error },
  budgetInputWrap: { position: 'relative', flexDirection: 'row', alignItems: 'center' },
  yen: { position: 'absolute', left: 14, zIndex: 1, fontSize: 14, color: '#999' },
  saveBtn: {
    height: 48, borderRadius: 12, backgroundColor: Colors.pinkVivid,
    alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 12,
    shadowColor: Colors.pinkVivid, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
  },
  saveBtnDisabled: { backgroundColor: Colors.pinkLight, shadowOpacity: 0, elevation: 0 },
  saveBtnText: { color: Colors.white, fontSize: 15, fontFamily: Fonts.zenMaruBold },
  divider: { height: 1, backgroundColor: Colors.pinkSoft, marginVertical: 12 },
  dangerBtn: {
    height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.error,
    alignItems: 'center', justifyContent: 'center',
  },
  dangerBtnText: { color: Colors.error, fontSize: 14, fontFamily: Fonts.zenMaruBold },
  errorText: { fontSize: 10, color: Colors.error, marginTop: 2 },
  // Delete confirm
  deleteConfirm: { alignItems: 'center', paddingVertical: 8 },
  deleteTitle: { fontSize: 16, fontFamily: Fonts.zenMaruBold, color: Colors.textDark, marginBottom: 6 },
  deleteMsg: { fontSize: 12, color: Colors.textLight, lineHeight: 20, textAlign: 'center', marginBottom: 24 },
  deleteBtn: {
    width: '100%', height: 48, borderRadius: 12, backgroundColor: Colors.error,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  deleteBtnText: { color: Colors.white, fontSize: 15, fontFamily: Fonts.zenMaruBold },
  cancelText: { fontSize: 14, fontFamily: Fonts.zenMaruRegular, color: Colors.textLight, paddingVertical: 8 },
})
