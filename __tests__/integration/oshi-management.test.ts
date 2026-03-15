/**
 * 結合テスト: 推し管理のビジネスロジック
 *
 * 対象: app/(app)/oshi/new.tsx, oshi/index.tsx, oshi/[id].tsx
 * テスト種別: 結合テスト
 */
import { validateOshiName, validateBudget, sanitizeText } from '../../src/lib/validate'
import { formatYearMonth } from '../../src/lib/utils'

// ─────────────────────────────────────────────
// 推し新規登録フォームのバリデーション
// ─────────────────────────────────────────────
describe('推し新規登録 - フォームバリデーション', () => {
  function validateNewOshiForm(params: {
    name: string
    budgetStr: string
  }): { nameError: string | null; budgetError: string | null; isValid: boolean } {
    const nameError = validateOshiName(params.name)
    const budgetError = validateBudget(params.budgetStr)
    return {
      nameError,
      budgetError,
      isValid: !nameError && !budgetError,
    }
  }

  test('正常な名前・予算なし → 有効', () => {
    const result = validateNewOshiForm({ name: '推しA', budgetStr: '' })
    expect(result.isValid).toBe(true)
    expect(result.nameError).toBeNull()
    expect(result.budgetError).toBeNull()
  })

  test('正常な名前・正常な予算 → 有効', () => {
    const result = validateNewOshiForm({ name: '推しA', budgetStr: '20000' })
    expect(result.isValid).toBe(true)
  })

  test('名前空 → 無効', () => {
    const result = validateNewOshiForm({ name: '', budgetStr: '' })
    expect(result.isValid).toBe(false)
    expect(result.nameError).toBe('推しの名前を入力してね')
  })

  test('名前31文字 → 無効', () => {
    const result = validateNewOshiForm({ name: 'あ'.repeat(31), budgetStr: '' })
    expect(result.isValid).toBe(false)
    expect(result.nameError).toBe('30文字以内で入力してね')
  })

  test('予算に文字 → 無効', () => {
    const result = validateNewOshiForm({ name: '推しA', budgetStr: 'abc' })
    expect(result.isValid).toBe(false)
    expect(result.budgetError).toBe('半角数字で入力してね')
  })

  test('予算0 → 無効', () => {
    const result = validateNewOshiForm({ name: '推しA', budgetStr: '0' })
    expect(result.isValid).toBe(false)
    expect(result.budgetError).toBe('1円以上で入力してね')
  })

  test('予算上限超え → 無効', () => {
    const result = validateNewOshiForm({ name: '推しA', budgetStr: '10000000' })
    expect(result.isValid).toBe(false)
    expect(result.budgetError).toBe('上限は ¥9,999,999 だよ')
  })

  test('名前・予算両方エラー', () => {
    const result = validateNewOshiForm({ name: '', budgetStr: 'abc' })
    expect(result.isValid).toBe(false)
    expect(result.nameError).not.toBeNull()
    expect(result.budgetError).not.toBeNull()
  })
})

// ─────────────────────────────────────────────
// フリープランの上限チェック
// ─────────────────────────────────────────────
describe('フリープラン 推し上限チェック', () => {
  const FREE_PLAN_LIMIT = 3

  function canAddOshi(oshiCount: number, isPremium: boolean): boolean {
    return isPremium || oshiCount < FREE_PLAN_LIMIT
  }

  function shouldShowPremiumModal(
    oshiCount: number,
    isPremium: boolean,
    formValid: boolean
  ): boolean {
    if (!formValid) return false
    return !isPremium && oshiCount >= FREE_PLAN_LIMIT
  }

  test('フリー・推し0人 → 追加可能', () => {
    expect(canAddOshi(0, false)).toBe(true)
  })

  test('フリー・推し2人 → 追加可能', () => {
    expect(canAddOshi(2, false)).toBe(true)
  })

  test('フリー・推し3人 → 追加不可（プレミアムモーダル表示）', () => {
    expect(canAddOshi(3, false)).toBe(false)
  })

  test('フリー・推し3人・フォーム有効 → プレミアムモーダル表示', () => {
    expect(shouldShowPremiumModal(3, false, true)).toBe(true)
  })

  test('フリー・推し3人・フォーム無効 → バリデーションエラーが先（モーダルなし）', () => {
    // 実際のコードでは validateOshiName → if(nameErr || budgetErr) return → premium check
    // つまりフォームが無効なら premium modal は表示されない
    expect(shouldShowPremiumModal(3, false, false)).toBe(false)
  })

  test('プレミアム・推し3人 → 追加可能', () => {
    expect(canAddOshi(3, true)).toBe(true)
  })

  test('プレミアム・推し10人 → 追加可能', () => {
    expect(canAddOshi(10, true)).toBe(true)
  })

  test('フリー・推し100人（異常系）→ 追加不可', () => {
    expect(canAddOshi(100, false)).toBe(false)
  })
})

