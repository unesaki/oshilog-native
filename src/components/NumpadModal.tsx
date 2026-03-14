import React from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native'
import { Colors, NUMPAD } from '@/constants/colors'
import { Fonts } from '@/constants/fonts'

type Props = {
  visible: boolean
  amount: number
  errorMessage?: string | null
  onKey: (key: string) => void
  onClose: () => void
}

export default function NumpadModal({ visible, amount, errorMessage, onKey, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.display}>
            <Text style={styles.label}>金額を入力</Text>
            <Text style={styles.amount}>¥{amount.toLocaleString('ja-JP')}</Text>
            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          </View>
          <View style={styles.grid}>
            {NUMPAD.map((key) => {
              const isOk = key === 'ok'
              const isDel = key === 'del'
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.key,
                    isOk && styles.keyOk,
                    isDel && styles.keyDel,
                  ]}
                  onPress={() => onKey(key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.keyText, isOk && styles.keyTextOk, isDel && styles.keyTextDel]}>
                    {isOk ? '✓' : isDel ? '⌫' : key}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  display: {
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontFamily: Fonts.zenMaruRegular,
    color: Colors.textLight,
    marginBottom: 4,
  },
  amount: {
    fontSize: 40,
    fontFamily: Fonts.zenMaruBold,
    color: Colors.textDark,
    letterSpacing: -1,
  },
  error: {
    fontSize: 11,
    fontFamily: Fonts.zenMaruRegular,
    color: Colors.error,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  key: {
    width: '31%',
    height: 58,
    borderRadius: 14,
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyOk: {
    backgroundColor: Colors.pinkVivid,
    shadowColor: Colors.pinkVivid,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 7,
    elevation: 5,
  },
  keyDel: {
    backgroundColor: Colors.pinkSoft,
  },
  keyText: {
    fontSize: 22,
    fontFamily: Fonts.zenMaruBold,
    color: Colors.textDark,
  },
  keyTextOk: {
    fontSize: 20,
    color: Colors.white,
  },
  keyTextDel: {
    fontSize: 18,
    color: Colors.pinkVivid,
  },
})
