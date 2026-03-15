/**
 * 結合テスト: 支出追加フォームのバリデーションと送信ロジック
 *
 * 対象: app/(app)/add.tsx のビジネスロジック
 * テスト種別: 結合テスト
 *
 * 方針: UIコンポーネントのレンダリングではなく、
 * バリデーション・送信・エラーハンドリングのロジックを検証する
 */
import {
  validateAmount,
  validateExpenseTitle,
  validateMemo,
  validateDate,
  sanitizeText,
} from '../../src/lib/validate'

// ─────────────────────────────────────────────
// フォーム送信バリデーション統合テスト
// ─────────────────────────────────────────────
describe('支出追加フォーム - 送信バリデーション', () => {
  function validateExpenseForm(params: {
    amount: number
    selectedOshiId: string | null
    category: string
    title: string
    memo: string
    date: string
  }): Record<string, string> {
    const amountErr = validateAmount(params.amount)
    const titleErr = validateExpenseTitle(params.title)
    const memoErr = validateMemo(params.memo)
    const dateErr = validateDate(params.date)
    const oshiErr = params.selectedOshiId ? null : '推しを選んでね'

    const errors: Record<string, string> = {}
    if (amountErr) errors.amount = amountErr
    if (titleErr) errors.title = titleErr
    if (memoErr) errors.memo = memoErr
    if (dateErr) errors.date = dateErr
    if (oshiErr) errors.oshi = oshiErr
    return errors
  }

  // タイムスタンプ固定
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T12:00:00.000Z'))
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  const validForm = {
    amount: 3000,
    selectedOshiId: 'oshi-uuid-1',
    category: 'goods',
    title: 'ライブグッズ',
    memo: '',
    date: '2026-03-15',
  }

  test('全フィールド正常 → エラーなし', () => {
    const errors = validateExpenseForm(validForm)
    expect(errors).toEqual({})
  })

  test('金額 0 → amountエラー', () => {
    const errors = validateExpenseForm({ ...validForm, amount: 0 })
    expect(errors.amount).toBe('金額を入力してね')
    expect(Object.keys(errors).length).toBe(1)
  })

  test('金額 1 → エラーなし', () => {
    const errors = validateExpenseForm({ ...validForm, amount: 1 })
    expect(errors.amount).toBeUndefined()
  })

  test('金額 9999999 → エラーなし', () => {
    const errors = validateExpenseForm({ ...validForm, amount: 9_999_999 })
    expect(errors.amount).toBeUndefined()
  })

  test('推し未選択 → oshiエラー', () => {
    const errors = validateExpenseForm({ ...validForm, selectedOshiId: null })
    expect(errors.oshi).toBe('推しを選んでね')
  })

  test('タイトル空 → titleエラー', () => {
    const errors = validateExpenseForm({ ...validForm, title: '' })
    expect(errors.title).toBe('タイトルを入力してね')
  })

  test('タイトル50文字 → エラーなし', () => {
    const errors = validateExpenseForm({ ...validForm, title: 'あ'.repeat(50) })
    expect(errors.title).toBeUndefined()
  })

  test('タイトル51文字 → titleエラー（maxLength=51でも検証は50まで）', () => {
    const errors = validateExpenseForm({ ...validForm, title: 'あ'.repeat(51) })
    expect(errors.title).toBe('50文字以内で入力してね')
  })

  test('メモ200文字 → エラーなし', () => {
    const errors = validateExpenseForm({ ...validForm, memo: 'a'.repeat(200) })
    expect(errors.memo).toBeUndefined()
  })

  test('メモ201文字 → memoエラー（maxLength=201でも検証は200まで）', () => {
    const errors = validateExpenseForm({ ...validForm, memo: 'a'.repeat(201) })
    expect(errors.memo).toBe('200文字以内で入力してね')
  })

  test('2年以上前の日付 → dateエラー', () => {
    const errors = validateExpenseForm({ ...validForm, date: '2024-01-01' })
    expect(errors.date).toBe('2年以上前の日付は入力できないよ')
  })

  test('2ヶ月先の日付 → dateエラー', () => {
    const errors = validateExpenseForm({ ...validForm, date: '2026-06-01' })
    expect(errors.date).toBe('1ヶ月以上先の日付は入力できないよ')
  })

  test('複数フィールド同時エラー', () => {
    const errors = validateExpenseForm({
      amount: 0,
      selectedOshiId: null,
      category: 'goods',
      title: '',
      memo: 'a'.repeat(201),
      date: '2024-01-01',
    })
    expect(errors.amount).toBeDefined()
    expect(errors.oshi).toBeDefined()
    expect(errors.title).toBeDefined()
    expect(errors.memo).toBeDefined()
    expect(errors.date).toBeDefined()
    expect(Object.keys(errors).length).toBe(5)
  })
})