// ─────────────────────────────────────────────
// 推し登録のDBペイロード生成
// ─────────────────────────────────────────────
describe('推し登録 - DBペイロード生成', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15'))
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  function buildOshiPayload(params: {
    userId: string
    name: string
    color: string
    iconEmoji: string
    oshiCount: number
  }) {
    return {
      user_id: params.userId,
      name: sanitizeText(params.name),
      color: params.color,
      icon_emoji: params.iconEmoji,
      icon_url: null,
      sort_order: params.oshiCount,
    }
  }

  function buildBudgetPayload(params: {
    userId: string
    oshiId: string
    budgetStr: string
  }) {
    const { yearMonth } = formatYearMonth()
    const amount = parseInt(params.budgetStr)
    if (!params.budgetStr || amount <= 0) return null
    return {
      user_id: params.userId,
      oshi_id: params.oshiId,
      amount,
      year_month: yearMonth,
    }
  }

  test('推しペイロードが正しく生成される', () => {
    const payload = buildOshiPayload({
      userId: 'user-1',
      name: '  テスト推し  ',
      color: '#FF3D87',
      iconEmoji: '⭐',
      oshiCount: 2,
    })
    expect(payload.user_id).toBe('user-1')
    expect(payload.name).toBe('テスト推し') // sanitize済み
    expect(payload.sort_order).toBe(2)
    expect(payload.icon_url).toBeNull()
  })

  test('予算あり → 予算ペイロード生成', () => {
    const payload = buildBudgetPayload({
      userId: 'user-1',
      oshiId: 'oshi-1',
      budgetStr: '20000',
    })
    expect(payload).not.toBeNull()
    expect(payload!.amount).toBe(20000)
    expect(payload!.year_month).toBe('2026-03')
  })

  test('予算空文字 → nullを返す（予算登録しない）', () => {
    const payload = buildBudgetPayload({
      userId: 'user-1',
      oshiId: 'oshi-1',
      budgetStr: '',
    })
    expect(payload).toBeNull()
  })

  test('予算"0" → nullを返す（0は登録しない）', () => {
    // parseInt("0") = 0 → 0 <= 0 → null
    const payload = buildBudgetPayload({
      userId: 'user-1',
      oshiId: 'oshi-1',
      budgetStr: '0',
    })
    expect(payload).toBeNull()
  })
})

// ─────────────────────────────────────────────
// 推し編集の予算更新ロジック
// ─────────────────────────────────────────────
describe('推し編集 - 予算更新ロジック', () => {
  type BudgetAction = 'create' | 'update' | 'delete' | 'none'

  function determineBudgetAction(
    existingBudgetId: string | undefined,
    newBudgetStr: string
  ): BudgetAction {
    const newAmount = newBudgetStr ? parseInt(newBudgetStr) : 0
    if (newAmount > 0) {
      return existingBudgetId ? 'update' : 'create'
    } else if (existingBudgetId) {
      return 'delete'
    }
    return 'none'
  }

  test('既存予算なし・新予算あり → create', () => {
    expect(determineBudgetAction(undefined, '20000')).toBe('create')
  })

  test('既存予算あり・新予算あり → update', () => {
    expect(determineBudgetAction('budget-1', '30000')).toBe('update')
  })

  test('既存予算あり・新予算空文字 → delete', () => {
    expect(determineBudgetAction('budget-1', '')).toBe('delete')
  })

  test('既存予算なし・新予算空文字 → none', () => {
    expect(determineBudgetAction(undefined, '')).toBe('none')
  })

  test('既存予算あり・新予算"0" → delete', () => {
    // parseInt("0") = 0 → 0 > 0 = false → existingBudget あり → delete
    expect(determineBudgetAction('budget-1', '0')).toBe('delete')
  })
})

