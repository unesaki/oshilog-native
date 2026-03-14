import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '@/constants/colors'

type Props = {
  left?: React.ReactNode
  right?: React.ReactNode
  title?: string
}

export default function AppHeader({ left, right, title }: Props) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.inner}>
        <View style={styles.side}>{left}</View>
        <Text style={styles.logo}>{title ?? 'oshilog'}</Text>
        <View style={styles.side}>{right}</View>
      </View>
    </View>
  )
}

export function HeaderIconButton({
  onPress,
  children,
}: {
  onPress: () => void
  children: React.ReactNode
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.iconBtn} activeOpacity={0.7}>
      {children}
    </TouchableOpacity>
  )
}

export function HeaderTextButton({
  onPress,
  label,
  variant = 'ghost',
}: {
  onPress: () => void
  label: string
  variant?: 'ghost' | 'primary' | 'cancel'
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.textBtn, variant === 'primary' && styles.textBtnPrimary]}
      activeOpacity={0.7}
    >
      <Text style={[styles.textBtnLabel, variant === 'primary' && styles.textBtnLabelPrimary]}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    flexShrink: 0,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
    minHeight: 50,
  },
  logo: {
    fontStyle: 'italic',
    fontSize: 20,
    color: Colors.pinkVivid,
    letterSpacing: -0.2,
    fontWeight: '700',
  },
  side: {
    minWidth: 88,
    alignItems: 'flex-start',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.pinkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBtn: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 99,
    backgroundColor: Colors.pinkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBtnPrimary: {
    backgroundColor: Colors.pinkVivid,
    shadowColor: Colors.pinkVivid,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  textBtnLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMid,
  },
  textBtnLabelPrimary: {
    color: Colors.white,
  },
})
