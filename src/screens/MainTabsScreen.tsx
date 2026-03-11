import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { colors } from '../constants/colors'
import { fonts } from '../constants/fonts'
import HomeScreen from './HomeScreen'
import OshiListScreen from './OshiListScreen'
import { RootStackParamList } from '../navigation/RootNavigator'

type Tab = 'home' | 'oshi'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>
}

export default function MainTabsScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('home')

  return (
    <View style={styles.container}>
      {/* Screen Content */}
      <View style={styles.content}>
        {activeTab === 'home' ? (
          <HomeScreen
            navigation={navigation}
            onTabChange={setActiveTab}
          />
        ) : (
          <OshiListScreen
            navigation={navigation}
            onBack={() => setActiveTab('home')}
          />
        )}
      </View>

      {/* Bottom Tab Bar */}
      <SafeAreaView edges={['bottom']} style={styles.tabBarContainer}>
        <View style={styles.tabBar}>
          {/* Home Tab */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('home')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabIcon,
              activeTab === 'home' && styles.tabIconActive,
            ]}>
              🏠
            </Text>
            <Text style={[
              styles.tabLabel,
              activeTab === 'home' && styles.tabLabelActive,
            ]}>
              ホーム
            </Text>
          </TouchableOpacity>

          {/* FAB Center */}
          <View style={styles.fabContainer}>
            <TouchableOpacity
              style={styles.fab}
              onPress={() => navigation.navigate('AddExpense')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.fabGradient}
              >
                <Text style={styles.fabIcon}>＋</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Oshi Tab */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('oshi')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabIcon,
              activeTab === 'oshi' && styles.tabIconActive,
            ]}>
              💝
            </Text>
            <Text style={[
              styles.tabLabel,
              activeTab === 'oshi' && styles.tabLabelActive,
            ]}>
              推し
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    flex: 1,
  },
  tabBarContainer: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.pinkSoft,
    shadowColor: colors.pinkVivid,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 8,
    height: 60,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabIcon: {
    fontSize: 24,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 11,
    color: colors.textLight,
    fontFamily: fonts.bodyMedium,
  },
  tabLabelActive: {
    color: colors.pinkVivid,
    fontFamily: fonts.bodyBold,
  },
  fabContainer: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: colors.pinkVivid,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    fontSize: 28,
    color: colors.white,
    fontFamily: fonts.body,
    lineHeight: 32,
  },
})
