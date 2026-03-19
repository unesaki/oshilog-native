-- サブスクリプションテーブル
-- RevenueCat / IAP の購入状態を保持する
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'cancelled')),
  purchased_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view own subscription" ON subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users can insert own subscription" ON subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "users can update own subscription" ON subscriptions
  FOR UPDATE USING (user_id = auth.uid());
