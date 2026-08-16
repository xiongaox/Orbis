ALTER TABLE public.ai_model_services
    DROP CONSTRAINT IF EXISTS ai_model_services_protocol_check;

ALTER TABLE public.ai_model_services
    ADD CONSTRAINT ai_model_services_protocol_check
    CHECK (protocol IN (
        'openai-compatible',
        'anthropic-messages',
        'google-generative-ai',
        'azure-openai',
        'ollama'
    ));
