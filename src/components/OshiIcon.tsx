import React from 'react'
import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import FontAwesome5 from '@expo/vector-icons/FontAwesome5'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'

type Props = { emoji: string; size: number; color: string }

function renderIcon(emoji: string, size: number, color: string) {
  switch (emoji) {
    case '🐰': return <Ionicons name="paw" size={size} color={color} />
    case '⭐': return <Ionicons name="star" size={size} color={color} />
    case '🌿': return <Ionicons name="leaf" size={size} color={color} />
    case '🌸': return <Ionicons name="heart" size={size} color={color} />
    case '💎': return <FontAwesome5 name="gem" size={size} color={color} />
    case '🎀': return <Ionicons name="ribbon" size={size} color={color} />
    case '🦋': return <MaterialCommunityIcons name="butterfly-outline" size={size} color={color} />
    case '🌙': return <Ionicons name="moon" size={size} color={color} />
    case '🔥': return <Ionicons name="flame" size={size} color={color} />
    case '💫': return <Ionicons name="sparkles" size={size} color={color} />
    case '🎭': return <Ionicons name="musical-notes" size={size} color={color} />
    case '🎪': return <Ionicons name="star-outline" size={size} color={color} />
    default:   return <Ionicons name="heart" size={size} color={color} />
  }
}

export default function OshiIcon({ emoji, size, color }: Props) {
  // Vector icon fonts render glyphs at their baseline, which sits slightly below
  // the mathematical center of the em square. translateY shifts the glyph up to
  // visually center it within the container.
  const offset = -(size * 0.08)
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ transform: [{ translateY: offset }] }}>
        {renderIcon(emoji, size, color)}
      </View>
    </View>
  )
}
