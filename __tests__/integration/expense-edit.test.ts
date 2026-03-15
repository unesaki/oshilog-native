/**
 * 結合テスト: 支出編集のバリデーションと既知バグ
 *
 * 対象: app/(app)/oshi/[id].tsx の支出編集ロジック
 * テスト種別: 結合テスト
 */
import {
  validateAmount,
  validateExpenseTitle,
  validateMemo,
  validateDate,
  sanitizeText,
} from '../../src/lib/validate'
import type { Expense } from '../../src/types'

// ─────────────────────────────────────────────
// 支出編集フォームのバリデーション
// ─────────────────────────────────────────────
describe('支出編集フォーム - バリデーション', () => {
  function validateExpenseEditForm(params: {
    amount: number
    title: string
    memo: string
    date: string
  }): Record<string, string> {
    const amountErr = validateAmount(params.amount)
    const titleErr = validateExpenseTitle(params.title)
    const memoErr = validateMemo(params.memo)
    const dateErr = validateDate(params.date)

    const errors: Record<string, string> = {}
    if (amountErr) errors.amount = amountErr
    if (titleErr) errors.title = titleErr
    if (memoErr) errors.memo = memoErr
    if (dateErr) errors.date = dateErr
    return errors
  }

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T12:00:00.000Z'))
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  test('正常な値 → エラーなし', () => {
    const errors = validateExpenseEditForm({
      amount: 5000,
      title: 'ライブグッズ',
      memo: '',
      date: '2026-03-15',
    })
    expect(errors).toEqual({})
  })

  test('金額0 → amountエラー', () => {
    const errors = validateExpenseEditForm({
      amount: 0,
      title: 'グッズ',
      memo: '',
      date: '2026-03-15',
    })
    expect(errors.amount).toBeDefined()
  })

  /**
   * 重大バグ: 2年以上前に作成された支出を編集しようとすると
   * 日付バリデーションが失敗して保存できない
   *
   * 原因: validateDate が2年前以降の日付のみ許可しているが、
   *       古い支出の spent_at をそのまま editDate に使うため
   *       2年以上前の支出は編集不可になる
   */
  test('[重大バグ] 2年以上前の支出は日付バリデーションで編集不可になる', () => {
    const oldExpense: Partial<Expense> = {
      id: 'exp-old',
      amount: 10000,
      title: '昔のライブグッズ',
      memo: null,
      spent_at: '2023-01-01', // 2年以上前
      category: 'goods',
    }

    const errors = validateExpenseEditForm({
      amount: oldExpense.amount!,
      title: oldExpense.title!,
      memo: '',
      date: oldExpense.spent_at!, // 2年以上前の日付
    })

    // 日付エラーが発生して編集不可
    expect(errors.date).toBe('2年以上前の日付は入力できないよ')
    console.error('[重大バグ] spent_at が2年以上前の支出は編集できない。validateDate をスキップするか、既存支出の編集時は日付バリデーションを緩める必要がある')
  })

  test('昨年の支出（1年前）は編集できる', () => {
    const errors = validateExpenseEditForm({
      amount: 5000,
      title: 'グッズ',
      memo: '',
      date: '2025-03-15', // 1年前
    })
    expect(errors.date).toBeUndefined()
  })

  test('ちょうど2年前（境界値）の支出は編集不可', () => {
    // twoYearsAgo = 2024-03-15T12:00:00Z
    // "2024-03-15" → UTC 2024-03-15T00:00:00Z < 2024-03-15T12:00:00Z → エラー
    const errors = validateExpenseEditForm({
      amount: 5000,
      title: 'グッズ',
      memo: '',
      date: '2024-03-15',
    })
    expect(errors.date).toBe('2年以上前の日付は入力できないよ')
  })
})

// ─────────────────────────────────────────────
// 支出編集後のDBペイロード
// ─────────────────────────────────────────────
describe('支出編集 - 更新ペイロード生成', () => {
  function buildUpdatePayload(params: {
    amount: number
    category: string
    title: string
    memo: string
    date: string
  }) {
    return {
      amount: params.amount,
      category: params.category,
      title: sanitizeText(params.title),
      memo: sanitizeText(params.memo) || null,
      spent_at: params.date,
    }
  }

  test('正常な更新ペイロードが生成される', () => {
    const payload = buildUpdatePayload({
      amount: 5000,
      category: 'ticket',
      title: 'ライブチケット',
      memo: '最前列！',
      date: '2026-03-15',
    })
    expect(payload.amount).toBe(5000)
    expect(payload.category).toBe('ticket')
    expect(payload.title).toBe('ライブチケット')
    expect(payload.memo).toBe('最前列！')
    expect(payload.spent_at).toBe('2026-03-15')
  })

  test('メモ空欄 → null', () => {
    const payload = buildUpdatePayload({
      amount: 1000,
      category: 'goods',
      title: 'グッズ',
      memo: '',
      date: '2026-03-15',
    })
    expect(payload.memo).toBeNull()
  })
})

