// テスト全体のセットアップ

// React Nativeコンポーネントのモック
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper')

// Expo モジュールのモック
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({})),
  useFocusEffect: jest.fn((cb) => cb()),
}))

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}))

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 })),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker')

// Supabase クライアントのモック
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
    })),
  },
}))

// @expo/vector-icons のモック
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}))
jest.mock('@expo/vector-icons/FontAwesome5', () => 'FontAwesome5')
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons')

// Fonts のモック
jest.mock('@/constants/fonts', () => ({
  Fonts: {
    playfairBoldItalic: 'PlayfairDisplay_700Bold_Italic',
    zenMaruRegular: 'ZenMaruGothic_400Regular',
    zenMaruBold: 'ZenMaruGothic_700Bold',
  },
}))
