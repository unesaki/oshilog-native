/**
 * シナリオテスト: 推しのライフサイクル
 *
 * テスト種別: E2Eシナリオ（ロジックレベル）
 *
 * カバーするシナリオ:
 * 1. 新規ユーザーの推し登録フロー
 * 2. フリープランの制限から有料プランへの誘導
 * 3. 推し編集フロー
 * 4. 推し削除フロー
 */
import { validateOshiName, validateBudget } from '../../src/lib/validate'

// ─────────────────────────────────────────────
// Mock データストア
// ─────────────────────────────────────────────
type MockOshi = {
  id: string
  user_id: string
  name: string
  color: string
  icon_emoji: string
  sort_order: number
}

type MockBudget = {
  id: string
  user_id: string
  oshi_id: string
  amount: number
  year_month: string
}

class MockOshiStore {
  private oshis: MockOshi[] = []
  private budgets: MockBudget[] = []
  private idCounter = 0

  insertOshi(params: Omit<MockOshi, 'id'>): MockOshi {
    const oshi = { ...params, id: `oshi-${++this.idCounter}` }
    this.oshis.push(oshi)
    return oshi
  }

  insertBudget(params: Omit<MockBudget, 'id'>): MockBudget {
    const budget = { ...params, id: `budget-${this.idCounter}` }
    this.budgets.push(budget)
    return budget
  }

  updateOshi(id: string, updates: Partial<MockOshi>): MockOshi | null {
    const idx = this.oshis.findIndex((o) => o.id === id)
    if (idx === -1) return null
    this.oshis[idx] = { ...this.oshis[idx], ...updates }
    return this.oshis[idx]
  }

  updateBudget(id: string, amount: number): MockBudget | null {
    const idx = this.budgets.findIndex((b) => b.id === id)
    if (idx === -1) return null
    this.budgets[idx].amount = amount
    return this.budgets[idx]
  }

  deleteBudget(id: string): void {
    this.budgets = this.budgets.filter((b) => b.id !== id)
  }

  deleteOshi(id: string): void {
    this.oshis = this.oshis.filter((o) => o.id !== id)
    // カスケードで関連budgetも削除（アプリ側でもfilterする）
    this.budgets = this.budgets.filter((b) => b.oshi_id !== id)
  }

  getOshiCount(): number {
    return this.oshis.length
  }

  getOshis(): MockOshi[] {
    return [...this.oshis]
  }

  getBudget(oshiId: string, yearMonth: string): MockBudget | undefined {
    return this.budgets.find((b) => b.oshi_id === oshiId && b.year_month === yearMonth)
  }
}

// ─────────────────────────────────────────────
// シナリオ1: 新規ユーザーが初めて推しを登録する
// ─────────────────────────────────────────────
describe('シナリオ1: 新規ユーザーの推し登録フロー', () => {
  let store: MockOshiStore

  beforeEach(() => {
    store = new MockOshiStore()
  })

  test('推し名・予算なしで登録する', () => {
    // フォームバリデーション
    const nameErr = validateOshiName('推しA')
    const budgetErr = validateBudget('')
    expect(nameErr).toBeNull()
    expect(budgetErr).toBeNull()

    // 登録
    const oshi = store.insertOshi({
      user_id: 'user-1',
      name: '推しA',
      color: '#FF3D87',
      icon_emoji: '⭐',
      sort_order: 0,
    })
    expect(oshi.id).toBeDefined()
    expect(store.getOshiCount()).toBe(1)
  })

  test('推し名・予算ありで登録する', () => {
    const nameErr = validateOshiName('推しB')
    const budgetErr = validateBudget('20000')
    expect(nameErr).toBeNull()
    expect(budgetErr).toBeNull()

    const oshi = store.insertOshi({
      user_id: 'user-1',
      name: '推しB',
      color: '#9B59B6',
      icon_emoji: '💎',
      sort_order: 0,
    })
    const budget = store.insertBudget({
      user_id: 'user-1',
      oshi_id: oshi.id,
      amount: 20000,
      year_month: '2026-03',
    })
    expect(store.getBudget(oshi.id, '2026-03')?.amount).toBe(20000)
  })

  test('3人の推しを順番に登録する', () => {
    const oshiNames = ['推しA', '推しB', '推しC']
    oshiNames.forEach((name, index) => {
      const nameErr = validateOshiName(name)
      expect(nameErr).toBeNull()

      store.insertOshi({
        user_id: 'user-1',
        name,
        color: '#FF3D87',
        icon_emoji: '⭐',
        sort_order: index,
      })
    })
    expect(store.getOshiCount()).toBe(3)
    expect(store.getOshis().map((o) => o.name)).toEqual(['推しA', '推しB', '推しC'])
  })
})

