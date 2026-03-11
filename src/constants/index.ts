export const EXPENSE_CATEGORIES = [
  { value: 'goods', label: 'グッズ' },
  { value: 'ticket', label: 'チケット' },
  { value: 'streaming', label: '配信' },
  { value: 'photobook', label: '写真集' },
  { value: 'other', label: 'その他' },
] as const

export const PLAN_LIMITS = {
  free: { oshiCount: 3 },
  premium: { oshiCount: Infinity },
} as const

export const SUBSCRIPTION_PRICE_JPY = 480
