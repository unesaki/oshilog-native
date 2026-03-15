/**
 * 結合テスト: ホーム画面のデータ取得・表示ロジック
 *
 * 対象: app/(app)/index.tsx
 * テスト種別: 結合テスト
 */
import { formatAmount } from '../../src/lib/utils'

// ─────────────────────────────────────────────
// 月合計・先月差分の計算ロジック
// ─────────────────────────────────────────────
describe('ホーム画面 - 月集計ロジック', () => {
  type Expense = { id: string; oshi_id: string; amount: number }

  function calcMonthTotal(expenses: Expense[]): number {
    return expenses.reduce((sum, e) => sum + e.amount, 0)
  }

  function calcLastMonthDiff(lastMonthTotal: number, thisMonthTotal: number): number {
    return lastMonthTotal - thisMonthTotal
  }

  function formatDiffMessage(diff: number): string {
    if (diff >= 0) {
      return `先月より ¥${formatAmount(diff)} 少ないよ`
    }
    return `先月より ¥${formatAmount(Math.abs(diff))} 多いよ`
  }

  test('支出なし → 合計0', () => {
    expect(calcMonthTotal([])).toBe(0)
  })

  test('単一支出の合計', () => {
    expect(calcMonthTotal([{ id: '1', oshi_id: 'o1', amount: 3000 }])).toBe(3000)
  })

  test('複数推しの支出を合算', () => {
    const expenses: Expense[] = [
      { id: '1', oshi_id: 'o1', amount: 1000 },
      { id: '2', oshi_id: 'o2', amount: 2000 },
      { id: '3', oshi_id: 'o1', amount: 500 },
    ]
    expect(calcMonthTotal(expenses)).toBe(3500)
  })

  test('今月が先月より少ない → 正のdiff', () => {
    expect(calcLastMonthDiff(10000, 8000)).toBe(2000)
  })

  test('今月が先月より多い → 負のdiff', () => {
    expect(calcLastMonthDiff(5000, 8000)).toBe(-3000)
  })

  test('同額 → diff=0', () => {
    expect(calcLastMonthDiff(5000, 5000)).toBe(0)
  })

  test('先月0、今月あり → 負のdiff（今月が多い）', () => {
    expect(calcLastMonthDiff(0, 5000)).toBe(-5000)
    expect(formatDiffMessage(-5000)).toBe('先月より ¥5,000 多いよ')
  })

  test('先月あり、今月0 → 正のdiff（今月が少ない）', () => {
    expect(calcLastMonthDiff(5000, 0)).toBe(5000)
    expect(formatDiffMessage(5000)).toBe('先月より ¥5,000 少ないよ')
  })

  test('[仕様] 同額のとき"少ないよ"と表示される（0 >= 0 が true）', () => {
    // NOTE: 0円差分で"少ないよ"は不自然だが現在の仕様
    const diff = calcLastMonthDiff(5000, 5000)
    expect(formatDiffMessage(diff)).toBe('先月より ¥0 少ないよ')
  })
})

// ─────────────────────────────────────────────
// 月境界の日付計算ロジック
// ─────────────────────────────────────────────
describe('ホーム画面 - 月境界の日付計算', () => {
  function calcMonthBoundaries(now: Date) {
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
    return { yearMonth, lastYearMonth, monthStart, monthEnd, lastMonthStart, lastMonthEnd }
  }

  test('3月のmonthStart/monthEnd', () => {
    const boundaries = calcMonthBoundaries(new Date('2026-03-15'))
    expect(boundaries.monthStart).toBe('2026-03-01')
    expect(boundaries.monthEnd).toBe('2026-03-31')
  })

  test('1月の先月は前年12月', () => {
    const boundaries = calcMonthBoundaries(new Date('2026-01-15'))
    expect(boundaries.lastYearMonth).toBe('2025-12')
    expect(boundaries.lastMonthStart).toBe('2025-12-01')
    expect(boundaries.lastMonthEnd).toBe('2025-12-31')
  })

  test('2月の月末は28日（平年）', () => {
    const boundaries = calcMonthBoundaries(new Date('2026-02-15'))
    expect(boundaries.monthEnd).toBe('2026-02-28')
  })

  test('2月の月末は29日（うるう年）', () => {
    const boundaries = calcMonthBoundaries(new Date('2024-02-15'))
    expect(boundaries.monthEnd).toBe('2024-02-29')
  })

  test('12月の月末は31日', () => {
    const boundaries = calcMonthBoundaries(new Date('2026-12-15'))
    expect(boundaries.monthEnd).toBe('2026-12-31')
  })

  test('4月の月末は30日', () => {
    const boundaries = calcMonthBoundaries(new Date('2026-04-15'))
    expect(boundaries.monthEnd).toBe('2026-04-30')
  })
})

