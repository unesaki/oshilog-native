/**
 * 結合テスト: 数値入力パッド (NumpadModal) のロジック
 *
 * 対象: add.tsx / oshi/[id].tsx の handleNumpad 関数ロジック
 * テスト種別: 結合テスト（UIなし、ロジック検証）
 */
import { validateAmount } from '../../src/lib/validate'

// ─────────────────────────────────────────────
// Numpad の入力処理ロジックを純粋関数として抽出してテスト
// ─────────────────────────────────────────────
function applyNumpadKey(currentStr: string, key: string): { amountStr: string; closeNumpad: boolean; error: string | null } {
  if (key === 'del') {
    const amountStr = currentStr.length <= 1 ? '0' : currentStr.slice(0, -1)
    return { amountStr, closeNumpad: false, error: null }
  } else if (key === 'ok') {
    const amount = parseInt(currentStr) || 0
    const error = validateAmount(amount)
    return { amountStr: currentStr, closeNumpad: !error, error }
  } else {
    const next = currentStr === '0' ? key : currentStr + key
    const amountStr = parseInt(next) > 9_999_999 ? currentStr : next
    return { amountStr, closeNumpad: false, error: null }
  }
}

describe('Numpad 入力ロジック', () => {
  describe('数字キー入力', () => {
    test('初期状態(0)に "1" を入力すると "1" になる', () => {
      const { amountStr } = applyNumpadKey('0', '1')
      expect(amountStr).toBe('1')
    })

    test('"0" に "0" を入力しても "0" のまま', () => {
      const { amountStr } = applyNumpadKey('0', '0')
      expect(amountStr).toBe('0')
    })

    test('"1" に "2" を入力すると "12" になる', () => {
      const { amountStr } = applyNumpadKey('1', '2')
      expect(amountStr).toBe('12')
    })

    test('"123" に "0" を入力すると "1230" になる', () => {
      const { amountStr } = applyNumpadKey('123', '0')
      expect(amountStr).toBe('1230')
    })

    test('上限 9999999 に "1" を入力しても変わらない', () => {
      const { amountStr } = applyNumpadKey('9999999', '1')
      expect(amountStr).toBe('9999999')
    })

    test('9999999 未満なら追加できる', () => {
      const { amountStr } = applyNumpadKey('999999', '9')
      expect(amountStr).toBe('9999999')
    })

    test('上限超えになる入力は弾く', () => {
      // "9999999" + "9" → "99999999" → parseInt = 99,999,999 > 9,999,999 → 弾く
      const { amountStr } = applyNumpadKey('9999999', '9')
      expect(amountStr).toBe('9999999')
    })
  })

  describe('del キー', () => {
    test('"123" の del → "12"', () => {
      const { amountStr } = applyNumpadKey('123', 'del')
      expect(amountStr).toBe('12')
    })

    test('"1" の del → "0"（1文字のとき0に戻る）', () => {
      const { amountStr } = applyNumpadKey('1', 'del')
      expect(amountStr).toBe('0')
    })

    test('"0" の del → "0"（0はそのまま）', () => {
      const { amountStr } = applyNumpadKey('0', 'del')
      expect(amountStr).toBe('0')
    })

    test('"10" の del → "1"', () => {
      const { amountStr } = applyNumpadKey('10', 'del')
      expect(amountStr).toBe('1')
    })
  })

  describe('ok キー', () => {
    test('有効な金額でOK → numpad閉じる', () => {
      const { closeNumpad, error } = applyNumpadKey('1000', 'ok')
      expect(closeNumpad).toBe(true)
      expect(error).toBeNull()
    })

    test('金額 0 でOK → エラー・numpad閉じない', () => {
      const { closeNumpad, error } = applyNumpadKey('0', 'ok')
      expect(closeNumpad).toBe(false)
      expect(error).toBe('金額を入力してね')
    })

    test('金額 9999999 でOK → numpad閉じる', () => {
      const { closeNumpad, error } = applyNumpadKey('9999999', 'ok')
      expect(closeNumpad).toBe(true)
      expect(error).toBeNull()
    })

    test('金額 1 でOK → numpad閉じる', () => {
      const { closeNumpad, error } = applyNumpadKey('1', 'ok')
      expect(closeNumpad).toBe(true)
      expect(error).toBeNull()
    })
  })

  describe('連続入力シナリオ', () => {
    test('0→1→2→3→0→0 → "12300"', () => {
      let str = '0'
      for (const key of ['1', '2', '3', '0', '0']) {
        str = applyNumpadKey(str, key).amountStr
      }
      expect(str).toBe('12300')
    })

    test('入力 → del → del → 0になる', () => {
      let str = '0'
      str = applyNumpadKey(str, '5').amountStr   // "5"
      str = applyNumpadKey(str, 'del').amountStr // "0"
      str = applyNumpadKey(str, 'del').amountStr // "0" (変わらず)
      expect(str).toBe('0')
      expect(parseInt(str)).toBe(0)
    })

    test('上限まで入力してから1桁削除できる', () => {
      let str = '9999999'
      str = applyNumpadKey(str, 'del').amountStr
      expect(str).toBe('999999')
    })
  })
})
