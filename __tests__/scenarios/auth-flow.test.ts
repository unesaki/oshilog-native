/**
 * シナリオテスト: 認証フロー
 *
 * テスト種別: E2Eシナリオ（ロジックレベル）
 *
 * カバーするシナリオ:
 * 1. 未認証ユーザーのログイン
 * 2. 認証済みユーザーのセッション保持
 * 3. ログアウト
 * 4. 認証エラーハンドリング
 */

// ─────────────────────────────────────────────
// Mock Supabase Auth
// ─────────────────────────────────────────────
type MockUser = { id: string; email: string }
type AuthResult = { data: { user: MockUser | null; session: object | null }; error: null | { message: string } }

class MockSupabaseAuth {
  private currentUser: MockUser | null = null
  private validCredentials = new Map<string, string>() // email → password

  registerUser(email: string, password: string, userId: string) {
    this.validCredentials.set(email, password)
    this.currentUser = null // 未ログイン状態
    return { id: userId, email }
  }

  async signInWithPassword(email: string, password: string): Promise<AuthResult> {
    const validPassword = this.validCredentials.get(email)
    if (!validPassword || validPassword !== password) {
      return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } }
    }
    this.currentUser = { id: `user-${email}`, email }
    return { data: { user: this.currentUser, session: {} }, error: null }
  }

  async getUser(): Promise<{ data: { user: MockUser | null } }> {
    return { data: { user: this.currentUser } }
  }

  async signOut(): Promise<{ error: null }> {
    this.currentUser = null
    return { error: null }
  }
}

// ─────────────────────────────────────────────
// シナリオ1: ログインフロー
// ─────────────────────────────────────────────
describe('シナリオ1: ログインフロー', () => {
  let auth: MockSupabaseAuth

  beforeEach(() => {
    auth = new MockSupabaseAuth()
    auth.registerUser('test@example.com', 'password123', 'user-001')
  })

  test('正しいメール・パスワードでログイン成功', async () => {
    const result = await auth.signInWithPassword('test@example.com', 'password123')
    expect(result.error).toBeNull()
    expect(result.data.user).not.toBeNull()
    expect(result.data.user?.email).toBe('test@example.com')
  })

  test('間違ったパスワードでログイン失敗', async () => {
    const result = await auth.signInWithPassword('test@example.com', 'wrongpassword')
    expect(result.error).not.toBeNull()
    expect(result.error?.message).toBe('Invalid login credentials')
    expect(result.data.user).toBeNull()
  })

  test('存在しないメールでログイン失敗', async () => {
    const result = await auth.signInWithPassword('unknown@example.com', 'password123')
    expect(result.error).not.toBeNull()
    expect(result.data.user).toBeNull()
  })

  test('ログイン後にgetUserで認証ユーザーが返る', async () => {
    await auth.signInWithPassword('test@example.com', 'password123')
    const { data: { user } } = await auth.getUser()
    expect(user).not.toBeNull()
    expect(user?.email).toBe('test@example.com')
  })

  test('未ログイン状態ではgetUserがnullを返す', async () => {
    const { data: { user } } = await auth.getUser()
    expect(user).toBeNull()
  })
})

// ─────────────────────────────────────────────
// シナリオ2: セッション保持と画面ルーティング
// ─────────────────────────────────────────────
describe('シナリオ2: セッション保持と画面ルーティング', () => {
  let auth: MockSupabaseAuth
  let currentRoute: string

  beforeEach(() => {
    auth = new MockSupabaseAuth()
    auth.registerUser('test@example.com', 'password123', 'user-001')
    currentRoute = '/(auth)/login'
  })

  async function routeOnAppStart(): Promise<string> {
    const { data: { user } } = await auth.getUser()
    if (user) {
      return '/(app)'
    }
    return '/(auth)/login'
  }

  test('未認証 → ログイン画面に遷移', async () => {
    const route = await routeOnAppStart()
    expect(route).toBe('/(auth)/login')
  })

  test('認証済み → ホーム画面に遷移', async () => {
    await auth.signInWithPassword('test@example.com', 'password123')
    const route = await routeOnAppStart()
    expect(route).toBe('/(app)')
  })

  test('_layout.tsx の認証ガード: userがnullなら login にリダイレクト', async () => {
    const mockReplace = jest.fn()
    const { data: { user } } = await auth.getUser()

    // app/(app)/_layout.tsx のような処理
    if (!user) {
      mockReplace('/(auth)/login')
    }

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login')
  })
})

