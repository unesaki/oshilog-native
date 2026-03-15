import React, { useEffect, useState } from 'react'
import { View, Text, Switch, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { getOrCreateNotificationSettings } from '@/lib/notificationService'
import { Colors } from '@/constants/colors'
import { Fonts } from '@/constants/fonts'
import AppHeader, { HeaderIconButton } from '@/components/AppHeader'

export default function NotificationSettingsScreen() {
  const [budgetAlert, setBudgetAlert] = useState(true)
  const [announcement, setAnnouncement] = useState(true)
  const [loading, setLoading] = useState(true)
  const [settingsId, setSettingsId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const settings = await getOrCreateNotificationSettings(user.id)
      if (settings) {
        setSettingsId(settings.id)
        setBudgetAlert(settings.budget_alert)
        setAnnouncement(settings.announcement)
      }
      setLoading(false)
    }
    load()
  }, [])

  const updateSetting = async (field: 'budget_alert' | 'announcement', value: boolean) => {
    if (!settingsId) return
    await supabase
      .from('user_notification_settings')
      .update({ [field]: value })
      .eq('id', settingsId)
  }

  const handleBudgetAlert = (value: boolean) => {
    setBudgetAlert(value)
    updateSetting('budget_alert', value)
  }

  const handleAnnouncement = (value: boolean) => {
    setAnnouncement(value)
    updateSetting('announcement', value)
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={Colors.pinkVivid} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="通知設定"
        left={
          <HeaderIconButton onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={Colors.textDark} />
          </HeaderIconButton>
        }
      />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>通知の種類</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="wallet-outline" size={20} color="#F59E0B" />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>予算アラート</Text>
              <Text style={styles.rowDesc}>月次予算の残額が20%以下になったとき</Text>
            </View>
            <Switch
              value={budgetAlert}
              onValueChange={handleBudgetAlert}
              trackColor={{ false: Colors.pinkSoft, true: Colors.pinkVivid }}
              thumbColor={Colors.white}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="megaphone-outline" size={20} color={Colors.pinkVivid} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>公式お知らせ</Text>
              <Text style={styles.rowDesc}>アプリからのお知らせ・アップデート情報</Text>
            </View>
            <Switch
              value={announcement}
              onValueChange={handleAnnouncement}
              trackColor={{ false: Colors.pinkSoft, true: Colors.pinkVivid }}
              thumbColor={Colors.white}
            />
          </View>
        </View>

        <Text style={styles.note}>
          ※ デバイスの通知設定もONにしてください
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  section: { padding: 20 },
  sectionLabel: {
    fontSize: 12, color: Colors.textLight,
    fontFamily: Fonts.zenMaruBold, marginBottom: 8, marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.white, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  rowIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, fontFamily: Fonts.zenMaruBold, color: Colors.textDark },
  rowDesc: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.pinkSoft, marginHorizontal: 16 },
  note: { fontSize: 11, color: Colors.textLight, marginTop: 12, marginLeft: 4, lineHeight: 16 },
})
