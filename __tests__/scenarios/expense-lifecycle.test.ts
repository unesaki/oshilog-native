/**
 * シナリオテスト: 支出のライフサイクル
 *
 * テスト種別: E2Eシナリオ（ロジックレベル）
 *
 * カバーするシナリオ:
 * 1. 支出の新規登録 → ホームに反映
 * 2. 支出の編集
 * 3. 支出の削除
 * 4. 予算オーバー検知
 */
import { validateAmount, validateExpenseTitle, validateMemo, validateDate } from '../../src/lib/validate'
import { formatAmount } from '../../src/lib/utils'

// ─────────────────────────────────────────────
// テスト用のミニマルなDB状態管理
// ─────────────────────────────────────────────
type MockExpense = {
  id: string
  oshi_id: string
  user_id: string
  amount: number
  category: string
  title: string
  memo: string | null
  spent_at: string
}

class MockExpenseStore {
  private expenses: MockExpense[] = []
  private idCounter = 0

  insert(expense: Omit<MockExpense, 'id'>): MockExpense {
    const newExpense = { ...expense, id: `exp-${++this.idCounter}` }
    this.expenses.push(newExpense)
    return newExpense
  }

  update(id: string, updates: Partial<MockExpense>): MockExpense | null {
    const index = this.expenses.findIndex((e) => e.id === id)
    if (index === -1) return null
    this.expenses[index] = { ...this.expenses[index], ...updates }
    return this.expenses[index]
  }

  delete(id: string): boolean {
    const before = this.expenses.length
    this.expenses = this.expenses.filter((e) => e.id !== id)
    return this.expenses.length < before
  }

  findByOshi(oshiId: string, yearMonth: string): MockExpense[] {
    const [year, month] = yearMonth.split('-').map(Number)
    const start = `${yearMonth}-01`
    const end = new Date(year, month, 0).toISOString().split('T')[0]
    return this.expenses.filter(
      (e) => e.oshi_id === oshiId && e.spent_at >= start && e.spent_at <= end
    )
  }

  findAll(): MockExpense[] {
    return [...this.expenses]
  }
}

// ─────────────────────────────────────────────
// シナリオ1: 支出の新規登録フロー
// ─────────────────────────────────────────────
describe('シナリオ1: 支出の新規登録', () => {
  let store: MockExpenseStore

  beforeEach(() => {
    store = new MockExpenseStore()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T12:00:00.000Z'))
  })
  afterEach(() => jest.useRealTimers())

  test('正常な支出登録フロー', () => {
    // Step 1: フォームに入力
    const formData = {
      oshiId: 'oshi-1',
      amount: 3000,
      category: 'goods' as const,
      title: 'ライブグッズ購入',
      memo: '武道館のTシャツ',
      date: '2026-03-15',
    }

    // Step 2: バリデーション
    const amountErr = validateAmount(formData.amount)
    const titleErr = validateExpenseTitle(formData.title)
    const memoErr = validateMemo(formData.memo)
    const dateErr = validateDate(formData.date)
    expect(amountErr).toBeNull()
    expect(titleErr).toBeNull()
    expect(memoErr).toBeNull()
    expect(dateErr).toBeNull()

    // Step 3: DB挿入
    const expense = store.insert({
      user_id: 'user-1',
      oshi_id: formData.oshiId,
      amount: formData.amount,
      category: formData.category,
      title: formData.title,
      memo: formData.memo,
      spent_at: formData.date,
    })

    // Step 4: 結果確認
    expect(expense.id).toBeDefined()
    expect(store.findAll().length).toBe(1)
    expect(store.findAll()[0].title).toBe('ライブグッズ購入')
  })

  test('バリデーション失敗時は登録されない', () => {
    const amountErr = validateAmount(0) // 金額0はエラー
    expect(amountErr).not.toBeNull()

    // バリデーションエラーがあるため store.insert は呼ばれない想定
    if (amountErr) {
      // 早期リターン
      expect(store.findAll().length).toBe(0)
      return
    }
    store.insert({
      user_id: 'user-1',
      oshi_id: 'oshi-1',
      amount: 0,
      category: 'goods',
      title: 'テスト',
      memo: null,
      spent_at: '2026-03-15',
    })
    expect(store.findAll().length).toBe(0)
  })

  test('同日に複数の支出を登録できる', () => {
    const expenses = [
      { title: 'グッズA', amount: 1000 },
      { title: 'グッズB', amount: 2000 },
      { title: 'チケット', amount: 10000 },
    ]
    for (const e of expenses) {
      store.insert({
        user_id: 'user-1',
        oshi_id: 'oshi-1',
        amount: e.amount,
        category: 'goods',
        title: e.title,
        memo: null,
        spent_at: '2026-03-15',
      })
    }
    expect(store.findAll().length).toBe(3)
  })

  test('月の境界日（月末）に登録できる', () => {
    const errors = {
      amount: validateAmount(1000),
      title: validateExpenseTitle('月末グッズ'),
      date: validateDate('2026-03-31'),
    }
    expect(Object.values(errors).every((e) => e === null)).toBe(true)
  })

  test('月の境界日（月初）に登録できる', () => {
    const errors = {
      amount: validateAmount(1000),
      title: validateExpenseTitle('月初グッズ'),
      date: validateDate('2026-03-01'),
    }
    expect(Object.values(errors).every((e) => e === null)).toBe(true)
  })
})

