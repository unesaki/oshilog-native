import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text } from 'react-native'
import { Colors } from '@/constants/colors'
import { Fonts } from '@/constants/fonts'

type Props = {
  message: string
  isError?: boolean
  visible: boolean
}

export default function Toast({ message, isError = false, visible }: Props) {
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start()
    }
  }, [visible, message])

  if (!visible) return null

  return (
    <Animated.View style={[styles.container, { opacity, backgroundColor: isError ? '#ff4d4d' : Colors.pinkVivid }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 72,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 10,
  },
  text: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: Fonts.zenMaruBold,
  },
})
