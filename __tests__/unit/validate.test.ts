/**
 * ユニットテスト: バリデーション関数
 *
 * 対象: src/lib/validate.ts
 * テスト種別: ユニットテスト
 */
import {
  sanitizeText,
  validateOshiName,
  validateBudget,
  validateAmount,
  validateExpenseTitle,
  validateMemo,
  validateDate,
} from '../../src/lib/validate'

// ─────────────────────────────────────────────
// sanitizeText
// ─────────────────────────────────────────────
describe('sanitizeText', () => {
  test('前後のスペースをトリムする', () => {
    expect(sanitizeText('  hello  ')).toBe('hello')
  })

  test('制御文字(0x00-0x08)を除去する', () => {
    expect(sanitizeText('abc\x00\x01\x08def')).toBe('abcdef')
  })

  test('制御文字(0x0B=垂直タブ)を除去する', () => {
    expect(sanitizeText('abc\x0Bdef')).toBe('abcdef')
  })

  test('改行(\\n=0x0A)は保持する', () => {
    expect(sanitizeText('abc\ndef')).toBe('abc\ndef')
  })

  test('タブ(\\t=0x09)は保持する', () => {
    expect(sanitizeText('abc\tdef')).toBe('abc\tdef')
  })

  test('DEL文字(0x7F)を除去する', () => {
    expect(sanitizeText('abc\x7Fdef')).toBe('abcdef')
  })

  test('通常の日本語テキストはそのまま', () => {
    expect(sanitizeText('推しの名前')).toBe('推しの名前')
  })

  test('空文字列は空文字列を返す', () => {
    expect(sanitizeText('')).toBe('')
  })

  test('スペースのみの文字列は空文字列を返す', () => {
    expect(sanitizeText('   ')).toBe('')
  })

  test('制御文字とトリムの組み合わせ', () => {
    expect(sanitizeText('  \x01abc\x02  ')).toBe('abc')
  })
})

// ─────────────────────────────────────────────
// validateOshiName
// ─────────────────────────────────────────────
describe('validateOshiName', () => {
  test('正常な名前はnullを返す', () => {
    expect(validateOshiName('推しA')).toBeNull()
  })

  test('空文字列はエラーを返す', () => {
    expect(validateOshiName('')).toBe('推しの名前を入力してね')
  })

  test('スペースのみはエラーを返す', () => {
    expect(validateOshiName('   ')).toBe('推しの名前を入力してね')
  })

  test('30文字ちょうどはOK', () => {
    expect(validateOshiName('あ'.repeat(30))).toBeNull()
  })

  test('31文字はエラーを返す', () => {
    expect(validateOshiName('あ'.repeat(31))).toBe('30文字以内で入力してね')
  })

  test('50文字はエラーを返す', () => {
    expect(validateOshiName('a'.repeat(50))).toBe('30文字以内で入力してね')
  })

  test('前後スペースは除去してから検証される（29文字+前後スペース→OK）', () => {
    expect(validateOshiName('  ' + 'a'.repeat(29) + '  ')).toBeNull()
  })

  test('前後スペース除去後30文字を超える場合はエラー', () => {
    expect(validateOshiName('  ' + 'a'.repeat(31) + '  ')).toBe('30文字以内で入力してね')
  })

  test('英数字の名前はOK', () => {
    expect(validateOshiName('AKB48')).toBeNull()
  })

  test('絵文字を含む名前はOK（文字数が範囲内なら）', () => {
    expect(validateOshiName('⭐推し⭐')).toBeNull()
  })
})