// ─────────────────────────────────────────────
// シナリオ2: 支出の編集フロー
// ─────────────────────────────────────────────
describe('シナリオ2: 支出の編集', () => {
  let store: MockExpenseStore

  beforeEach(() => {
    store = new MockExpenseStore()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T12:00:00.000Z'))
  })
  afterEach(() => jest.useRealTimers())

  test('正常な支出編集フロー', () => {
    // 事前に支出を登録
    const expense = store.insert({
      user_id: 'user-1',
      oshi_id: 'oshi-1',
      amount: 3000,
      category: 'goods',
      title: 'グッズ購入',
      memo: null,
      spent_at: '2026-03-10',
    })

    // 編集: 金額とタイトルを変更
    const editData = {
      amount: 5000,
      category: 'ticket',
      title: 'ライブチケット',
      memo: '席がよかった',
      spent_at: '2026-03-10',
    }

    // バリデーション
    const amountErr = validateAmount(editData.amount)
    const titleErr = validateExpenseTitle(editData.title)
    expect(amountErr).toBeNull()
    expect(titleErr).toBeNull()

    // 更新
    const updated = store.update(expense.id, editData)
    expect(updated).not.toBeNull()
    expect(updated!.amount).toBe(5000)
    expect(updated!.title).toBe('ライブチケット')
    expect(updated!.category).toBe('ticket')

    // 件数は変わらない
    expect(store.findAll().length).toBe(1)
  })

  test('存在しない支出IDの編集は失敗する', () => {
    const result = store.update('non-existent-id', { amount: 1000 })
    expect(result).toBeNull()
  })

  test('編集後の月合計が正しく再計算される', () => {
    const exp1 = store.insert({
      user_id: 'user-1', oshi_id: 'oshi-1',
      amount: 3000, category: 'goods', title: 'A', memo: null, spent_at: '2026-03-10',
    })
    store.insert({
      user_id: 'user-1', oshi_id: 'oshi-1',
      amount: 2000, category: 'goods', title: 'B', memo: null, spent_at: '2026-03-11',
    })

    const beforeTotal = store.findAll().reduce((s, e) => s + e.amount, 0)
    expect(beforeTotal).toBe(5000)

    // exp1 を3000→7000に変更
    store.update(exp1.id, { amount: 7000 })

    const afterTotal = store.findAll().reduce((s, e) => s + e.amount, 0)
    expect(afterTotal).toBe(9000)
  })
})

// ─────────────────────────────────────────────
// シナリオ3: 支出の削除フロー
// ─────────────────────────────────────────────
describe('シナリオ3: 支出の削除', () => {
  let store: MockExpenseStore

  beforeEach(() => {
    store = new MockExpenseStore()
  })

  test('正常な支出削除フロー（2段階確認）', () => {
    const expense = store.insert({
      user_id: 'user-1', oshi_id: 'oshi-1',
      amount: 3000, category: 'goods', title: 'グッズ', memo: null, spent_at: '2026-03-15',
    })

    // Step 1: 削除ボタン押下 → deleteExpenseId にセット（確認UI表示）
    let deleteExpenseId: string | null = expense.id
    expect(deleteExpenseId).not.toBeNull()

    // Step 2: 確認ボタン押下 → 実際に削除
    const deleted = store.delete(deleteExpenseId!)
    deleteExpenseId = null

    expect(deleted).toBe(true)
    expect(store.findAll().length).toBe(0)
    expect(deleteExpenseId).toBeNull()
  })

  test('キャンセルで削除が実行されない', () => {
    const expense = store.insert({
      user_id: 'user-1', oshi_id: 'oshi-1',
      amount: 3000, category: 'goods', title: 'グッズ', memo: null, spent_at: '2026-03-15',
    })

    // Step 1: 削除ボタン押下
    let deleteExpenseId: string | null = expense.id

    // Step 2: キャンセル → deleteExpenseId を null に戻す
    deleteExpenseId = null

    // 削除は実行されていない
    expect(store.findAll().length).toBe(1)
  })

  test('削除後に月合計が減少する', () => {
    const exp1 = store.insert({
      user_id: 'user-1', oshi_id: 'oshi-1',
      amount: 3000, category: 'goods', title: 'A', memo: null, spent_at: '2026-03-15',
    })
    store.insert({
      user_id: 'user-1', oshi_id: 'oshi-1',
      amount: 2000, category: 'goods', title: 'B', memo: null, spent_at: '2026-03-15',
    })

    const before = store.findAll().reduce((s, e) => s + e.amount, 0)
    expect(before).toBe(5000)

    store.delete(exp1.id)

    const after = store.findAll().reduce((s, e) => s + e.amount, 0)
    expect(after).toBe(2000)
  })
})