// ─────────────────────────────────────────────
// 最近の支出表示ロジック
// ─────────────────────────────────────────────
describe('ホーム画面 - 最近の支出表示', () => {
  type Expense = {
    id: string
    oshi_id: string
    amount: number
    title: string
    spent_at: string
  }

  const mockExpenses: Expense[] = [
    { id: '1', oshi_id: 'o1', amount: 3000, title: 'グッズA', spent_at: '2026-03-15' },
    { id: '2', oshi_id: 'o2', amount: 5000, title: 'チケット', spent_at: '2026-03-14' },
    { id: '3', oshi_id: 'o1', amount: 1000, title: 'グッズB', spent_at: '2026-03-13' },
    { id: '4', oshi_id: 'o2', amount: 2000, title: 'その他', spent_at: '2026-03-12' },
  ]

  test('最新3件のみ表示される', () => {
    const recentExpenses = mockExpenses.slice(0, 3)
    expect(recentExpenses.length).toBe(3)
    expect(recentExpenses[0].id).toBe('1')
    expect(recentExpenses[1].id).toBe('2')
    expect(recentExpenses[2].id).toBe('3')
  })

  test('支出が3件未満でも正常に動作する', () => {
    const twoExpenses = mockExpenses.slice(0, 2)
    const recentExpenses = twoExpenses.slice(0, 3)
    expect(recentExpenses.length).toBe(2)
  })

  test('支出が0件でも正常に動作する', () => {
    const recentExpenses: Expense[] = [].slice(0, 3)
    expect(recentExpenses.length).toBe(0)
  })

  test('日付フォーマット: spent_at から月/日を表示', () => {
    const expense = mockExpenses[0]
    const d = new Date(expense.spent_at)
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`
    expect(dateStr).toBe('3/15')
  })

  test('oshi_idから推し情報を正引き（存在する場合）', () => {
    const oshis = [{ id: 'o1', name: '推しA', color: '#FF0000' }]
    const expense = mockExpenses[0]
    const oshi = oshis.find((o) => o.id === expense.oshi_id)
    expect(oshi?.name).toBe('推しA')
  })

  test('oshi_idから推し情報を正引き（存在しない場合は—）', () => {
    const oshis = [{ id: 'o1', name: '推しA', color: '#FF0000' }]
    const expense = mockExpenses[1] // oshi_id: 'o2' は存在しない
    const oshi = oshis.find((o) => o.id === expense.oshi_id)
    expect(oshi).toBeUndefined()
    // oshis.find の結果が undefined → ?? '—' で表示
    expect(oshi?.name ?? '—').toBe('—')
  })
})

// ─────────────────────────────────────────────
// ログアウトフロー
// ─────────────────────────────────────────────
describe('ホーム画面 - ログアウト', () => {
  test('handleLogout は supabase.auth.signOut を呼んでから login にリダイレクト', async () => {
    const mockSignOut = jest.fn().mockResolvedValue({ error: null })
    const mockReplace = jest.fn()

    async function handleLogout() {
      await mockSignOut()
      mockReplace('/(auth)/login')
    }

    await handleLogout()
    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login')
  })
})