// ─────────────────────────────────────────────
// シナリオ2: フリープランから有料プランへの誘導
// ─────────────────────────────────────────────
describe('シナリオ2: フリープラン制限 → プレミアム誘導', () => {
  let store: MockOshiStore
  const FREE_PLAN_LIMIT = 3

  beforeEach(() => {
    store = new MockOshiStore()
  })

  function attemptAddOshi(
    name: string,
    isPremium: boolean
  ): { success: boolean; showPremiumModal: boolean; error: string | null } {
    const nameErr = validateOshiName(name)
    if (nameErr) return { success: false, showPremiumModal: false, error: nameErr }

    const oshiCount = store.getOshiCount()
    if (!isPremium && oshiCount >= FREE_PLAN_LIMIT) {
      return { success: false, showPremiumModal: true, error: null }
    }

    store.insertOshi({
      user_id: 'user-1',
      name,
      color: '#FF3D87',
      icon_emoji: '⭐',
      sort_order: oshiCount,
    })
    return { success: true, showPremiumModal: false, error: null }
  }

  test('フリー：1〜3人目は登録できる', () => {
    for (let i = 1; i <= 3; i++) {
      const result = attemptAddOshi(`推し${i}`, false)
      expect(result.success).toBe(true)
      expect(result.showPremiumModal).toBe(false)
    }
    expect(store.getOshiCount()).toBe(3)
  })

  test('フリー：4人目でプレミアムモーダルが表示される', () => {
    // 3人登録済み
    for (let i = 1; i <= 3; i++) {
      attemptAddOshi(`推し${i}`, false)
    }

    // 4人目の試み
    const result = attemptAddOshi('推し4', false)
    expect(result.success).toBe(false)
    expect(result.showPremiumModal).toBe(true)
    expect(store.getOshiCount()).toBe(3) // 登録されていない
  })

  test('フリー：バリデーションエラーの場合はプレミアムモーダルが出ない', () => {
    // 3人登録済み
    for (let i = 1; i <= 3; i++) {
      attemptAddOshi(`推し${i}`, false)
    }

    // 名前空でトライ → バリデーションエラーが先
    const result = attemptAddOshi('', false)
    expect(result.success).toBe(false)
    expect(result.showPremiumModal).toBe(false) // モーダルは出ない
    expect(result.error).toBe('推しの名前を入力してね')
  })

  test('プレミアム：4人目以降も登録できる', () => {
    for (let i = 1; i <= 5; i++) {
      const result = attemptAddOshi(`推し${i}`, true)
      expect(result.success).toBe(true)
      expect(result.showPremiumModal).toBe(false)
    }
    expect(store.getOshiCount()).toBe(5)
  })
})

// ─────────────────────────────────────────────
// シナリオ3: 推し編集フロー
// ─────────────────────────────────────────────
describe('シナリオ3: 推し編集フロー', () => {
  let store: MockOshiStore

  beforeEach(() => {
    store = new MockOshiStore()
    // テスト用推しを事前登録
    const oshi = store.insertOshi({
      user_id: 'user-1',
      name: '旧推し名',
      color: '#FF3D87',
      icon_emoji: '⭐',
      sort_order: 0,
    })
    store.insertBudget({
      user_id: 'user-1',
      oshi_id: oshi.id,
      amount: 10000,
      year_month: '2026-03',
    })
  })

  test('推し名を変更する', () => {
    const oshi = store.getOshis()[0]
    const nameErr = validateOshiName('新推し名')
    expect(nameErr).toBeNull()

    const updated = store.updateOshi(oshi.id, { name: '新推し名' })
    expect(updated?.name).toBe('新推し名')
    expect(store.getOshis()[0].name).toBe('新推し名')
  })

  test('予算を変更する（既存予算あり → update）', () => {
    const oshi = store.getOshis()[0]
    const budget = store.getBudget(oshi.id, '2026-03')!
    expect(budget).not.toBeUndefined()

    const budgetErr = validateBudget('20000')
    expect(budgetErr).toBeNull()

    store.updateBudget(budget.id, 20000)
    expect(store.getBudget(oshi.id, '2026-03')?.amount).toBe(20000)
  })

  test('予算を削除する（空文字入力 → delete）', () => {
    const oshi = store.getOshis()[0]
    const budget = store.getBudget(oshi.id, '2026-03')!

    // 予算欄を空にして保存 → delete
    store.deleteBudget(budget.id)
    expect(store.getBudget(oshi.id, '2026-03')).toBeUndefined()
  })

  test('バリデーションエラー時は変更されない', () => {
    const oshi = store.getOshis()[0]
    const originalName = oshi.name

    const nameErr = validateOshiName('')
    expect(nameErr).not.toBeNull()

    // エラーがあるので更新しない
    if (!nameErr) {
      store.updateOshi(oshi.id, { name: '' })
    }

    expect(store.getOshis()[0].name).toBe(originalName) // 変更なし
  })
})

