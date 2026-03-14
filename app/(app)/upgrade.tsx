/**
 * TODO: 課金実装
 *
 * App Store / Google Play の課金（In-App Purchase）を実装する必要があります。
 * 推奨ライブラリ: expo-in-app-purchases または react-native-purchases (RevenueCat)
 *
 * 手順:
 * 1. App Store Connect / Google Play Console でサブスクリプション商品を登録
 * 2. expo-in-app-purchases または RevenueCat SDK を導入
 * 3. 購入処理とSupabaseのsubscriptionsテーブル更新を実装
 * 4. Webhookでサブスクリプション状態を同期
 *
 * WebサービスではStripeを使用しているが、ネイティブアプリでは
 * App Storeのガイドラインに従いIn-App Purchaseを使用すること。
 */

import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native'
import { router } from 'expo-router'
import { Colors } from '@/constants/colors'
import AppHeader, { HeaderTextButton } from '@/components/AppHeader'

const FEATURES = [
  { icon: '💝', label: '推しを無制限に登録', desc: '何人でも推しを管理できる' },
  { icon: '📊', label: 'すべての統計機能', desc: 'より詳しい分析データを表示' },
  { icon: '🌸', label: '広告なし', desc: '快適に使い続けられる' },
]

export default function UpgradeScreen() {
  function handlePurchase() {
    // TODO: In-App Purchase処理を実装
    Alert.alert('準備中', 'プレミアムプランは近日公開予定です。')
  }

  return (
    <View style={styles.container}>
      <AppHeader left={<HeaderTextButton onPress={() => router.back()} label="✕ 閉じる" />} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ヒーロー */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>💎</Text>
          <Text style={styles.heroTitle}>プレミアムプラン</Text>
          <Text style={styles.heroSubtitle}>推し活をもっと楽しく、もっと自由に。</Text>
        </View>

        {/* プラン比較 */}
        <View style={styles.planRow}>
          <View style={styles.planFree}>
            <Text style={styles.planLabel}>無料プラン</Text>
            <Text style={styles.planPrice}>¥0</Text>
            <Text style={styles.planPeriod}>/ 月</Text>
            <View style={styles.planFeatures}>
              <Text style={styles.planFeatureItem}>✓ 推し 3人まで</Text>
              <Text style={styles.planFeatureItem}>✓ 支出記録</Text>
              <Text style={styles.planFeatureItem}>✓ 予算管理</Text>
            </View>
          </View>
          <View style={styles.planPremium}>
            <Text style={styles.planLabelPremium}>プレミアム</Text>
            <Text style={styles.planPricePremium}>¥480</Text>
            <Text style={styles.planPeriodPremium}>/ 月</Text>
            <View style={styles.planFeatures}>
              <Text style={styles.planFeatureItemPremium}>✓ 推し 無制限</Text>
              <Text style={styles.planFeatureItemPremium}>✓ 支出記録</Text>
              <Text style={styles.planFeatureItemPremium}>✓ 予算管理</Text>
              <Text style={styles.planFeatureItemPremium}>✓ 広告なし</Text>
            </View>
          </View>
        </View>

        {/* 機能リスト */}
        <View style={styles.featureList}>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.featureItem}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureLabel}>{f.label}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 購入ボタン */}
        <TouchableOpacity style={styles.purchaseBtn} onPress={handlePurchase} activeOpacity={0.85}>
          <Text style={styles.purchaseBtnText}>プレミアムプランを始める</Text>
          <Text style={styles.purchaseBtnSub}>月額 ¥480 · いつでも解約可能</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          購入はApp Store / Google Playを通じて行われます。{'\n'}
          サブスクリプションは次の請求日の24時間前までにキャンセルしない限り自動更新されます。
        </Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  // ヒーロー
  hero: { alignItems: 'center', paddingVertical: 24 },
  heroEmoji: { fontSize: 56, marginBottom: 12 },
  heroTitle: { fontSize: 24, fontWeight: '700', color: Colors.textDark, marginBottom: 8 },
  heroSubtitle: { fontSize: 14, color: Colors.textMid, textAlign: 'center' },
  // プラン比較
  planRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  planFree: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: Colors.pinkSoft,
    shadowColor: Colors.pinkVivid, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  planPremium: {
    flex: 1, backgroundColor: Colors.pinkVivid, borderRadius: 16, padding: 16,
    shadowColor: Colors.pinkVivid, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  planLabel: { fontSize: 11, color: Colors.textLight, marginBottom: 4, fontWeight: '600' },
  planLabelPremium: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 4, fontWeight: '600' },
  planPrice: { fontSize: 28, fontWeight: '700', color: Colors.textDark },
  planPricePremium: { fontSize: 28, fontWeight: '700', color: Colors.white },
  planPeriod: { fontSize: 11, color: Colors.textLight, marginBottom: 12 },
  planPeriodPremium: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 12 },
  planFeatures: { gap: 6 },
  planFeatureItem: { fontSize: 12, color: Colors.textMid, fontWeight: '500' },
  planFeatureItemPremium: { fontSize: 12, color: Colors.white, fontWeight: '500' },
  // 機能リスト
  featureList: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 24, gap: 16, shadowColor: Colors.pinkVivid, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  featureItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  featureIcon: { fontSize: 24, width: 32, textAlign: 'center' },
  featureText: { flex: 1 },
  featureLabel: { fontSize: 14, fontWeight: '700', color: Colors.textDark, marginBottom: 2 },
  featureDesc: { fontSize: 12, color: Colors.textLight },
  // 購入ボタン
  purchaseBtn: {
    backgroundColor: Colors.pinkVivid, borderRadius: 16, padding: 18,
    alignItems: 'center', marginBottom: 16,
    shadowColor: Colors.pinkVivid, shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  purchaseBtnText: { color: Colors.white, fontSize: 17, fontWeight: '700', marginBottom: 4 },
  purchaseBtnSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  disclaimer: { fontSize: 10, color: Colors.textLight, textAlign: 'center', lineHeight: 16 },
})