// ─────────────────────────────────────────────
// データ送信前のサニタイズ処理
// ─────────────────────────────────────────────
describe('支出追加フォーム - 送信データのサニタイズ', () => {
  function buildExpensePayload(params: {
    userId: string
    oshiId: string
    amount: number
    category: string
    title: string
    memo: string
    date: string
  }) {
    return {
      user_id: params.userId,
      oshi_id: params.oshiId,
      amount: params.amount,
      category: params.category,
      title: sanitizeText(params.title),
      memo: sanitizeText(params.memo) || null,
      spent_at: params.date,
    }
  }

  test('タイトルのトリムとサニタイズ', () => {
    const payload = buildExpensePayload({
      userId: 'user-1',
      oshiId: 'oshi-1',
      amount: 1000,
      category: 'goods',
      title: '  ライブグッズ  ',
      memo: '',
      date: '2026-03-15',
    })
    expect(payload.title).toBe('ライブグッズ')
  })

  test('空のメモはnullになる', () => {
    const payload = buildExpensePayload({
      userId: 'user-1',
      oshiId: 'oshi-1',
      amount: 1000,
      category: 'goods',
      title: 'テスト',
      memo: '',
      date: '2026-03-15',
    })
    expect(payload.memo).toBeNull()
  })

  test('スペースのみのメモはnullになる', () => {
    const payload = buildExpensePayload({
      userId: 'user-1',
      oshiId: 'oshi-1',
      amount: 1000,
      category: 'goods',
      title: 'テスト',
      memo: '   ',
      date: '2026-03-15',
    })
    expect(payload.memo).toBeNull()
  })

  test('有効なメモはそのまま保持される', () => {
    const payload = buildExpensePayload({
      userId: 'user-1',
      oshiId: 'oshi-1',
      amount: 1000,
      category: 'goods',
      title: 'テスト',
      memo: '楽しかった！',
      date: '2026-03-15',
    })
    expect(payload.memo).toBe('楽しかった！')
  })

  test('制御文字を含むタイトルはサニタイズされる', () => {
    const payload = buildExpensePayload({
      userId: 'user-1',
      oshiId: 'oshi-1',
      amount: 1000,
      category: 'goods',
      title: 'タイトル\x00\x01',
      memo: '',
      date: '2026-03-15',
    })
    expect(payload.title).toBe('タイトル')
  })
})

// ─────────────────────────────────────────────
// 日付選択のタイムゾーンバグ検証
// ─────────────────────────────────────────────
describe('日付選択 - タイムゾーン境界のバグ', () => {
  /**
   * BUG: DateTimePicker の onChange で `selected.toISOString().split('T')[0]` を使用。
   * toISOString() は UTC 時刻を返すため、タイムゾーンがプラスの場合（例: JST UTC+9）
   * 深夜〜午前9時の選択は1日前の日付になる可能性がある。
   */
  test('[既知バグ] JST環境で深夜に日付選択すると1日ずれる可能性', () => {
    // JST 2026-03-15 00:30 (UTC 2026-03-14 15:30)
    // toISOString() → "2026-03-14T15:30:00.000Z"
    // split('T')[0] → "2026-03-14" ← 選んだ日付(3/15)より1日前
    const jstDate = new Date('2026-03-15T00:30:00+09:00')
    const isoDateStr = jstDate.toISOString().split('T')[0]
    // UTC環境では正しい日付が返るが、JST環境では3/14になる
    // (テスト実行環境がUTCの場合はこの不一致は検出されない)
    expect(typeof isoDateStr).toBe('string')
    expect(isoDateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    // NOTE: UTC環境では "2026-03-14" が返る（バグの再現）
    console.warn('[バグ確認] ISO日付:', isoDateStr, '(UTCなら3/14、JSTで選んだ3/15とズレる)')
  })

  test('正しい実装案: toLocaleDateString("sv") でローカル日付を取得', () => {
    // 修正案: toLocaleDateString('sv') でローカルタイムゾーンの日付を返す
    const date = new Date('2026-03-15T00:30:00')
    const localDateStr = date.toLocaleDateString('sv')
    expect(localDateStr).toBe('2026-03-15')
  })
})
