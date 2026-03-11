import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { supabase } from '../lib/supabase/client'
import { useAuth } from '../context/AuthContext'
import { colors } from '../constants/colors'
import { fonts } from '../constants/fonts'
import { Oshi, Expense, Budget } from '../types'
import { RootStackParamList } from '../navigation/RootNavigator'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const CATEGORY_LABELS: Record<string, string> = {
  goods: 'グッズ 🧸',
  ticket: 'チケット 🎫',
  streaming: '配信 📺',
  photobook: '写真集 📸',
  other: 'その他 ✨',
}

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

const DUMMY_EXPENSES: Expense[] = [
  {
    id: '1', user_id: 'dummy', oshi_id: '1',
    amount: 8500, category: 'ticket',
    title: 'コンサートチケット', memo: null,
    spent_at: new Date().toISOString().slice(0, 10),
    created_at: '',
  },
  {
    id: '2', user_id: 'dummy', oshi_id: '1',
    amount: 3200, category: 'goods',
    title: 'アクリルスタンド', memo: null,
    spent_at: new Date().toISOString().slice(0, 10),
    created_at: '',
  },
  {
    id: '3', user_id: 'dummy', oshi_id: '2',
    amount: 2500, category: 'streaming',
    title: '生配信チケット', memo: null,
    spent_at: new Date().toISOString().slice(0, 10),
    created_at: '',
  },
]

const DUMMY_BUDGETS: Budget[] = [
  { id: '1', user_id: 'dummy', oshi_id: '1', amount: 20000, year_month: '', created_at: '' },
  { id: '2', user_id: 'dummy', oshi_id: '2', amount: 10000, year_month: '', created_at: '' },
]

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>
  onTabChange?: (tab: 'home' | 'oshi') => void
}