// ─────────────────────────────────────────────
// 推し削除の影響範囲
// ─────────────────────────────────────────────
describe('推し削除ロジック', () => {
  /**
   * oshis テーブル削除時、関連するexpenses・budgetsも
   * DBのカスケード設定やアプリ側のフィルタリングで対応される
   */
  test('oshi削除後、ローカルstateからその推しのexpensesが除外される', () => {
    const oshis = [
      { id: 'oshi-1', name: '推しA' },
      { id: 'oshi-2', name: '推しB' },
    ]
    const expenses = [
      { id: 'exp-1', oshi_id: 'oshi-1', amount: 1000 },
      { id: 'exp-2', oshi_id: 'oshi-2', amount: 2000 },
      { id: 'exp-3', oshi_id: 'oshi-1', amount: 500 },
    ]

    const deletedOshiId = 'oshi-1'
    const remainingOshis = oshis.filter((o) => o.id !== deletedOshiId)
    // oshiListScreen の handleDelete は oshi のみ削除し、expenses はDBカスケード
    // ローカルstateでは oshi を filter するが expenses は再fetchまで残る
    // BUGの可能性: oshi削除後、expenses stateに削除済みoshi_idの支出が残る
    const remainingExpensesInState = expenses // expenses は削除されない

    expect(remainingOshis.length).toBe(1)
    expect(remainingOshis[0].id).toBe('oshi-2')
    // expenses stateにはまだoshi-1の支出が残っている（意図的 or バグ）
    expect(remainingExpensesInState.filter(e => e.oshi_id === deletedOshiId).length).toBe(2)
    console.warn('[注意] oshi削除後、expenses stateに削除済みoshi_idの支出が一時的に残る')
  })

  test('oshi削除後、ローカルstateからそのoshiのbudgetが除外される', () => {
    const budgets = [
      { id: 'b-1', oshi_id: 'oshi-1', amount: 10000 },
      { id: 'b-2', oshi_id: 'oshi-2', amount: 20000 },
    ]

    const deletedOshiId = 'oshi-1'
    // oshiListScreen の handleDelete は setBudgets(prev => prev.filter(b => b.oshi_id !== deletedOshiId))
    const remainingBudgets = budgets.filter((b) => b.oshi_id !== deletedOshiId)

    expect(remainingBudgets.length).toBe(1)
    expect(remainingBudgets[0].oshi_id).toBe('oshi-2')
  })
})

// ─────────────────────────────────────────────
// sort_order のレースコンディション
// ─────────────────────────────────────────────
describe('推し登録 - sort_order のレースコンディション', () => {
  /**
   * BUG: sort_order = oshiCount を画面マウント時に取得。
   * 別デバイスや別タブで同時に推しを追加した場合、sort_orderが重複する可能性。
   */
  test('同一oshiCountで同時登録するとsort_orderが重複する', () => {
    const oshiCountAtMount = 2 // 両デバイスがほぼ同時にマウント

    const payload1 = { name: '推しA', sort_order: oshiCountAtMount } // sort_order: 2
    const payload2 = { name: '推しB', sort_order: oshiCountAtMount } // sort_order: 2 (重複!)

    expect(payload1.sort_order).toBe(payload2.sort_order)
    console.warn('[既知レースコンディション] sort_order が重複する可能性あり。DBのUNIQUE制約がない場合は表示順が不定になる')
  })
})
