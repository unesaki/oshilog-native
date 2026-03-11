export type Oshi = {
  id: string
  user_id: string
  name: string
  color: string
  icon_emoji: string
  icon_url: string | null
  sort_order: number
  created_at: string
}

export type Expense = {
  id: string
  user_id: string
  oshi_id: string
  amount: number
  category: 'goods' | 'ticket' | 'streaming' | 'photobook' | 'other'
  title: string
  memo: string | null
  spent_at: string
  created_at: string
}

export type Budget = {
  id: string
  user_id: string
  oshi_id: string
  amount: number
  year_month: string
  created_at: string
}

export type Subscription = {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_sub_id: string | null
  status: string
  plan: 'free' | 'premium'
  current_period_end: string | null
  created_at: string
}