export default function HomeScreen({ navigation, onTabChange }: Props) {
  const { user, signOut } = useAuth()
  const [oshis, setOshis] = useState<Oshi[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [lastMonthTotal, setLastMonthTotal] = useState<number | null>(null)
  const [isDummy, setIsDummy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuAnim = useRef(new Animated.Value(-SCREEN_WIDTH)).current

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthLabel = `${now.getMonth() + 1}月`

  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      const [oshisRes, expensesRes, budgetsRes, lastMonthRes] = await Promise.all([
        supabase
          .from('oshis')
          .select('*')
          .eq('user_id', user.id)
          .order('sort_order'),
        supabase
          .from('expenses')
          .select('*')
          .eq('user_id', user.id)
          .gte('spent_at', `${currentMonth}-01`)
          .lte('spent_at', `${currentMonth}-31`)
          .order('spent_at', { ascending: false }),
        supabase
          .from('budgets')
          .select('*')
          .eq('user_id', user.id)
          .eq('year_month', currentMonth),
        supabase
          .from('expenses')
          .select('amount')
          .eq('user_id', user.id)
          .gte('spent_at', `${lastMonth}-01`)
          .lte('spent_at', `${lastMonth}-31`),
      ])

      // Supabase に繋がっている場合は実データを使う（0件でも空として表示）
      if (!oshisRes.error) {
        setOshis(oshisRes.data ?? [])
        setIsDummy(false)
      } else {
        throw oshisRes.error
      }
      setExpenses(expensesRes.error ? [] : (expensesRes.data ?? []))
      setBudgets(budgetsRes.data ?? [])

      const lastTotal = (lastMonthRes.data ?? []).reduce((sum, e) => sum + e.amount, 0)
      setLastMonthTotal(lastTotal)
    } catch {
      // Supabase 未設定 or ネットワークエラー → ダミーデータを表示
      setOshis(DUMMY_OSHIS)
      setExpenses(DUMMY_EXPENSES)
      setBudgets(DUMMY_BUDGETS)
      setLastMonthTotal(null)
      setIsDummy(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user, currentMonth, lastMonth])

  useEffect(() => {
    loadData()
  }, [loadData])

  const onRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  const openMenu = () => {
    setShowMenu(true)
    Animated.spring(menuAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start()
  }

  const closeMenu = () => {
    Animated.timing(menuAnim, {
      toValue: -SCREEN_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setShowMenu(false))
  }

  const handleSignOut = () => {
    closeMenu()
    setTimeout(() => {
      Alert.alert('ログアウト', 'ログアウトしますか？', [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'ログアウト', style: 'destructive', onPress: signOut },
      ])
    }, 300)
  }

  const monthExpenses = expenses.filter(e => e.spent_at.startsWith(currentMonth))
  const totalAmount = monthExpenses.reduce((sum, e) => sum + e.amount, 0)

  const bannerSub = (() => {
    if (isDummy) return `${oshis.length}人の推しを応援中 💝`
    if (oshis.length === 0) return '推しを追加しよう 🌸'
    if (lastMonthTotal === null || lastMonthTotal === 0) return `${oshis.length}人の推しを応援中 💝`
    const diff = totalAmount - lastMonthTotal
    if (diff === 0) return '先月と同じ金額です'
    const sign = diff > 0 ? '+' : '-'
    return `先月より${sign}¥${Math.abs(diff).toLocaleString('ja-JP')}`
  })()

  const recentExpenses = [...monthExpenses].sort(
    (a, b) => new Date(b.spent_at).getTime() - new Date(a.spent_at).getTime()
  ).slice(0, 3)

  const getOshiExpenseTotal = (oshiId: string) =>
    monthExpenses.filter(e => e.oshi_id === oshiId).reduce((sum, e) => sum + e.amount, 0)

  const getOshiBudget = (oshiId: string) =>
    budgets.find(b => b.oshi_id === oshiId)?.amount ?? 0

  const getProgressRatio = (oshiId: string) => {
    const budget = getOshiBudget(oshiId)
    if (budget === 0) return 0
    return Math.min(getOshiExpenseTotal(oshiId) / budget, 1)
  }

  const getOshiName = (oshiId: string) =>
    oshis.find(o => o.id === oshiId)?.name ?? '不明'

  const getOshiEmoji = (oshiId: string) =>
    oshis.find(o => o.id === oshiId)?.icon_emoji ?? '💝'

  const formatAmount = (amount: number) =>
    `¥${amount.toLocaleString('ja-JP')}`

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
          <TouchableOpacity style={styles.headerBtn} onPress={openMenu} activeOpacity={0.7}>
            <View style={styles.hamburgerLine} />
            <View style={[styles.hamburgerLine, { width: 18 }]} />
            <View style={styles.hamburgerLine} />
          </TouchableOpacity>

          <Text style={styles.headerLogo}>oshilog</Text>

          <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
            <Text style={styles.headerIcon}>🔔</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.pinkVivid}
            />
          }
        >
          {/* Month Total Banner */}
          <LinearGradient
            colors={['#FF3D87', '#FF8FB8', '#FFB6D0']}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}
          >
            <Text style={styles.bannerLabel}>{monthLabel}の推し活合計</Text>
            <Text style={styles.bannerAmount}>{formatAmount(totalAmount)}</Text>
            <Text style={styles.bannerSub}>{bannerSub}</Text>
          </LinearGradient>

          {/* Oshi Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>推しごとの今月</Text>
              {oshis.length > 3 && (
                <TouchableOpacity onPress={() => onTabChange?.('oshi')} activeOpacity={0.7}>
                  <Text style={styles.seeAll}>すべて見る</Text>
                </TouchableOpacity>
              )}
            </View>

            {oshis.length === 0 ? (
              <TouchableOpacity
                style={styles.emptyCard}
                onPress={() => navigation.navigate('OshiNew')}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyIcon}>➕</Text>
                <Text style={styles.emptyText}>推しを追加する</Text>
              </TouchableOpacity>
            ) : (
              oshis.slice(0, 3).map(oshi => {
                const spent = getOshiExpenseTotal(oshi.id)
                const budget = getOshiBudget(oshi.id)
                const ratio = getProgressRatio(oshi.id)
                return (
                  <View key={oshi.id} style={styles.oshiCard}>
                    <View style={styles.oshiCardRow}>
                      <View style={[styles.oshiAvatar, { backgroundColor: oshi.color + '30' }]}>
                        <Text style={styles.oshiEmoji}>{oshi.icon_emoji}</Text>
                      </View>
                      <View style={styles.oshiInfo}>
                        <View style={styles.oshiNameRow}>
                          <Text style={styles.oshiName}>{oshi.name}</Text>
                          <Text style={styles.oshiSpent}>{formatAmount(spent)}</Text>
                        </View>
                        {budget > 0 && (
                          <>
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
                            <Text style={styles.budgetText}>
                              予算 {formatAmount(budget)} の {Math.round(ratio * 100)}%
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                )
              })
            )}
          </View>

          {/* Recent Records */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>最近の記録</Text>
            </View>

            {recentExpenses.length === 0 ? (
              <View style={styles.emptyRecord}>
                <Text style={styles.emptyRecordText}>まだ記録がありません 🌸</Text>
              </View>
            ) : (
              recentExpenses.map(expense => (
                <View key={expense.id} style={styles.expenseCard}>
                  <View style={styles.expenseLeft}>
                    <View style={styles.expenseCategoryBadge}>
                      <Text style={styles.expenseCategoryText}>
                        {CATEGORY_LABELS[expense.category] ?? expense.category}
                      </Text>
                    </View>
                    <Text style={styles.expenseTitle} numberOfLines={1}>
                      {expense.title}
                    </Text>
                    <Text style={styles.expenseOshi}>
                      {getOshiEmoji(expense.oshi_id)} {getOshiName(expense.oshi_id)}
                    </Text>
                  </View>
                  <View style={styles.expenseRight}>
                    <Text style={styles.expenseAmount}>{formatAmount(expense.amount)}</Text>
                    <Text style={styles.expenseDate}>
                      {expense.spent_at.slice(5).replace('-', '/')}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Hamburger Menu */}
      {showMenu && (
        <TouchableOpacity
          style={styles.menuOverlay}
          onPress={closeMenu}
          activeOpacity={1}
        >
          <Animated.View
            style={[styles.menuDrawer, { transform: [{ translateX: menuAnim }] }]}
          >
            <TouchableOpacity activeOpacity={1} style={{ flex: 1 }}>
              <SafeAreaView edges={['top', 'bottom']} style={styles.menuContent}>
                <Text style={styles.menuLogo}>oshilog</Text>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    closeMenu()
                    setTimeout(() => navigation.navigate('OshiNew'), 300)
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuItemIcon}>➕</Text>
                  <Text style={styles.menuItemText}>推しを追加</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
                  <Text style={styles.menuItemIcon}>👑</Text>
                  <Text style={styles.menuItemText}>プレミアムプラン</Text>
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumBadgeText}>¥480/月</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.menuDivider} />

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleSignOut}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuItemIcon}>🚪</Text>
                  <Text style={[styles.menuItemText, { color: '#FF6B6B' }]}>ログアウト</Text>
                </TouchableOpacity>
              </SafeAreaView>
            </TouchableOpacity>
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
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburgerLine: {
    width: 22,
    height: 2,
    backgroundColor: colors.textDark,
    borderRadius: 1,
    marginVertical: 2.5,
  },
  headerLogo: {
    fontSize: 22,
    fontFamily: fonts.logo,
    color: colors.pinkVivid,
    letterSpacing: -0.5,
  },
  headerIcon: {
    fontSize: 22,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  banner: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: colors.pinkVivid,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  bannerLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    marginBottom: 6,
  },
  bannerAmount: {
    color: colors.white,
    fontSize: 36,
    fontFamily: fonts.bodyBold,
    letterSpacing: -1,
    marginBottom: 6,
  },
  bannerSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontFamily: fonts.body,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.bodyBold,
    color: colors.textDark,
  },
  seeAll: {
    fontSize: 13,
    color: colors.pinkVivid,
    fontFamily: fonts.bodyMedium,
  },
  oshiCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  oshiCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  oshiAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  oshiEmoji: {
    fontSize: 24,
  },
  oshiInfo: {
    flex: 1,
  },
  oshiNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  oshiName: {
    fontSize: 15,
    fontFamily: fonts.bodyBold,
    color: colors.textDark,
  },
  oshiSpent: {
    fontSize: 15,
    fontFamily: fonts.bodyBold,
    color: colors.pinkVivid,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.pinkSoft,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  budgetText: {
    fontSize: 11,
    color: colors.textLight,
    fontFamily: fonts.body,
  },
  emptyCard: {
    backgroundColor: colors.pinkSoft,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.pinkMid,
  },
  emptyIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMid,
    fontFamily: fonts.bodyMedium,
  },
  emptyRecord: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyRecordText: {
    fontSize: 14,
    color: colors.textLight,
    fontFamily: fonts.body,
  },
  expenseCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  expenseLeft: {
    flex: 1,
  },
  expenseCategoryBadge: {
    backgroundColor: colors.pinkSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  expenseCategoryText: {
    fontSize: 11,
    color: colors.textMid,
    fontFamily: fonts.bodyMedium,
  },
  expenseTitle: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.textDark,
    marginBottom: 2,
  },
  expenseOshi: {
    fontSize: 12,
    color: colors.textLight,
    fontFamily: fonts.body,
  },
  expenseRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  expenseAmount: {
    fontSize: 15,
    fontFamily: fonts.bodyBold,
    color: colors.pinkVivid,
    marginBottom: 2,
  },
  expenseDate: {
    fontSize: 12,
    color: colors.textLight,
    fontFamily: fonts.body,
  },
  // Hamburger menu
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(45, 27, 37, 0.5)',
    zIndex: 100,
  },
  menuDrawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.75,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  menuContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  menuLogo: {
    fontSize: 28,
    fontFamily: fonts.logo,
    color: colors.pinkVivid,
    letterSpacing: -0.5,
    marginTop: 16,
    marginBottom: 32,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: 14,
    width: 28,
    textAlign: 'center',
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: fonts.bodyMedium,
    color: colors.textDark,
    flex: 1,
  },
  premiumBadge: {
    backgroundColor: colors.pinkSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  premiumBadgeText: {
    fontSize: 11,
    color: colors.pinkVivid,
    fontFamily: fonts.bodyBold,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
})
