export const Colors = {
  pinkVivid: '#FF3D87',
  pinkMid: '#FF8FB8',
  pinkSoft: '#FFE4EF',
  pinkLight: '#FFB6D0',
  cream: '#FFF8F9',

  textDark: '#2D1B25',
  textMid: '#8A5070',
  textLight: '#C49AB0',

  error: '#ef4444',
  white: '#FFFFFF',
  black: '#000000',
} as const

export const OSHI_EMOJIS = ['🐰', '⭐', '🌿', '🌸', '💎', '🎀', '🦋', '🌙', '🔥', '💫', '🎭', '🎪']

export const OSHI_COLORS = [
  '#FF3D87', '#FF8FB8', '#FFB6D0', '#FF6B6B',
  '#FFA500', '#FFD700', '#98FB98', '#4CC47A',
  '#87CEEB', '#5BB8FF', '#DDA0DD', '#9B59B6',
]

export const CATEGORIES = [
  { value: 'goods' as const, label: 'グッズ', emoji: '🧸' },
  { value: 'ticket' as const, label: 'チケット', emoji: '🎫' },
  { value: 'streaming' as const, label: '配信', emoji: '📺' },
  { value: 'photobook' as const, label: '写真集', emoji: '📸' },
  { value: 'other' as const, label: 'その他', emoji: '✨' },
]

export const NUMPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok']

export const WEEK_DAYS = ['日', '月', '火', '水', '木', '金', '土']
