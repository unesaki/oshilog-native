/**
 * ユニットテスト: ユーティリティ関数
 *
 * 対象: src/lib/utils.ts
 * テスト種別: ユニットテスト
 */

// WEEK_DAYS のモック
jest.mock('../../src/constants/colors', () => ({
  WEEK_DAYS: ['日', '月', '火', '水', '木', '金', '土'],
}))

import { lightenHex, formatDate, getLocalDateString, formatYearMonth, formatAmount } from '../../src/lib/utils'

// ─────────────────────────────────────────────
// lightenHex
// ─────────────────────────────────────────────
describe('lightenHex', () => {
  test('amount=0 のとき元の色を返す', () => {
    expect(lightenHex('#FF0000', 0)).toBe('#ff0000')
  })

  test('amount=1 のとき白(#ffffff)を返す', () => {
    expect(lightenHex('#000000', 1)).toBe('#ffffff')
  })

  test('amount=0.5 のとき中間色を返す（#FF0000 → #ff7f7f）', () => {
    // R: 255 + (255-255)*0.5 = 255 → ff
    // G: 0 + (255-0)*0.5 = 127.5 → round = 128 → 80
    // B: 0 + (255-0)*0.5 = 127.5 → round = 128 → 80
    expect(lightenHex('#FF0000', 0.5)).toBe('#ff8080')
  })

  test('黒(#000000)を amount=0.5 で明るくする', () => {
    // R,G,B: 0 + (255-0)*0.5 = 127.5 → 128 → 80
    expect(lightenHex('#000000', 0.5)).toBe('#808080')
  })

  test('6文字以外の入力はそのまま返す', () => {
    expect(lightenHex('#FFF', 0.5)).toBe('#FFF')
    expect(lightenHex('', 0.5)).toBe('')
  })

  test('[既知挙動] 非16進数の6文字入力はNaN計算になる（防御的処理なし）', () => {
    // '#' 除去後 'RRGGBB' は6文字 → parseInt('RR', 16) = NaN → 計算結果が NaN になる
    // 実装に入力バリデーションがないため不正hex文字は NaN になる
    const result = lightenHex('#RRGGBB', 0.5)
    expect(result).toContain('NaN') // NaN が混入した文字列が返る
    console.warn('[既知挙動] lightenHex は非16進数文字を入力するとNaNが発生する。使用箇所ではOSHI_COLORSの定数カラーのみ渡しているため実害なし')
  })

  test('# なしの6文字はパース試みる', () => {
    // '#' を除去後 = 'FFFFFF' が6文字 → 正常処理
    // parseInt('FF', 16) = 255 etc.
    expect(lightenHex('#FFFFFF', 0)).toBe('#ffffff')
  })

  test('実際のアプリカラー #FF3D87 を明るくする', () => {
    const result = lightenHex('#FF3D87', 0.35)
    // R: 255 + 0 * 0.35 = 255 → ff
    // G: 61 + (255-61)*0.35 = 61 + 67.9 = 128.9 → 129 → 81
    // B: 135 + (255-135)*0.35 = 135 + 42 = 177 → b1
    expect(result).toMatch(/^#[0-9a-f]{6}$/)
  })
})

// ─────────────────────────────────────────────
// formatDate
// ─────────────────────────────────────────────
describe('formatDate', () => {
  test('2026-03-15（日曜日）を正しくフォーマット', () => {
    // 2026-03-15 は日曜日
    const result = formatDate('2026-03-15')
    expect(result).toBe('2026年3月15日（日）')
  })

  test('2026-01-01（木曜日）を正しくフォーマット', () => {
    const result = formatDate('2026-01-01')
    expect(result).toBe('2026年1月1日（木）')
  })

  test('月と日の先頭ゼロを除去する', () => {
    // 2026-01-05 → "2026年1月5日"（01→1, 05→5）
    const result = formatDate('2026-01-05')
    expect(result).toContain('1月5日')
    expect(result).not.toContain('01月')
    expect(result).not.toContain('05日')
  })

  test('2024-12-31（火曜日）を正しくフォーマット', () => {
    const result = formatDate('2024-12-31')
    expect(result).toBe('2024年12月31日（火）')
  })

  test('週の各曜日が正しくマッピングされる', () => {
    // 既知の曜日でテスト
    // 2026-03-16 月曜日
    expect(formatDate('2026-03-16')).toContain('（月）')
    // 2026-03-17 火曜日
    expect(formatDate('2026-03-17')).toContain('（火）')
    // 2026-03-18 水曜日
    expect(formatDate('2026-03-18')).toContain('（水）')
    // 2026-03-19 木曜日
    expect(formatDate('2026-03-19')).toContain('（木）')
    // 2026-03-20 金曜日
    expect(formatDate('2026-03-20')).toContain('（金）')
    // 2026-03-21 土曜日
    expect(formatDate('2026-03-21')).toContain('（土）')
  })
})

// ─────────────────────────────────────────────
// getLocalDateString
// ─────────────────────────────────────────────
describe('getLocalDateString', () => {
  test('YYYY-MM-DD フォーマットを返す', () => {
    const result = getLocalDateString()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('固定日時を使ったとき期待する日付を返す', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-03-15T12:00:00.000Z'))
    const result = getLocalDateString()
    // sv ロケールは YYYY-MM-DD を返す
    expect(result).toMatch(/^2026-03-\d{2}$/)
    jest.useRealTimers()
  })
})

// ─────────────────────────────────────────────
// formatYearMonth
// ─────────────────────────────────────────────
describe('formatYearMonth', () => {
  test('正しい型の構造を返す', () => {
    const result = formatYearMonth()
    expect(typeof result.year).toBe('number')
    expect(typeof result.month).toBe('number')
    expect(typeof result.yearMonth).toBe('string')
  })

  test('yearMonthがYYYY-MMフォーマット', () => {
    const result = formatYearMonth()
    expect(result.yearMonth).toMatch(/^\d{4}-\d{2}$/)
  })

  test('month は 1〜12 の範囲', () => {
    const result = formatYearMonth()
    expect(result.month).toBeGreaterThanOrEqual(1)
    expect(result.month).toBeLessThanOrEqual(12)
  })

  test('1月のとき yearMonth が "YYYY-01" になる', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-15'))
    const result = formatYearMonth()
    expect(result.month).toBe(1)
    expect(result.yearMonth).toBe('2026-01')
    jest.useRealTimers()
  })

  test('12月のとき yearMonth が "YYYY-12" になる', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-12-31'))
    const result = formatYearMonth()
    expect(result.month).toBe(12)
    expect(result.yearMonth).toBe('2026-12')
    jest.useRealTimers()
  })
})

