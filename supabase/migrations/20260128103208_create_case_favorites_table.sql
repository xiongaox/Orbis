-- 收藏表
CREATE TABLE case_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, article_id)
);

-- 索引：按用户和创建时间倒序查询
CREATE INDEX idx_case_favorites_user_created ON case_favorites(user_id, created_at DESC);

-- 启用 RLS
ALTER TABLE case_favorites ENABLE ROW LEVEL SECURITY;

-- RLS 策略：仅允许用户管理自己的收藏
CREATE POLICY "Users can view own favorites" ON case_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" ON case_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON case_favorites
  FOR DELETE USING (auth.uid() = user_id);;
