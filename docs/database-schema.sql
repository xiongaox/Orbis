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

-- 3. 三元天星案例表 (sanyuan_cases)
CREATE TABLE IF NOT EXISTS sanyuan_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    case_type TEXT CHECK (case_type IN ('yangzhai', 'yinzhai')) NOT NULL,
    mountain TEXT CHECK (mountain IN ('壬', '子', '癸', '丑', '艮', '寅', '甲', '卯', '乙', '辰', '巽', '巳', '丙', '午', '丁', '未', '坤', '申', '庚', '酉', '辛', '戌', '乾', '亥')) NOT NULL,
    facing TEXT CHECK (facing IN ('壬', '子', '癸', '丑', '艮', '寅', '甲', '卯', '乙', '辰', '巽', '巳', '丙', '午', '丁', '未', '坤', '申', '庚', '酉', '辛', '戌', '乾', '亥')) NOT NULL,
    yun SMALLINT CHECK (yun BETWEEN 1 AND 9) NOT NULL,
    pan_type TEXT CHECK (pan_type IN ('xia', 'ti')) NOT NULL,
    yuan_phase TEXT CHECK (yuan_phase IN ('upper', 'lower')) NOT NULL,
    location_label TEXT,
    site_usage TEXT,
    landform_notes TEXT,
    analysis TEXT,
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 启用行级安全 (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bazi_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sanyuan_cases ENABLE ROW LEVEL SECURITY;

-- 5. 删除已存在的策略（如果有）
DROP POLICY IF EXISTS "用户只能查看自己的资料" ON profiles;
DROP POLICY IF EXISTS "用户只能更新自己的资料" ON profiles;
DROP POLICY IF EXISTS "用户只能插入自己的资料" ON profiles;

DROP POLICY IF EXISTS "用户只能查看自己的案例" ON bazi_cases;
DROP POLICY IF EXISTS "用户只能创建自己的案例" ON bazi_cases;
DROP POLICY IF EXISTS "用户只能更新自己的案例" ON bazi_cases;
DROP POLICY IF EXISTS "用户只能删除自己的案例" ON bazi_cases;

DROP POLICY IF EXISTS "用户只能查看自己的三元案例" ON sanyuan_cases;
DROP POLICY IF EXISTS "用户只能创建自己的三元案例" ON sanyuan_cases;
DROP POLICY IF EXISTS "用户只能更新自己的三元案例" ON sanyuan_cases;
DROP POLICY IF EXISTS "用户只能删除自己的三元案例" ON sanyuan_cases;

-- 6. profiles 表策略
CREATE POLICY "用户只能查看自己的资料"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "用户只能更新自己的资料"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "用户只能插入自己的资料"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 7. bazi_cases 表策略
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

-- 8. sanyuan_cases 表策略
CREATE POLICY "用户只能查看自己的三元案例"
    ON sanyuan_cases FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "用户只能创建自己的三元案例"
    ON sanyuan_cases FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户只能更新自己的三元案例"
    ON sanyuan_cases FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "用户只能删除自己的三元案例"
    ON sanyuan_cases FOR DELETE
    USING (auth.uid() = user_id);

-- 9. 自动创建 profile 的触发器
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

-- 10. 更新时间戳触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS bazi_cases_updated_at ON bazi_cases;
DROP TRIGGER IF EXISTS sanyuan_cases_updated_at ON sanyuan_cases;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER bazi_cases_updated_at
    BEFORE UPDATE ON bazi_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sanyuan_cases_updated_at
    BEFORE UPDATE ON sanyuan_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 11. 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_bazi_cases_user_id ON bazi_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_bazi_cases_created_at ON bazi_cases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bazi_cases_tags ON bazi_cases USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_sanyuan_cases_user_id ON sanyuan_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_sanyuan_cases_updated_at ON sanyuan_cases(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sanyuan_cases_case_type ON sanyuan_cases(case_type);

-- 完成
SELECT '数据库迁移成功！' AS status;
