import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, usePathname } from 'expo-router'
import { Colors } from '@/constants/colors'

export default function BottomTabBar() {
  const insets = useSafeAreaInsets()
  const pathname = usePathname()

  const isHome = pathname === '/' || pathname === '/index'
  const isOshi = pathname.startsWith('/oshi')

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || 10 }]}>
      <TouchableOpacity
        style={styles.tab}
        onPress={() => router.push('/')}
        activeOpacity={0.7}
      >
        <Text style={styles.tabIcon}>🏠</Text>
        <Text style={[styles.tabLabel, isHome && styles.tabLabelActive]}>ホーム</Text>
      </TouchableOpacity>

      <View style={styles.centerTab}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/add')}
          activeOpacity={0.8}
        >
          <Text style={styles.addIcon}>＋</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.tab}
        onPress={() => router.push('/oshi')}
        activeOpacity={0.7}
      >
        <Text style={styles.tabIcon}>💝</Text>
        <Text style={[styles.tabLabel, isOshi && styles.tabLabelActive]}>推し</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 8,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.pinkSoft,
    shadowColor: Colors.pinkVivid,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 10,
    flexShrink: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  tabIcon: {
    fontSize: 20,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textLight,
  },
  tabLabelActive: {
    color: Colors.pinkVivid,
  },
  centerTab: {
    flex: 1,
    alignItems: 'center',
  },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.pinkVivid,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    borderWidth: 3,
    borderColor: Colors.cream,
    shadowColor: Colors.pinkVivid,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.45,
    shadowRadius: 9,
    elevation: 8,
  },
  addIcon: {
    fontSize: 24,
    color: Colors.white,
    fontWeight: '700',
  },
})