// ─────────────────────────────────────────────
// カテゴリ内訳計算ロジック
// ─────────────────────────────────────────────
describe('カテゴリ内訳計算', () => {
  const CATEGORIES = [
    { value: 'goods', label: 'グッズ' },
    { value: 'ticket', label: 'チケット' },
    { value: 'streaming', label: '配信' },
    { value: 'photobook', label: '写真集' },
    { value: 'other', label: 'その他' },
  ]

  function calcCategoryStats(expenses: Array<{ category: string; amount: number }>) {
    return CATEGORIES.map((cat) => ({
      ...cat,
      amount: expenses
        .filter((e) => e.category === cat.value)
        .reduce((sum, e) => sum + e.amount, 0),
    }))
  }

  function calcMaxCatAmount(stats: Array<{ amount: number }>): number {
    return Math.max(...stats.map((c) => c.amount), 1)
  }

  test('支出ゼロの場合、全カテゴリが0', () => {
    const stats = calcCategoryStats([])
    expect(stats.every((s) => s.amount === 0)).toBe(true)
  })

  test('maxCatAmount は最低1（ゼロ除算防止）', () => {
    const stats = calcCategoryStats([])
    const max = calcMaxCatAmount(stats)
    expect(max).toBe(1) // Math.max(...[0,0,0,0,0], 1) = 1
  })

  test('単一カテゴリの支出が正しく集計される', () => {
    const expenses = [
      { category: 'goods', amount: 1000 },
      { category: 'goods', amount: 2000 },
    ]
    const stats = calcCategoryStats(expenses)
    const goodsStat = stats.find((s) => s.value === 'goods')
    expect(goodsStat?.amount).toBe(3000)
  })

  test('複数カテゴリの支出が正しく分類される', () => {
    const expenses = [
      { category: 'goods', amount: 1000 },
      { category: 'ticket', amount: 5000 },
      { category: 'streaming', amount: 500 },
      { category: 'goods', amount: 2000 },
    ]
    const stats = calcCategoryStats(expenses)
    expect(stats.find((s) => s.value === 'goods')?.amount).toBe(3000)
    expect(stats.find((s) => s.value === 'ticket')?.amount).toBe(5000)
    expect(stats.find((s) => s.value === 'streaming')?.amount).toBe(500)
    expect(stats.find((s) => s.value === 'photobook')?.amount).toBe(0)
    expect(stats.find((s) => s.value === 'other')?.amount).toBe(0)
  })

  test('maxCatAmount が最大カテゴリ額と一致する', () => {
    const expenses = [
      { category: 'goods', amount: 1000 },
      { category: 'ticket', amount: 5000 },
    ]
    const stats = calcCategoryStats(expenses)
    const max = calcMaxCatAmount(stats)
    expect(max).toBe(5000)
  })

  test('プログレスバー幅計算（最大カテゴリが100%）', () => {
    const expenses = [
      { category: 'goods', amount: 1000 },
      { category: 'ticket', amount: 5000 },
    ]
    const stats = calcCategoryStats(expenses)
    const max = calcMaxCatAmount(stats)
    const goodsWidth = (stats.find((s) => s.value === 'goods')!.amount / max) * 100
    const ticketWidth = (stats.find((s) => s.value === 'ticket')!.amount / max) * 100
    expect(ticketWidth).toBe(100)
    expect(goodsWidth).toBe(20)
  })
})

// ─────────────────────────────────────────────
// 予算残額・オーバー計算
// ─────────────────────────────────────────────
describe('予算残額計算', () => {
  function calcRemaining(budgetAmount: number, monthTotal: number): number | null {
    return budgetAmount > 0 ? budgetAmount - monthTotal : null
  }

  function formatRemainingText(remaining: number | null): string {
    if (remaining === null) return '予算未設定'
    if (remaining >= 0) return `残り ¥${remaining.toLocaleString('ja-JP')}`
    return 'オーバー'
  }

  test('予算未設定 → null', () => {
    expect(calcRemaining(0, 5000)).toBeNull()
  })

  test('予算内 → 正の残額', () => {
    expect(calcRemaining(10000, 7000)).toBe(3000)
  })

  test('予算ちょうど → 0', () => {
    expect(calcRemaining(10000, 10000)).toBe(0)
  })

  test('予算オーバー → 負の残額', () => {
    expect(calcRemaining(10000, 12000)).toBe(-2000)
  })

  test('残額0のとき "残り ¥0" と表示（"オーバー"ではない）', () => {
    const remaining = calcRemaining(10000, 10000)
    expect(formatRemainingText(remaining!)).toBe('残り ¥0')
  })

  test('残額負のとき "オーバー" と表示', () => {
    const remaining = calcRemaining(10000, 12000)
    expect(formatRemainingText(remaining!)).toBe('オーバー')
  })

  test('予算未設定のとき "予算未設定" と表示', () => {
    expect(formatRemainingText(null)).toBe('予算未設定')
  })
})