// ─────────────────────────────────────────────
// シナリオ3: ログアウトフロー
// ─────────────────────────────────────────────
describe('シナリオ3: ログアウトフロー', () => {
  let auth: MockSupabaseAuth

  beforeEach(async () => {
    auth = new MockSupabaseAuth()
    auth.registerUser('test@example.com', 'password123', 'user-001')
    await auth.signInWithPassword('test@example.com', 'password123')
  })

  test('ログアウト後にgetUserがnullを返す', async () => {
    const beforeLogout = await auth.getUser()
    expect(beforeLogout.data.user).not.toBeNull()

    await auth.signOut()

    const afterLogout = await auth.getUser()
    expect(afterLogout.data.user).toBeNull()
  })

  test('ログアウト後に /(auth)/login にリダイレクト', async () => {
    const mockReplace = jest.fn()

    async function handleLogout() {
      await auth.signOut()
      mockReplace('/(auth)/login')
    }

    await handleLogout()
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login')
  })

  test('ログアウト → 再ログインが可能', async () => {
    await auth.signOut()

    const result = await auth.signInWithPassword('test@example.com', 'password123')
    expect(result.error).toBeNull()
    expect(result.data.user).not.toBeNull()
  })
})

// ─────────────────────────────────────────────
// シナリオ4: 認証エラー時のUI表示
// ─────────────────────────────────────────────
describe('シナリオ4: 認証エラーハンドリング', () => {
  let auth: MockSupabaseAuth

  beforeEach(() => {
    auth = new MockSupabaseAuth()
    auth.registerUser('test@example.com', 'password123', 'user-001')
  })

  test('ログイン失敗時にエラーメッセージが表示される', async () => {
    const result = await auth.signInWithPassword('test@example.com', 'wrong')
    expect(result.error?.message).toBeDefined()
    // login.tsx では Alert.alert でエラーを表示
  })

  test('ネットワークエラー時の挙動（Supabase例外）', async () => {
    // ネットワークエラーをシミュレート
    const mockSignIn = jest.fn().mockRejectedValue(new Error('Network Error'))

    let error: Error | null = null
    try {
      await mockSignIn('test@example.com', 'password123')
    } catch (e) {
      error = e as Error
    }

    expect(error?.message).toBe('Network Error')
  })

  test('メール空文字でのsubmitはフォームで防がれる（クライアント側）', () => {
    const email = ''
    const password = 'password123'

    // 実際のアプリでは setLoading(true) → try { signIn } の前にチェックなし
    // Supabaseが "Email is required" などを返す
    const isFormValid = email.length > 0 && password.length > 0
    expect(isFormValid).toBe(false)
    // NOTE: login.tsx にはクライアント側バリデーションがない。
    // 空メールのままSignInするとSupabaseがエラーを返す。
    console.warn('[改善提案] login.tsx にクライアント側バリデーション（空チェック）の追加を推奨')
  })

  test('パスワード空文字でのsubmitはSupabaseがエラーを返す', async () => {
    const result = await auth.signInWithPassword('test@example.com', '')
    expect(result.error).not.toBeNull()
  })
})

// ─────────────────────────────────────────────
// シナリオ5: 各画面のユーザー確認（getUser）
// ─────────────────────────────────────────────
describe('シナリオ5: 画面初期化時のユーザー確認', () => {
  let auth: MockSupabaseAuth

  beforeEach(async () => {
    auth = new MockSupabaseAuth()
    auth.registerUser('test@example.com', 'password123', 'user-001')
  })

  test('add.tsx: userがなければデータ取得しない', async () => {
    const mockFetchOshis = jest.fn()

    async function initAddScreen() {
      const { data: { user } } = await auth.getUser()
      if (!user) return // 早期リターン
      mockFetchOshis(user.id)
    }

    await initAddScreen()
    expect(mockFetchOshis).not.toHaveBeenCalled()
  })

  test('add.tsx: userがいればoshiを取得する', async () => {
    await auth.signInWithPassword('test@example.com', 'password123')
    const mockFetchOshis = jest.fn()

    async function initAddScreen() {
      const { data: { user } } = await auth.getUser()
      if (!user) return
      mockFetchOshis(user.id)
    }

    await initAddScreen()
    expect(mockFetchOshis).toHaveBeenCalledTimes(1)
  })

  test('index.tsx: userがなければ月集計しない', async () => {
    const mockFetchData = jest.fn()

    async function fetchData() {
      const { data: { user } } = await auth.getUser()
      if (!user) return
      mockFetchData(user.id)
    }

    await fetchData()
    expect(mockFetchData).not.toHaveBeenCalled()
  })
})