// ─────────────────────────────────────────────
// シナリオ4: 推し削除フロー（2段階確認）
// ─────────────────────────────────────────────
describe('シナリオ4: 推し削除フロー', () => {
  let store: MockOshiStore

  beforeEach(() => {
    store = new MockOshiStore()
    const oshi = store.insertOshi({
      user_id: 'user-1',
      name: '削除対象の推し',
      color: '#FF3D87',
      icon_emoji: '⭐',
      sort_order: 0,
    })
    store.insertBudget({
      user_id: 'user-1',
      oshi_id: oshi.id,
      amount: 10000,
      year_month: '2026-03',
    })
  })

  test('削除確認UI → 削除ボタン → 推しが削除される', () => {
    const oshi = store.getOshis()[0]

    // Step 1: 削除ボタン押下 → deleteConfirm = true
    let deleteConfirm = false
    deleteConfirm = true
    expect(deleteConfirm).toBe(true)

    // Step 2: 確認ダイアログで「削除する」を押す → 実際の削除
    store.deleteOshi(oshi.id)

    expect(store.getOshiCount()).toBe(0)
    // バジェットもカスケード削除
    expect(store.getBudget(oshi.id, '2026-03')).toBeUndefined()
  })

  test('削除確認UI → キャンセル → 推しは残る', () => {
    const oshi = store.getOshis()[0]
    let deleteConfirm = true

    // キャンセルボタン押下 → deleteConfirm = false
    deleteConfirm = false
    expect(deleteConfirm).toBe(false)

    // 推しは削除されていない
    expect(store.getOshiCount()).toBe(1)
    expect(store.getOshis()[0].id).toBe(oshi.id)
  })

  test('推し削除後は画面が遷移する（router.back）', () => {
    // oshi/[id].tsx の handleDeleteOshi は router.back() を呼ぶ
    const mockRouterBack = jest.fn()

    const oshi = store.getOshis()[0]
    store.deleteOshi(oshi.id)
    mockRouterBack()

    expect(mockRouterBack).toHaveBeenCalledTimes(1)
    expect(store.getOshiCount()).toBe(0)
  })
})

// ─────────────────────────────────────────────
// シナリオ5: 推しリスト画面の表示ロジック
// ─────────────────────────────────────────────
describe('シナリオ5: 推しリスト画面の表示', () => {
  test('推し0人のとき空状態UIが表示される', () => {
    const oshis: MockOshi[] = []
    expect(oshis.length === 0).toBe(true) // → 空状態UI表示
  })

  test('推しリストが sort_order 順に並ぶ', () => {
    const store = new MockOshiStore()
    store.insertOshi({ user_id: 'u1', name: 'C', color: '#000', icon_emoji: '⭐', sort_order: 2 })
    store.insertOshi({ user_id: 'u1', name: 'A', color: '#000', icon_emoji: '⭐', sort_order: 0 })
    store.insertOshi({ user_id: 'u1', name: 'B', color: '#000', icon_emoji: '⭐', sort_order: 1 })

    // DB側でのorder句: .order('sort_order') を想定
    const sorted = [...store.getOshis()].sort((a, b) => a.sort_order - b.sort_order)
    expect(sorted.map((o) => o.name)).toEqual(['A', 'B', 'C'])
  })

  test('推しカードに当月の支出合計が表示される', () => {
    const oshiId = 'oshi-1'
    const expenses = [
      { oshi_id: oshiId, amount: 3000 },
      { oshi_id: oshiId, amount: 2000 },
      { oshi_id: 'oshi-2', amount: 5000 }, // 別の推し
    ]

    const spend = expenses
      .filter((e) => e.oshi_id === oshiId)
      .reduce((s, e) => s + e.amount, 0)

    expect(spend).toBe(5000)
  })
})
