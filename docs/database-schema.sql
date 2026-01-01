-- =============================================
-- Orbis 数据库迁移脚本 (幂等版本)
-- 在 Supabase Dashboard -> SQL Editor 执行
-- 可以安全地多次执行
-- =============================================

-- 1. 用户资料表 (profiles)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 八字案例表 (bazi_cases)
CREATE TABLE IF NOT EXISTS bazi_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('male', 'female')) NOT NULL,
    birth_date TIMESTAMPTZ NOT NULL,
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    bazi_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 启用行级安全 (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bazi_cases ENABLE ROW LEVEL SECURITY;

-- 4. 删除已存在的策略（如果有）
DROP POLICY IF EXISTS "用户只能查看自己的资料" ON profiles;
DROP POLICY IF EXISTS "用户只能更新自己的资料" ON profiles;
DROP POLICY IF EXISTS "用户只能插入自己的资料" ON profiles;

DROP POLICY IF EXISTS "用户只能查看自己的案例" ON bazi_cases;
DROP POLICY IF EXISTS "用户只能创建自己的案例" ON bazi_cases;
DROP POLICY IF EXISTS "用户只能更新自己的案例" ON bazi_cases;
DROP POLICY IF EXISTS "用户只能删除自己的案例" ON bazi_cases;

-- 5. profiles 表策略
CREATE POLICY "用户只能查看自己的资料"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "用户只能更新自己的资料"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "用户只能插入自己的资料"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 6. bazi_cases 表策略
CREATE POLICY "用户只能查看自己的案例"
    ON bazi_cases FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "用户只能创建自己的案例"
    ON bazi_cases FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户只能更新自己的案例"
    ON bazi_cases FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "用户只能删除自己的案例"
    ON bazi_cases FOR DELETE
    USING (auth.uid() = user_id);

-- 7. 自动创建 profile 的触发器
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 8. 更新时间戳触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS bazi_cases_updated_at ON bazi_cases;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER bazi_cases_updated_at
    BEFORE UPDATE ON bazi_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 9. 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_bazi_cases_user_id ON bazi_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_bazi_cases_created_at ON bazi_cases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bazi_cases_tags ON bazi_cases USING GIN(tags);

-- 完成
SELECT '数据库迁移成功！' AS status;