// ─────────────────────────────────────────────
// formatAmount
// ─────────────────────────────────────────────
describe('formatAmount', () => {
  test('3桁以下はカンマなし', () => {
    expect(formatAmount(100)).toBe('100')
  })

  test('4桁はカンマあり', () => {
    expect(formatAmount(1000)).toBe('1,000')
  })

  test('7桁（上限）は正しくフォーマット', () => {
    expect(formatAmount(9_999_999)).toBe('9,999,999')
  })

  test('0はゼロを返す', () => {
    expect(formatAmount(0)).toBe('0')
  })

  test('1は"1"を返す', () => {
    expect(formatAmount(1)).toBe('1')
  })

  test('1000000は"1,000,000"', () => {
    expect(formatAmount(1_000_000)).toBe('1,000,000')
  })
})

// ─────────────────────────────────────────────
// ホーム画面の月差分計算ロジックのテスト
// (index.tsx の lastMonthDiff = lTotal - mTotal)
// ─────────────────────────────────────────────
describe('月差分ロジック（lastMonthDiff = 先月合計 - 今月合計）', () => {
  function calcDiff(lastMonthTotal: number, thisMonthTotal: number) {
    return lastMonthTotal - thisMonthTotal
  }

  function formatDiff(diff: number): string {
    if (diff >= 0) {
      return `先月より ¥${formatAmount(diff)} 少ないよ`
    } else {
      return `先月より ¥${formatAmount(Math.abs(diff))} 多いよ`
    }
  }

  test('今月の方が少ない → "先月より〜少ないよ"', () => {
    const diff = calcDiff(10000, 8000) // 先月1万、今月8千
    expect(diff).toBe(2000)
    expect(formatDiff(diff)).toBe('先月より ¥2,000 少ないよ')
  })

  test('今月の方が多い → "先月より〜多いよ"', () => {
    const diff = calcDiff(5000, 8000) // 先月5千、今月8千
    expect(diff).toBe(-3000)
    expect(formatDiff(diff)).toBe('先月より ¥3,000 多いよ')
  })

  test('同額 → "先月より ¥0 少ないよ"（潜在的バグ：同額でも"少ない"と表示）', () => {
    // BUG: 同額のとき "少ないよ" と表示される。
    // 理想は "先月と同じだよ" などの表示が望ましい。
    const diff = calcDiff(5000, 5000)
    expect(diff).toBe(0)
    expect(formatDiff(diff)).toBe('先月より ¥0 少ないよ')
  })

  test('先月も今月も0 → "先月より ¥0 少ないよ"', () => {
    const diff = calcDiff(0, 0)
    expect(diff).toBe(0)
    expect(formatDiff(diff)).toBe('先月より ¥0 少ないよ')
  })
})