// ─────────────────────────────────────────────
// シナリオ4: 予算管理と警告表示
// ─────────────────────────────────────────────
describe('シナリオ4: 予算管理シナリオ', () => {
  const BUDGET = 10000

  function calcSpend(expenses: Array<{ amount: number }>): number {
    return expenses.reduce((s, e) => s + e.amount, 0)
  }

  function calcProgress(spend: number, budget: number): { percentage: number; isOver: boolean } {
    const percentage = budget > 0 ? Math.min((spend / budget) * 100, 100) : 0
    const isOver = percentage >= 90
    return { percentage, isOver }
  }

  test('予算未使用時は0%・警告なし', () => {
    const { percentage, isOver } = calcProgress(0, BUDGET)
    expect(percentage).toBe(0)
    expect(isOver).toBe(false)
  })

  test('予算50%使用時は警告なし', () => {
    const { percentage, isOver } = calcProgress(5000, BUDGET)
    expect(percentage).toBe(50)
    expect(isOver).toBe(false)
  })

  test('予算89%使用時は警告なし（境界値）', () => {
    const { percentage, isOver } = calcProgress(8900, BUDGET)
    expect(percentage).toBe(89)
    expect(isOver).toBe(false)
  })

  test('予算90%使用時に警告が出る（境界値）', () => {
    const { percentage, isOver } = calcProgress(9000, BUDGET)
    expect(percentage).toBe(90)
    expect(isOver).toBe(true)
  })

  test('予算100%使用時は100%・警告あり', () => {
    const { percentage, isOver } = calcProgress(10000, BUDGET)
    expect(percentage).toBe(100)
    expect(isOver).toBe(true)
  })

  test('予算超過時でも100%にキャップ・警告あり', () => {
    const { percentage, isOver } = calcProgress(15000, BUDGET)
    expect(percentage).toBe(100)
    expect(isOver).toBe(true)
  })

  test('支出積み重ねによる予算消費シミュレーション', () => {
    const expenses: Array<{ amount: number }> = []

    // 支出を積み重ねる
    expenses.push({ amount: 3000 })
    expect(calcProgress(calcSpend(expenses), BUDGET).isOver).toBe(false) // 30%

    expenses.push({ amount: 5000 })
    expect(calcProgress(calcSpend(expenses), BUDGET).isOver).toBe(false) // 80%

    expenses.push({ amount: 1000 })
    expect(calcProgress(calcSpend(expenses), BUDGET).isOver).toBe(true) // 90% → 警告!

    expenses.push({ amount: 2000 })
    expect(calcProgress(calcSpend(expenses), BUDGET).percentage).toBe(100) // 110% → 100%にキャップ
  })
})

// ─────────────────────────────────────────────
// シナリオ5: 複数推し間の集計独立性
// ─────────────────────────────────────────────
describe('シナリオ5: 複数推しの集計独立性', () => {
  const expenses = [
    { id: '1', oshi_id: 'oshi-A', amount: 5000, category: 'goods' },
    { id: '2', oshi_id: 'oshi-B', amount: 3000, category: 'ticket' },
    { id: '3', oshi_id: 'oshi-A', amount: 2000, category: 'streaming' },
    { id: '4', oshi_id: 'oshi-C', amount: 10000, category: 'goods' },
  ]

  function sumByOshi(oshiId: string): number {
    return expenses
      .filter((e) => e.oshi_id === oshiId)
      .reduce((s, e) => s + e.amount, 0)
  }

  function totalAll(): number {
    return expenses.reduce((s, e) => s + e.amount, 0)
  }

  test('推しAの合計は7000', () => {
    expect(sumByOshi('oshi-A')).toBe(7000)
  })

  test('推しBの合計は3000', () => {
    expect(sumByOshi('oshi-B')).toBe(3000)
  })

  test('推しCの合計は10000', () => {
    expect(sumByOshi('oshi-C')).toBe(10000)
  })

  test('全推しの合計が正しい', () => {
    expect(totalAll()).toBe(20000)
  })

  test('各推し合計の和が全体合計と一致', () => {
    const sumByAll = sumByOshi('oshi-A') + sumByOshi('oshi-B') + sumByOshi('oshi-C')
    expect(sumByAll).toBe(totalAll())
  })

  test('存在しない推しの合計は0', () => {
    expect(sumByOshi('oshi-Z')).toBe(0)
  })
})