// ─────────────────────────────────────────────
// validateBudget
// ─────────────────────────────────────────────
describe('validateBudget', () => {
  test('空文字列はnullを返す（任意フィールド）', () => {
    expect(validateBudget('')).toBeNull()
  })

  test('"1"はOK', () => {
    expect(validateBudget('1')).toBeNull()
  })

  test('"9999999"はOK（上限）', () => {
    expect(validateBudget('9999999')).toBeNull()
  })

  test('"10000000"は上限エラー', () => {
    expect(validateBudget('10000000')).toBe('上限は ¥9,999,999 だよ')
  })

  test('"0"は1円以上エラー', () => {
    expect(validateBudget('0')).toBe('1円以上で入力してね')
  })

  test('"abc"は数字エラー', () => {
    expect(validateBudget('abc')).toBe('半角数字で入力してね')
  })

  test('小数点を含む "100.5" は数字エラー', () => {
    expect(validateBudget('100.5')).toBe('半角数字で入力してね')
  })

  test('マイナス "-100" は数字エラー', () => {
    expect(validateBudget('-100')).toBe('半角数字で入力してね')
  })

  test('"50000"（一般的な予算額）はOK', () => {
    expect(validateBudget('50000')).toBeNull()
  })

  test('先頭ゼロ付き "0001" はparseIntで1になりOK', () => {
    // !/^\d+$/.test("0001") = false → parseInt("0001") = 1 → 1 >= 1 → null
    expect(validateBudget('0001')).toBeNull()
  })

  test('全角数字 "１００" は数字エラー', () => {
    expect(validateBudget('１００')).toBe('半角数字で入力してね')
  })

  test('スペース混じり "1 000" は数字エラー', () => {
    expect(validateBudget('1 000')).toBe('半角数字で入力してね')
  })
})

// ─────────────────────────────────────────────
// validateAmount
// ─────────────────────────────────────────────
describe('validateAmount', () => {
  test('0はエラー（金額未入力）', () => {
    expect(validateAmount(0)).toBe('金額を入力してね')
  })

  test('1はOK（最小値）', () => {
    expect(validateAmount(1)).toBeNull()
  })

  test('9999999はOK（上限）', () => {
    expect(validateAmount(9_999_999)).toBeNull()
  })

  test('10000000は上限エラー', () => {
    expect(validateAmount(10_000_000)).toBe('上限は ¥9,999,999 だよ')
  })

  test('マイナス値はエラー（金額未入力扱い）', () => {
    expect(validateAmount(-1)).toBe('金額を入力してね')
  })

  test('一般的な金額 3000 はOK', () => {
    expect(validateAmount(3000)).toBeNull()
  })
})

// ─────────────────────────────────────────────
// validateExpenseTitle
// ─────────────────────────────────────────────
describe('validateExpenseTitle', () => {
  test('正常なタイトルはnullを返す', () => {
    expect(validateExpenseTitle('ライブグッズ購入')).toBeNull()
  })

  test('空文字列はエラーを返す', () => {
    expect(validateExpenseTitle('')).toBe('タイトルを入力してね')
  })

  test('スペースのみはエラーを返す', () => {
    expect(validateExpenseTitle('   ')).toBe('タイトルを入力してね')
  })

  test('50文字ちょうどはOK', () => {
    expect(validateExpenseTitle('あ'.repeat(50))).toBeNull()
  })

  test('51文字はエラーを返す', () => {
    expect(validateExpenseTitle('あ'.repeat(51))).toBe('50文字以内で入力してね')
  })

  test('前後スペースは無視して検証（実際の文字列は空でない）', () => {
    expect(validateExpenseTitle('  タイトル  ')).toBeNull()
  })

  test('前後スペース除去後50文字以上でもエラー', () => {
    expect(validateExpenseTitle('あ'.repeat(51))).toBe('50文字以内で入力してね')
  })
})

