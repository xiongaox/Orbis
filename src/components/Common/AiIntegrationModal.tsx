import { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  CirclePlus,
  Download,
  Loader2,
  Pencil,
  Plus,
  Server,
  Trash2,
  XCircle,
} from 'lucide-react';
import BaseModal from '../UI/BaseModal';
import {
  aiModelService,
  AI_PROTOCOLS,
  testAiModelService,
  type AiProtocol,
  type AiModelService,
  type AiModelServiceInput,
} from '../../services/aiModelService';

interface AiIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

type FormState = Omit<AiModelServiceInput, 'models'> & { models: string[]; modelInput: string };
type Status = { kind: 'success' | 'error'; message: string } | null;

const EMPTY_FORM: FormState = {
  name: '',
  protocol: 'openai-compatible',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  models: [],
  modelInput: '',
};

function toFormState(service?: AiModelService): FormState {
  if (!service) return { ...EMPTY_FORM, models: [] };

  return {
    name: service.name,
    protocol: service.protocol,
    baseUrl: service.baseUrl,
    apiKey: '',
    models: service.models,
    modelInput: '',
  };
}

export default function AiIntegrationModal({ isOpen, onClose, userId }: AiIntegrationModalProps) {
  const [services, setServices] = useState<AiModelService[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<AiModelService | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loadServices = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setServices(await aiModelService.getServices());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '加载模型服务失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !userId) return;

    let cancelled = false;
    void aiModelService.getServices()
      .then((nextServices) => {
        if (!cancelled) {
          setServices(nextServices);
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : '加载模型服务失败');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, userId]);

  const handleAdd = () => {
    setEditingService(null);
    setShowForm(true);
  };

  const handleEdit = (service: AiModelService) => {
    setEditingService(service);
    setShowForm(true);
  };

  const handleToggle = async (service: AiModelService) => {
    try {
      const updated = await aiModelService.toggleService(service.id, !service.enabled);
      setServices((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '更新服务状态失败');
    }
  };

  const handleDelete = async (service: AiModelService) => {
    if (!window.confirm(`确认删除“${service.name}”吗？`)) return;

    try {
      await aiModelService.deleteService(service.id);
      setServices((current) => current.filter((item) => item.id !== service.id));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '删除服务失败');
    }
  };

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title="AI 集成"
        titleIcon={<Bot className="h-5 w-5" />}
        maxWidth="max-w-3xl"
        bodyClassName="p-0"
      >
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">在此管理用于 AI 提示词和后续功能的模型服务。</p>
              <p className="mt-1 text-xs text-muted-foreground">服务配置将同步到当前登录账户的其他设备。</p>
            </div>
            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20 focus-ring"
            >
              <Plus className="h-4 w-4" />
              添加服务
            </button>
          </div>

          {loadError && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-destructive/50 bg-destructive/40 p-3 text-sm text-destructive-foreground">
              <span>{loadError}</span>
              <button type="button" onClick={() => void loadServices()} className="shrink-0 font-medium underline focus-ring">
                重试
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              正在加载模型服务
            </div>
          ) : services.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 text-center">
              <Server className="mb-3 h-7 w-7 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">暂未添加模型服务。</p>
              <button
                type="button"
                onClick={handleAdd}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 focus-ring"
              >
                <CirclePlus className="h-4 w-4" />
                添加模型服务
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {services.map((service) => (
                <li key={service.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-foreground">{service.name}</h3>
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                          {AI_PROTOCOLS.find((item) => item.value === service.protocol)?.label ?? service.protocol}
                        </span>
                        <span className={service.enabled ? 'text-xs text-success-primary' : 'text-xs text-muted-foreground'}>
                          {service.enabled ? '已启用' : '已停用'}
                        </span>
                      </div>
                      <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{service.baseUrl}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {service.models.length > 0 ? `模型：${service.models.join('、')}` : '尚未添加模型'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleToggle(service)}
                        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors focus-ring ${service.enabled ? 'border-success-primary bg-success-primary' : 'border-border bg-muted'}`}
                        aria-label={service.enabled ? `停用 ${service.name}` : `启用 ${service.name}`}
                      >
                        <span className={`absolute left-[3px] top-[3px] h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${service.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(service)}
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-ring"
                        aria-label={`编辑 ${service.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(service)}
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground focus-ring"
                        aria-label={`删除 ${service.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </BaseModal>

      {showForm && (
        <AiServiceFormModal
          isOpen={showForm}
          service={editingService}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            void loadServices();
          }}
        />
      )}
    </>
  );
}

interface AiServiceFormModalProps {
  isOpen: boolean;
  service: AiModelService | null;
  onClose: () => void;
  onSaved: () => void;
}

function AiServiceFormModal({ isOpen, service, onClose, onSaved }: AiServiceFormModalProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(service ?? undefined));
  const [status, setStatus] = useState<Status>(null);
  const [testing, setTesting] = useState(false);
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [showModelPicker, setShowModelPicker] = useState(false);

  const updateForm = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const protocol = AI_PROTOCOLS.find((item) => item.value === form.protocol);

  const validate = () => {
    if (!form.name.trim()) return '请填写服务名称';
    if (!form.baseUrl.trim()) return '请填写 Base URL';
    if (!protocol) return '请选择 API 协议';
    if (protocol.requiresApiKey && !form.apiKey.trim() && !service) return '请填写 API Key';
    return null;
  };

  const getConnectionInput = () => ({
    protocol: form.protocol,
    baseUrl: form.baseUrl,
    apiKey: form.apiKey || service?.apiKey || '',
  });

  const handleProtocolChange = (nextProtocol: AiProtocol) => {
    const next = AI_PROTOCOLS.find((item) => item.value === nextProtocol);
    if (!next) return;

    updateForm('protocol', nextProtocol);
    updateForm('baseUrl', next.defaultBaseUrl);
  };

  const addManualModel = () => {
    const model = form.modelInput.trim();
    if (!model || form.models.includes(model)) return;
    updateForm('models', [...form.models, model]);
    updateForm('modelInput', '');
  };

  const handleConnection = async (loadModels: boolean) => {
    const validationError = validate();
    if (validationError) {
      setStatus({ kind: 'error', message: validationError });
      return;
    }

    setTesting(true);
    setStatus(null);
    try {
      const result = await testAiModelService(getConnectionInput());
      if (!loadModels) {
        setStatus({ kind: 'success', message: '模型服务已成功响应。' });
        return;
      }

      if (result.modelIds.length === 0) {
        setStatus({ kind: 'error', message: '连接成功，但服务未返回可用模型。' });
        return;
      }

      setDiscoveredModels(result.modelIds);
      setSelectedModels(result.modelIds.filter((model) => form.models.includes(model)));
      setShowModelPicker(true);
      setStatus({ kind: 'success', message: `连接成功，发现 ${result.modelIds.length} 个模型。` });
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : '连接失败' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setStatus({ kind: 'error', message: validationError });
      return;
    }

    try {
      if (service) {
        await aiModelService.updateService(service.id, form);
      } else {
        await aiModelService.createService(form);
      }
      onSaved();
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : '保存服务失败' });
    }
  };

  const footer = (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="min-w-0">
        {status && (
          <div className={`flex items-center gap-2 text-sm ${status.kind === 'success' ? 'text-success-primary' : 'text-destructive-foreground'}`}>
            {status.kind === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
            <span className="truncate">{status.message}</span>
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary focus-ring">
          取消
        </button>
        <button
          type="button"
          onClick={() => void handleConnection(false)}
          disabled={testing}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60 focus-ring"
        >
          {testing && <Loader2 className="h-4 w-4 animate-spin" />}
          测试连接
        </button>
        <button type="button" onClick={() => void handleSave()} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-ring">
          保存
        </button>
      </div>
    </div>
  );

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title={service ? '编辑连接' : '添加模型服务'}
        titleIcon={<Server className="h-5 w-5" />}
        maxWidth="max-w-2xl"
        bodyClassName="p-5 sm:p-6"
        footer={footer}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {service ? `修改“${service.name}”的连接配置。留空 API Key 将保留现有凭据。` : '连接一个兼容 OpenAI 接口的模型服务。'}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="服务名称">
              <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="例如 DeepSeek" className="modal-input h-[46px] focus-ring" />
            </Field>
            <Field label="API 协议">
              <ProtocolSelect value={form.protocol} onChange={handleProtocolChange} />
            </Field>
          </div>

          <Field label="Base URL">
            <input value={form.baseUrl} onChange={(event) => updateForm('baseUrl', event.target.value)} placeholder="https://api.example.com/v1" className="modal-input font-mono focus-ring" />
          </Field>

          <Field label={protocol?.requiresApiKey ? 'API Key' : 'API Key（可选）'}>
            <input type="password" value={form.apiKey} onChange={(event) => updateForm('apiKey', event.target.value)} placeholder={service ? '已保存；输入新密钥可替换' : protocol?.requiresApiKey ? '请输入 API Key' : '此协议无需 API Key'} autoComplete="new-password" className="modal-input focus-ring" />
          </Field>

          <Field
            label={(
              <div className="flex items-center justify-between gap-3">
                <span>模型 ID</span>
                <button type="button" onClick={addManualModel} className="text-xs font-medium text-primary hover:text-primary/80 focus-ring">
                  手动添加
                </button>
              </div>
            )}
          >
            <div className="flex gap-2">
              <input
                value={form.modelInput}
                onChange={(event) => updateForm('modelInput', event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addManualModel();
                  }
                }}
                placeholder="输入模型 ID，或从服务中加载"
                className="modal-input h-[46px] min-w-0 flex-1 font-mono focus-ring"
              />
              <button
                type="button"
                onClick={() => void handleConnection(true)}
                disabled={testing}
                className="inline-flex h-[46px] shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60 focus-ring"
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                加载模型
              </button>
            </div>
            {form.models.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.models.map((model) => (
                  <span key={model} className="inline-flex items-center gap-1 rounded-md bg-primary/10 py-1 pl-2 pr-1 font-mono text-xs text-primary">
                    {model}
                    <button type="button" onClick={() => updateForm('models', form.models.filter((item) => item !== model))} className="rounded p-0.5 hover:bg-primary/15 focus-ring" aria-label={`移除 ${model}`}>
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>
        </div>
      </BaseModal>

      <ModelPickerModal
        isOpen={showModelPicker}
        models={discoveredModels}
        selectedModels={selectedModels}
        onToggle={(model) => setSelectedModels((current) => current.includes(model) ? current.filter((item) => item !== model) : [...current, model])}
        onClose={() => setShowModelPicker(false)}
        onConfirm={() => {
          updateForm('models', Array.from(new Set([...form.models, ...selectedModels])));
          setShowModelPicker(false);
        }}
      />
    </>
  );
}

interface ModelPickerModalProps {
  isOpen: boolean;
  models: string[];
  selectedModels: string[];
  onToggle: (model: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

function ModelPickerModal({ isOpen, models, selectedModels, onToggle, onClose, onConfirm }: ModelPickerModalProps) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="选择模型"
      titleIcon={<Bot className="h-5 w-5" />}
      maxWidth="max-w-lg"
      footer={(
        <>
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary focus-ring">取消</button>
          <button type="button" onClick={onConfirm} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-ring">添加所选模型</button>
        </>
      )}
    >
      <div className="space-y-2">
        <p className="mb-3 text-sm text-muted-foreground">选择需要在此服务中使用的一个或多个模型。</p>
        {models.map((model) => {
          const selected = selectedModels.includes(model);
          return (
            <button
              key={model}
              type="button"
              onClick={() => onToggle(model)}
              className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors focus-ring ${selected ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border hover:bg-secondary text-foreground'}`}
            >
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input'}`}>
                {selected && <Check className="h-3 w-3" />}
              </span>
              <span className="font-mono text-sm">{model}</span>
            </button>
          );
        })}
      </div>
    </BaseModal>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-sm font-medium text-foreground">{label}</div>
      {children}
    </div>
  );
}

function ProtocolSelect({ value, onChange }: { value: AiProtocol; onChange: (value: AiProtocol) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = AI_PROTOCOLS.find((item) => item.value === value) ?? AI_PROTOCOLS[0];

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="modal-input flex h-[46px] items-center justify-between gap-3 py-0 text-left transition-colors hover:border-primary/50 focus-ring"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{selected.label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-[110] mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-lg" role="listbox">
          {AI_PROTOCOLS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                onChange(item.value);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors focus-ring ${item.value === value ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary'}`}
              role="option"
              aria-selected={item.value === value}
            >
              <span>{item.label}</span>
              {!item.requiresApiKey && <span className="text-xs text-muted-foreground">无需密钥</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