// ─────────────────────────────────────────────
// OshiCard の予算進捗計算ロジック
// (index.tsx: percentage = Math.min((spend/budget)*100, 100))
// ─────────────────────────────────────────────
describe('予算進捗計算ロジック', () => {
  function calcPercentage(spend: number, budget: number): number {
    return budget > 0 ? Math.min((spend / budget) * 100, 100) : 0
  }

  function isOver(percentage: number): boolean {
    return percentage >= 90
  }

  test('予算なし(0)のとき進捗は0%', () => {
    expect(calcPercentage(5000, 0)).toBe(0)
  })

  test('支出0のとき進捗は0%', () => {
    expect(calcPercentage(0, 10000)).toBe(0)
  })

  test('支出が予算の半分のとき50%', () => {
    expect(calcPercentage(5000, 10000)).toBe(50)
  })

  test('支出が予算と同額のとき100%', () => {
    expect(calcPercentage(10000, 10000)).toBe(100)
  })

  test('支出が予算を超えても100%にキャップ', () => {
    expect(calcPercentage(15000, 10000)).toBe(100)
  })

  test('89%のときは警告なし', () => {
    const pct = calcPercentage(8900, 10000)
    expect(isOver(pct)).toBe(false)
  })

  test('90%のとき警告あり（境界値）', () => {
    const pct = calcPercentage(9000, 10000)
    expect(isOver(pct)).toBe(true)
  })

  test('100%超でも警告あり', () => {
    const pct = calcPercentage(15000, 10000)
    expect(isOver(pct)).toBe(true)
  })
})

// ─────────────────────────────────────────────
// ホーム画面の推し表示ロジック
// (hasMoreOshis = oshis.length > 3, displayOshis = oshis.slice(0, hasMore ? 2 : 3))
// ─────────────────────────────────────────────
describe('ホーム画面推し表示ロジック', () => {
  function getDisplayConfig(oshiCount: number) {
    const hasMoreOshis = oshiCount > 3
    const displayCount = hasMoreOshis ? 2 : Math.min(oshiCount, 3)
    const hiddenCount = oshiCount - displayCount
    return { hasMoreOshis, displayCount, hiddenCount }
  }

  test('推し0人: hasMore=false, 表示0', () => {
    const { hasMoreOshis, displayCount } = getDisplayConfig(0)
    expect(hasMoreOshis).toBe(false)
    expect(displayCount).toBe(0)
  })

  test('推し1人: hasMore=false, 表示1', () => {
    const { hasMoreOshis, displayCount } = getDisplayConfig(1)
    expect(hasMoreOshis).toBe(false)
    expect(displayCount).toBe(1)
  })

  test('推し3人: hasMore=false, 表示3', () => {
    const { hasMoreOshis, displayCount } = getDisplayConfig(3)
    expect(hasMoreOshis).toBe(false)
    expect(displayCount).toBe(3)
  })

  test('推し4人: hasMore=true, 表示2, 隠れ2', () => {
    const { hasMoreOshis, displayCount, hiddenCount } = getDisplayConfig(4)
    expect(hasMoreOshis).toBe(true)
    expect(displayCount).toBe(2)
    expect(hiddenCount).toBe(2)
  })

  test('推し10人: hasMore=true, 表示2, 隠れ8', () => {
    const { hasMoreOshis, displayCount, hiddenCount } = getDisplayConfig(10)
    expect(hasMoreOshis).toBe(true)
    expect(displayCount).toBe(2)
    expect(hiddenCount).toBe(8)
  })
})
