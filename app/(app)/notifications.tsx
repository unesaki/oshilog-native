import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/colors'
import { Fonts } from '@/constants/fonts'
import AppHeader, { HeaderTextButton, HeaderIconButton } from '@/components/AppHeader'
import type { AppNotification } from '@/types'

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [detail, setDetail] = useState<AppNotification | null>(null)

  const fetchNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order('created_at', { ascending: false })

    if (data) setNotifications(data as AppNotification[])
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchNotifications()
    setRefreshing(false)
  }

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )
  }

  const openDetail = async (item: AppNotification) => {
    setDetail(item)
    if (!item.is_read) await markAsRead(item.id)
  }

  const deleteOne = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    setDetail(null)
  }

  const deleteSelected = async () => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    Alert.alert('削除確認', `${ids.length}件の通知を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive', onPress: async () => {
          await supabase.from('notifications').delete().in('id', ids)
          setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)))
          setSelected(new Set())
          setSelectMode(false)
        },
      },
    ])
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  const typeIcon = (type: AppNotification['type']) =>
    type === 'budget_alert' ? 'wallet-outline' : 'megaphone-outline'

  const typeColor = (type: AppNotification['type']) =>
    type === 'budget_alert' ? '#F59E0B' : Colors.pinkVivid

  return (
    <View style={styles.container}>
      <AppHeader
        title="通知"
        left={
          <HeaderIconButton onPress={() => { setSelectMode(false); setSelected(new Set()); router.back() }}>
            <Ionicons name="chevron-back" size={22} color={Colors.textDark} />
          </HeaderIconButton>
        }
        right={
          selectMode ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <HeaderTextButton
                label={`削除(${selected.size})`}
                onPress={deleteSelected}
                variant="cancel"
              />
              <HeaderTextButton
                label="キャンセル"
                onPress={() => { setSelectMode(false); setSelected(new Set()) }}
              />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {notifications.length > 0 && (
                <HeaderTextButton label="選択" onPress={() => setSelectMode(true)} />
              )}
              <HeaderIconButton onPress={() => router.push('/(app)/notification-settings')}>
                <Ionicons name="settings-outline" size={18} color={Colors.textDark} />
              </HeaderIconButton>
            </View>
          )
        }
      />

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.pinkVivid} />
        }
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color={Colors.pinkLight} />
            <Text style={styles.emptyText}>通知はありません</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, !item.is_read && styles.itemUnread]}
            onPress={() => selectMode ? toggleSelect(item.id) : openDetail(item)}
            activeOpacity={0.7}
          >
            {selectMode && (
              <View style={[styles.checkbox, selected.has(item.id) && styles.checkboxSelected]}>
                {selected.has(item.id) && <Ionicons name="checkmark" size={14} color={Colors.white} />}
              </View>
            )}
            <View style={[styles.typeIcon, { backgroundColor: typeColor(item.type) + '20' }]}>
              <Ionicons name={typeIcon(item.type)} size={18} color={typeColor(item.type)} />
            </View>
            <View style={styles.itemText}>
              <Text style={[styles.itemTitle, !item.is_read && styles.itemTitleUnread]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.itemDate}>{formatDate(item.created_at)}</Text>
            </View>
            {!item.is_read && <View style={styles.unreadDot} />}
            {!selectMode && <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />}
          </TouchableOpacity>
        )}
      />

      {/* 詳細モーダル */}
      <Modal visible={!!detail} transparent animationType="slide" onRequestClose={() => setDetail(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={[styles.typeIcon, { backgroundColor: typeColor(detail?.type ?? 'announcement') + '20' }]}>
                <Ionicons name={typeIcon(detail?.type ?? 'announcement')} size={20} color={typeColor(detail?.type ?? 'announcement')} />
              </View>
              <Text style={styles.modalTitle}>{detail?.title}</Text>
            </View>
            <Text style={styles.modalDate}>{detail ? formatDate(detail.created_at) : ''}</Text>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalBodyText}>{detail?.body}</Text>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => detail && Alert.alert('削除確認', 'この通知を削除しますか？', [
                  { text: 'キャンセル', style: 'cancel' },
                  { text: '削除', style: 'destructive', onPress: () => deleteOne(detail.id) },
                ])}
              >
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                <Text style={styles.deleteBtnText}>削除</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setDetail(null)}>
                <Text style={styles.closeBtnText}>閉じる</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  listContent: { paddingVertical: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', gap: 12 },
  emptyText: { color: Colors.textLight, fontFamily: Fonts.zenMaruRegular, fontSize: 14 },
  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, marginHorizontal: 16, marginVertical: 4,
    borderRadius: 12, padding: 14, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  itemUnread: { borderLeftWidth: 3, borderLeftColor: Colors.pinkVivid },
  typeIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1 },
  itemTitle: { fontSize: 14, color: Colors.textMid, fontFamily: Fonts.zenMaruRegular },
  itemTitleUnread: { color: Colors.textDark, fontFamily: Fonts.zenMaruBold },
  itemDate: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.pinkVivid },
  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.pinkSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: Colors.pinkVivid, borderColor: Colors.pinkVivid },
  // 詳細モーダル
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, maxHeight: '75%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  modalTitle: { flex: 1, fontSize: 16, fontFamily: Fonts.zenMaruBold, color: Colors.textDark },
  modalDate: { fontSize: 11, color: Colors.textLight, marginBottom: 16, marginLeft: 48 },
  modalBody: { marginBottom: 24 },
  modalBodyText: { fontSize: 14, color: Colors.textMid, fontFamily: Fonts.zenMaruRegular, lineHeight: 22 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  deleteBtnText: { color: '#EF4444', fontSize: 14, fontFamily: Fonts.zenMaruRegular },
  closeBtn: {
    backgroundColor: Colors.pinkVivid, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  closeBtnText: { color: Colors.white, fontSize: 14, fontFamily: Fonts.zenMaruBold },
})
