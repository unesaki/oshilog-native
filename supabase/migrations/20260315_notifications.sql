-- 通知テーブル
-- user_id = NULL の場合は全ユーザー向けの公式お知らせ
CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('budget_alert', 'announcement')),
  title text NOT NULL,
  body text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 自分宛て通知 + 全体向けお知らせ（user_id IS NULL）を参照可能
CREATE POLICY "users can view own and announcements" ON notifications
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "users can delete own notifications" ON notifications
  FOR DELETE USING (user_id = auth.uid());

-- ユーザー通知設定テーブル
CREATE TABLE IF NOT EXISTS user_notification_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  budget_alert boolean DEFAULT true,
  announcement boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own notification settings" ON user_notification_settings
  FOR ALL USING (user_id = auth.uid());

-- Expo Push Token 保存テーブル
CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  token text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own push tokens" ON push_tokens
  FOR ALL USING (user_id = auth.uid());
