-- 进度表
CREATE TABLE case_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id TEXT NOT NULL,
  progress_percent SMALLINT NOT NULL CHECK (progress_percent BETWEEN 0 AND 100),
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, article_id)
);

-- 索引：按用户和最后阅读时间倒序查询（最近阅读）
CREATE INDEX idx_case_progress_user_last_read ON case_progress(user_id, last_read_at DESC);

-- 索引：按用户和进度查询（在读/已读过滤）
CREATE INDEX idx_case_progress_user_percent ON case_progress(user_id, progress_percent);

-- 启用 RLS
ALTER TABLE case_progress ENABLE ROW LEVEL SECURITY;

-- RLS 策略：仅允许用户管理自己的进度
CREATE POLICY "Users can view own progress" ON case_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON case_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON case_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress" ON case_progress
  FOR DELETE USING (auth.uid() = user_id);;
