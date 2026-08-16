CREATE TABLE IF NOT EXISTS public.ai_model_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    protocol TEXT CHECK (protocol IN ('openai-compatible')) NOT NULL DEFAULT 'openai-compatible',
    base_url TEXT NOT NULL,
    api_key TEXT NOT NULL,
    models TEXT[] NOT NULL DEFAULT '{}',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_model_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户只能查看自己的 AI 模型服务"
    ON public.ai_model_services FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "用户只能创建自己的 AI 模型服务"
    ON public.ai_model_services FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户只能更新自己的 AI 模型服务"
    ON public.ai_model_services FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "用户只能删除自己的 AI 模型服务"
    ON public.ai_model_services FOR DELETE
    USING (auth.uid() = user_id);

CREATE TRIGGER ai_model_services_updated_at
    BEFORE UPDATE ON public.ai_model_services
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_ai_model_services_user_id ON public.ai_model_services(user_id);
CREATE INDEX idx_ai_model_services_updated_at ON public.ai_model_services(updated_at DESC);
