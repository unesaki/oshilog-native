import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/colors'
import { formatAmount } from '@/lib/utils'
import type { Oshi, Expense, Budget } from '@/types'
import AppHeader, { HeaderIconButton, HeaderTextButton } from '@/components/AppHeader'
import BottomTabBar from '@/components/BottomTabBar'
import Toast from '@/components/Toast'
import { useToast } from '@/components/useToast'
import OshiIcon from '@/components/OshiIcon'
import { Fonts } from '@/constants/fonts'

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const { toast, showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const [oshis, setOshis] = useState<Oshi[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [monthTotal, setMonthTotal] = useState(0)
  const [lastMonthDiff, setLastMonthDiff] = useState(0)
  const [currentYear, setCurrentYear] = useState(0)
  const [currentMonth, setCurrentMonth] = useState(0)

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`
    const lastMonth = month === 1 ? 12 : month - 1
    const lastYear = month === 1 ? year - 1 : year
    const lastYearMonth = `${lastYear}-${String(lastMonth).padStart(2, '0')}`
    const monthStart = `${yearMonth}-01`
    const monthEnd = new Date(year, month, 0).toISOString().split('T')[0]
    const lastMonthStart = `${lastYearMonth}-01`
    const lastMonthEnd = new Date(lastYear, lastMonth, 0).toISOString().split('T')[0]

    setCurrentYear(year)
    setCurrentMonth(month)

    const [
      { data: oshisData },
      { data: expensesData },
      { data: lastMonthExpensesData },
      { data: budgetsData },
    ] = await Promise.all([
      supabase.from('oshi').select('*').eq('user_id', user.id).order('sort_order'),
      supabase.from('expenses').select('*').eq('user_id', user.id).gte('spent_at', monthStart).lte('spent_at', monthEnd).order('spent_at', { ascending: false }),
      supabase.from('expenses').select('amount').eq('user_id', user.id).gte('spent_at', lastMonthStart).lte('spent_at', lastMonthEnd),
      supabase.from('budgets').select('*').eq('user_id', user.id).eq('year_month', yearMonth),
    ])

    const expList = expensesData ?? []
    const mTotal = expList.reduce((s: number, e: { amount: number }) => s + e.amount, 0)
    const lTotal = (lastMonthExpensesData ?? []).reduce((s: number, e: { amount: number }) => s + e.amount, 0)

    setOshis(oshisData ?? [])
    setExpenses(expList)
    setBudgets(budgetsData ?? [])
    setMonthTotal(mTotal)
    setLastMonthDiff(lTotal - mTotal)
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      fetchData().finally(() => setLoading(false))
    }, [])
  )

  async function handleRefresh() {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  const hasMoreOshis = oshis.length > 3
  const displayOshis = oshis.slice(0, hasMoreOshis ? 2 : 3)
  const recentExpenses = expenses.slice(0, 3)

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
          <HeaderIconButton onPress={() => setMenuOpen(true)}>
            <View style={styles.menuLines}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={styles.menuLine} />
              ))}
            </View>
          </HeaderIconButton>
        }
        right={
          <HeaderIconButton onPress={() => {}}>
            <View>
              <Ionicons name="notifications-outline" size={18} color="#8A5070" />
              <View style={styles.notificationDot} />
            </View>
          </HeaderIconButton>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.pinkVivid} />
        }
      >
        {/* 月合計バナー */}
        <LinearGradient
          colors={['#FF3D87', '#FF8FB8', '#FFB6D0']}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <Text style={styles.bannerLabel}>{currentYear}年{currentMonth}月の推し活合計</Text>
          <Text style={styles.bannerAmount}>¥{formatAmount(monthTotal)}</Text>
          <Text style={styles.bannerDiff}>
            {lastMonthDiff >= 0
              ? `先月より ¥${formatAmount(lastMonthDiff)} 少ないよ `
              : `先月より ¥${formatAmount(Math.abs(lastMonthDiff))} 多いよ `}
            <Text style={{ fontFamily: undefined }}>{lastMonthDiff >= 0 ? '✨' : '💸'}</Text>
          </Text>
        </LinearGradient>

        {/* 推しごとの今月 */}
        <View style={styles.sectionTitleRow}>
          <Ionicons name="heart" size={12} color="#FF3D87" />
          <Text style={styles.sectionTitle}>推しごとの今月</Text>
        </View>
        <View style={styles.oshiSection}>
          {hasMoreOshis ? (
            <>
              {displayOshis.map((oshi) => (
                <OshiCard key={oshi.id} oshi={oshi} expenses={expenses} budgets={budgets} />
              ))}
              <TouchableOpacity
                style={styles.moreOshiCard}
                onPress={() => router.push('/oshi')}
                activeOpacity={0.7}
              >
                <Text style={styles.moreOshiText}>他 {oshis.length - 2} 人の推しを見る</Text>
                <Text style={styles.moreOshiArrow}>›</Text>
              </TouchableOpacity>
            </>
          ) : (
            Array.from({ length: 3 }).map((_, i) => {
              const oshi = displayOshis[i]
              if (!oshi) {
                if (i === displayOshis.length) {
                  return (
                    <TouchableOpacity
                      key={`empty-${i}`}
                      style={styles.addOshiCard}
                      onPress={() => router.push('/oshi/new')}
                      activeOpacity={0.7}
                    >
                      <View style={styles.addOshiAvatar}>
                        <Text style={{ fontSize: 18, color: Colors.textLight }}>＋</Text>
                      </View>
                      <Text style={styles.addOshiText}>推しを追加する</Text>
                    </TouchableOpacity>
                  )
                }
                return <View key={`placeholder-${i}`} style={styles.placeholderCard} />
              }
              return <OshiCard key={oshi.id} oshi={oshi} expenses={expenses} budgets={budgets} />
            })
          )}
        </View>

        {/* 最近の記録 */}
        <View style={styles.sectionTitleRow}>
          <Ionicons name="time-outline" size={12} color="#8A5070" />
          <Text style={styles.sectionTitle}>最近の記録</Text>
        </View>
        <View style={styles.expenseSection}>
          {Array.from({ length: 3 }).map((_, i) => {
            const expense = recentExpenses[i]
            if (!expense) {
              return <View key={`exp-empty-${i}`} style={styles.expensePlaceholder} />
            }
            const oshi = oshis.find((o) => o.id === expense.oshi_id)
            const d = new Date(expense.spent_at)
            const dateStr = `${d.getMonth() + 1}/${d.getDate()}`
            return (
              <View key={expense.id} style={styles.expenseCard}>
                <View style={[styles.expenseDot, { backgroundColor: oshi?.color ?? Colors.pinkVivid }]} />
                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseTitle} numberOfLines={1}>{expense.title}</Text>
                  <Text style={styles.expenseMeta}>{oshi?.name ?? '—'} · {dateStr}</Text>
                </View>
                <Text style={styles.expenseAmount}>¥{formatAmount(expense.amount)}</Text>
              </View>
            )
          })}
        </View>
      </ScrollView>

      <BottomTabBar />
      <Toast message={toast.message} isError={toast.isError} visible={toast.visible} />

      {/* ハンバーガーメニュー */}
      {menuOpen && (
        <>
          <TouchableOpacity
            style={styles.menuBackdrop}
            onPress={() => setMenuOpen(false)}
            activeOpacity={1}
          />
          <View style={[styles.menuSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.menuHandle} />
            <Text style={styles.menuSectionLabel}>メニュー</Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setMenuOpen(false); router.push('/oshi/new') }}
              activeOpacity={0.7}
            >
              <Ionicons name="heart" size={20} color="#FF3D87" />
              <Text style={styles.menuItemText}>推しを追加する</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setMenuOpen(false); router.push('/upgrade') }}
              activeOpacity={0.7}
            >
              <Ionicons name="sparkles" size={20} color="#F59E0B" />
              <Text style={styles.menuItemText}>プレミアムにアップグレード</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
              onPress={() => { setMenuOpen(false); handleLogout() }}
              activeOpacity={0.7}
            >
              <Ionicons name="exit-outline" size={20} color="#8A5070" />
              <Text style={[styles.menuItemText, { color: Colors.textMid }]}>ログアウト</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  )
}

function OshiCard({ oshi, expenses, budgets }: { oshi: Oshi; expenses: Expense[]; budgets: Budget[] }) {
  const spend = expenses.filter((e) => e.oshi_id === oshi.id).reduce((s, e) => s + e.amount, 0)
  const budget = budgets.find((b) => b.oshi_id === oshi.id)?.amount ?? 0
  const percentage = budget > 0 ? Math.min((spend / budget) * 100, 100) : 0
  const isOver = percentage >= 90
  const color = oshi.color || Colors.pinkVivid

  return (
    <TouchableOpacity
      style={styles.oshiCard}
      onPress={() => router.push(`/oshi/${oshi.id}`)}
      activeOpacity={0.7}
    >
      <View style={[styles.oshiAvatar, { backgroundColor: `${color}88` }]}>
        <OshiIcon emoji={oshi.icon_emoji || '🌸'} size={18} color={color} />
      </View>
      <View style={styles.oshiInfo}>
        <Text style={styles.oshiName} numberOfLines={1}>{oshi.name}</Text>
        <View style={styles.progressRow}>
          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${percentage}%`,
                  backgroundColor: isOver ? Colors.error : color,
                },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {formatAmount(spend)} / {budget > 0 ? `${formatAmount(budget)}円` : '予算未設定'}
          </Text>
        </View>
      </View>
      <Text style={styles.oshiAmount}>¥{formatAmount(spend)}</Text>
      <Text style={styles.oshiArrow}>›</Text>
    </TouchableOpacity>
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
    padding: 18,
    gap: 0,
  },
  // バナー
  banner: {
    borderRadius: 20,
    padding: 22,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerLabel: {
    fontSize: 10,
    fontFamily: Fonts.zenMaruRegular,
    letterSpacing: 1,
    opacity: 0.85,
    color: Colors.white,
    marginBottom: 4,
  },
  bannerAmount: {
    fontSize: 32,
    fontFamily: Fonts.zenMaruBold,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  bannerDiff: {
    fontSize: 10,
    fontFamily: Fonts.zenMaruRegular,
    opacity: 0.75,
    color: Colors.white,
    marginTop: 4,
  },
  bannerDecor: {
    position: 'absolute',
    right: 16,
    top: '50%',
    fontSize: 44,
    opacity: 0.18,
  },
  // セクション
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: Fonts.zenMaruBold,
    color: Colors.textMid,
    letterSpacing: 1.5,
  },
  // 推しカード
  oshiSection: {
    gap: 7,
    marginBottom: 12,
  },
  oshiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: Colors.pinkVivid,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  oshiAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  oshiInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: 14,
  },
  oshiName: {
    fontSize: 13,
    fontFamily: Fonts.zenMaruBold,
    color: Colors.textDark,
    marginBottom: 5,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressBg: {
    flex: 1,
    height: 4,
    borderRadius: 99,
    backgroundColor: Colors.pinkSoft,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 99,
  },
  progressLabel: {
    fontSize: 9,
    fontFamily: Fonts.zenMaruRegular,
    color: Colors.textLight,
    flexShrink: 0,
  },
  oshiAmount: {
    fontSize: 14,
    fontFamily: Fonts.zenMaruBold,
    color: Colors.textDark,
    flexShrink: 0,
    marginRight: 10,
  },
  oshiArrow: {
    position: 'absolute',
    right: 12,
    fontSize: 18,
    color: Colors.textLight,
    fontFamily: Fonts.zenMaruRegular,
  },
  moreOshiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.pinkSoft,
    borderRadius: 16,
    paddingVertical: 14,
  },
  moreOshiText: {
    fontSize: 12,
    fontFamily: Fonts.zenMaruBold,
    color: Colors.pinkVivid,
  },
  moreOshiArrow: {
    fontSize: 14,
    color: Colors.pinkVivid,
    fontFamily: Fonts.zenMaruBold,
  },
  addOshiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.pinkSoft,
  },
  addOshiAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.pinkSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addOshiText: {
    fontSize: 12,
    fontFamily: Fonts.zenMaruBold,
    color: Colors.textLight,
  },
  placeholderCard: {
    height: 62,
    borderRadius: 16,
    backgroundColor: Colors.pinkSoft,
    opacity: 0.35,
  },
  // 支出
  expenseSection: {
    gap: 6,
  },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    shadowColor: Colors.pinkVivid,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  expenseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  expenseInfo: {
    flex: 1,
    minWidth: 0,
  },
  expenseTitle: {
    fontSize: 12,
    fontFamily: Fonts.zenMaruBold,
    color: Colors.textDark,
  },
  expenseMeta: {
    fontSize: 9,
    fontFamily: Fonts.zenMaruRegular,
    color: Colors.textLight,
  },
  expenseAmount: {
    fontSize: 13,
    fontFamily: Fonts.zenMaruBold,
    color: Colors.textDark,
    flexShrink: 0,
  },
  expensePlaceholder: {
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.pinkSoft,
    opacity: 0.25,
  },
  // メニュー
  menuLines: {
    gap: 3,
    alignItems: 'center',
  },
  menuLine: {
    width: 14,
    height: 2,
    backgroundColor: Colors.textMid,
    borderRadius: 2,
  },
  notificationDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 9,
    height: 9,
    backgroundColor: Colors.pinkVivid,
    borderRadius: 4.5,
    borderWidth: 2,
    borderColor: Colors.cream,
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(45,27,37,0.4)',
    zIndex: 40,
  },
  menuSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 24,
    zIndex: 50,
    shadowColor: Colors.pinkVivid,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 20,
  },
  menuHandle: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: Colors.pinkSoft,
    alignSelf: 'center',
    marginBottom: 20,
  },
  menuSectionLabel: {
    fontSize: 10,
    fontFamily: Fonts.zenMaruBold,
    color: Colors.textLight,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.pinkSoft,
  },
  menuItemText: {
    fontSize: 15,
    fontFamily: Fonts.zenMaruRegular,
    color: Colors.textDark,
  },
})