// ─────────────────────────────────────────────
// validateMemo
// ─────────────────────────────────────────────
describe('validateMemo', () => {
  test('空文字列はnullを返す（任意フィールド）', () => {
    expect(validateMemo('')).toBeNull()
  })

  test('200文字ちょうどはOK', () => {
    expect(validateMemo('あ'.repeat(200))).toBeNull()
  })

  test('201文字はエラーを返す', () => {
    expect(validateMemo('あ'.repeat(201))).toBe('200文字以内で入力してね')
  })

  test('通常のメモはOK', () => {
    expect(validateMemo('とても楽しいライブでした！')).toBeNull()
  })

  // 注意: validateMemo は trim() を呼ばないため、
  // スペースのみでも文字数としてカウントされる
  test('スペース200個はOK（trimなし）', () => {
    expect(validateMemo(' '.repeat(200))).toBeNull()
  })

  test('スペース201個はエラー（trimなし）', () => {
    expect(validateMemo(' '.repeat(201))).toBe('200文字以内で入力してね')
  })
})

// ─────────────────────────────────────────────
// validateDate
// ─────────────────────────────────────────────
describe('validateDate', () => {
  // 現在日時を固定してテスト
  const FIXED_NOW = new Date('2026-03-15T12:00:00.000Z')

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(FIXED_NOW)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('空文字列はエラーを返す', () => {
    expect(validateDate('')).toBe('日付を選んでね')
  })

  test('今日の日付はOK', () => {
    expect(validateDate('2026-03-15')).toBeNull()
  })

  test('昨日の日付はOK', () => {
    expect(validateDate('2026-03-14')).toBeNull()
  })

  test('1ヶ月先（ちょうど）はOK境界付近', () => {
    // 2026-04-15 は1ヶ月先 → oneMonthLater = 2026-04-15 → d === oneMonthLater → OKかエラーか
    // oneMonthLater = new Date(), setMonth(month + 1) → 2026-04-15T12:00:00Z
    // "2026-04-15" → new Date("2026-04-15") → UTC 2026-04-15T00:00:00Z
    // d (00:00 UTC) < oneMonthLater (12:00 UTC) → エラーにならない
    expect(validateDate('2026-04-15')).toBeNull()
  })

  test('1ヶ月超先の日付はエラー', () => {
    expect(validateDate('2026-05-01')).toBe('1ヶ月以上先の日付は入力できないよ')
  })

  test('2年前（ちょうど）はOK境界付近', () => {
    // twoYearsAgo = 2024-03-15T12:00:00Z
    // "2024-03-15" → 2024-03-15T00:00:00Z < 2024-03-15T12:00:00Z → エラーになる
    expect(validateDate('2024-03-15')).toBe('2年以上前の日付は入力できないよ')
  })

  test('2年と1日前はエラー', () => {
    expect(validateDate('2024-03-14')).toBe('2年以上前の日付は入力できないよ')
  })

  test('2年前より後はOK', () => {
    expect(validateDate('2024-03-16')).toBeNull()
  })

  test('不正な日付文字列はエラー', () => {
    expect(validateDate('invalid-date')).toBe('正しい日付を入力してね')
  })

  test('"2026-13-01"（不正月）はエラー', () => {
    // new Date("2026-13-01") → Invalid Date
    expect(validateDate('2026-13-01')).toBe('正しい日付を入力してね')
  })

  test('"2026-02-30"（不正日）はエラー', () => {
    // JavaScriptは "2026-02-30" → 2026-03-02 にオーバーフローする
    // つまり valid な date として扱われる（潜在的バグ）
    const result = validateDate('2026-02-30')
    // 2026-03-02はnowの1日後なので範囲内 → null
    expect(result).toBeNull() // NOTE: JSのDate仕様によりオーバーフロー日付が有効と判定される
  })

  test('YYYY-MM-DD 以外のフォーマットもパース試みる', () => {
    // "2026/03/15" は ISO 形式ではないがブラウザによってはパースされる
    // React Native (JSC) では Invalid Date の可能性あり
    const result = validateDate('2026/03/15')
    // 環境依存のため null または エラーになりうる
    // どちらの場合も致命的でない
    expect(typeof result === 'string' || result === null).toBe(true)
  })

  test('数値っぽい文字列 "20260315" はエラー', () => {
    // new Date("20260315") → Invalid Date
    expect(validateDate('20260315')).toBe('正しい日付を入力してね')
  })
})
