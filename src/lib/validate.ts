/** 制御文字（改行・タブ以外の不可視文字）を除去してトリム */
export function sanitizeText(value: string): string {
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim()
}

export function validateOshiName(value: string): string | null {
  const v = value.trim()
  if (!v) return '推しの名前を入力してね'
  if (v.length > 30) return '30文字以内で入力してね'
  return null
}

export function validateBudget(value: string): string | null {
  if (!value) return null
  if (!/^\d+$/.test(value)) return '半角数字で入力してね'
  const n = parseInt(value, 10)
  if (n < 1) return '1円以上で入力してね'
  if (n > 9_999_999) return '上限は ¥9,999,999 だよ'
  return null
}

export function validateAmount(amount: number): string | null {
  if (amount < 1) return '金額を入力してね'
  if (amount > 9_999_999) return '上限は ¥9,999,999 だよ'
  return null
}

export function validateExpenseTitle(value: string): string | null {
  const v = value.trim()
  if (!v) return 'タイトルを入力してね'
  if (v.length > 50) return '50文字以内で入力してね'
  return null
}

export function validateMemo(value: string): string | null {
  if (value.length > 200) return '200文字以内で入力してね'
  return null
}

export function validateDate(value: string): string | null {
  if (!value) return '日付を選んでね'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '正しい日付を入力してね'
  const twoYearsAgo = new Date()
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
  const oneMonthLater = new Date()
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1)
  if (d < twoYearsAgo) return '2年以上前の日付は入力できないよ'
  if (d > oneMonthLater) return '1ヶ月以上先の日付は入力できないよ'
  return null
}
