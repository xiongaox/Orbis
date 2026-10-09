import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Pencil, Plus } from 'lucide-react';
import { DIRECTIONS, getYuanPhaseDefault, isYuanPhaseChoiceRequired } from '../../../../lib/sanyuan';
import type { PanType, SanYuanInput, YuanPhase } from '../../../../lib/sanyuan';
import {
    SANYUAN_CASE_TYPES,
    sanyuanCaseService,
    type CreateSanYuanCaseInput,
    type SanYuanCase,
    type SanYuanCaseType,
} from '../../../../services/sanyuanCaseService';
import BaseModal from '../../../UI/BaseModal';
import CustomSelect from '../../../UI/CustomSelect';

const YUN_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((yun) => ({ label: `${yun}运`, value: yun }));
const PAN_TYPE_OPTIONS: { label: string; value: PanType }[] = [
    { label: '下卦（9°内）', value: 'xia' },
    { label: '替卦（9°外）', value: 'ti' },
];
const YUAN_PHASE_OPTIONS: { label: string; value: YuanPhase }[] = [
    { label: '上元', value: 'upper' },
    { label: '下元', value: 'lower' },
];

interface SanYuanCaseForm {
    title: string;
    caseType: SanYuanCaseType;
    directionId: string;
    yun: number;
    panType: PanType;
    yuanPhase: YuanPhase;
    locationLabel: string;
    siteUsage: string;
    landformNotes: string;
    analysis: string;
    feedback: string;
}

interface SanYuanCaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    chartInput: SanYuanInput;
    initialCase?: SanYuanCase | null;
    onSaved: (caseData: SanYuanCase) => void;
}

function getDirectionId(input: Pick<SanYuanInput, 'mountain' | 'facing'>): string {
    return DIRECTIONS.find((item) => item.mountain === input.mountain && item.facing === input.facing)?.id ?? '壬-丙';
}

function getDirectionLabel(id: string): string {
    return DIRECTIONS.find((item) => item.id === id)?.label ?? id;
}

function createFormState(chartInput: SanYuanInput, initialCase?: SanYuanCase | null): SanYuanCaseForm {
    const input = initialCase
        ? {
            mountain: initialCase.mountain,
            facing: initialCase.facing,
            yun: initialCase.yun,
            panType: initialCase.pan_type,
            yuanPhase: initialCase.yuan_phase,
        }
        : chartInput;

    return {
        title: initialCase?.title ?? '',
        caseType: initialCase?.case_type ?? 'yangzhai',
        directionId: getDirectionId(input),
        yun: input.yun,
        panType: input.panType,
        yuanPhase: input.yuanPhase,
        locationLabel: initialCase?.location_label ?? '',
        siteUsage: initialCase?.site_usage ?? '',
        landformNotes: initialCase?.landform_notes ?? '',
        analysis: initialCase?.analysis ?? '',
        feedback: initialCase?.feedback ?? '',
    };
}

function optionalValue(value: string): string | undefined {
    return value.trim() || undefined;
}

/** 向导三步：基本信息 → 排盘参数 → 记录与研判（与 C2 定稿一致） */
const STEP_COUNT = 3;

export default function SanYuanCaseModal({
    isOpen,
    onClose,
    chartInput,
    initialCase = null,
    onSaved,
}: SanYuanCaseModalProps) {
    const [form, setForm] = useState<SanYuanCaseForm>(() => createFormState(chartInput, initialCase));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // 向导状态：当前步 + 允许到达的最远步（必填通过后推进，解锁左栏跳转）
    const [step, setStep] = useState(0);
    const [maxReachable, setMaxReachable] = useState(1);
    // 山向搜索下拉
    const [isDirMenuOpen, setIsDirMenuOpen] = useState(false);
    // 菜单弹出方向与高度：按触发钮在滚动容器内的可视空间计算，避免菜单撑出滚动区把内容顶上去
    const [dirMenuPlacement, setDirMenuPlacement] = useState({ openUp: false, maxHeight: 252 });
    const dirTriggerRef = useRef<HTMLButtonElement | null>(null);
    const dirMenuRef = useRef<HTMLDivElement | null>(null);
    const contentScrollRef = useRef<HTMLDivElement | null>(null);

    // 菜单展开时，点击菜单与触发钮以外任意位置收起（capture 阶段监听，覆盖弹窗内外）
    useEffect(() => {
        if (!isDirMenuOpen) return;
        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target;
            if (target instanceof Node) {
                if (dirMenuRef.current?.contains(target)) return;
                if (dirTriggerRef.current?.contains(target)) return;
            }
            setIsDirMenuOpen(false);
        };
        window.addEventListener('pointerdown', handlePointerDown, true);
        return () => window.removeEventListener('pointerdown', handlePointerDown, true);
    }, [isDirMenuOpen]);

    useEffect(() => {
        if (isOpen) {
            setForm(createFormState(chartInput, initialCase));
            setError(null);
            setStep(0);
            setMaxReachable(initialCase ? STEP_COUNT - 1 : 1);
            setIsDirMenuOpen(false);
        }
    }, [chartInput, initialCase, isOpen]);
    const updateForm = <Key extends keyof SanYuanCaseForm>(key: Key, value: SanYuanCaseForm[Key]) => {
        setForm((current) => ({ ...current, [key]: value }));
    };

    const handleYunChange = (yun: number) => {
        setForm((current) => ({
            ...current,
            yun,
            yuanPhase: isYuanPhaseChoiceRequired(yun) ? current.yuanPhase : getYuanPhaseDefault(yun),
        }));
    };

    const isTitleFilled = form.title.trim().length > 0;
    const stepDone = [isTitleFilled, true, true];

    const gotoStep = (next: number) => {
        if (next > maxReachable || next === step) return;
        setStep(next);
        setIsDirMenuOpen(false);
        setError(null);
    };

    /** 主按钮：前两步推进（带校验），第三步提交保存 */
    const handlePrimary = async () => {
        if (step < STEP_COUNT - 1) {
            if (!stepDone[step]) {
                setError('请输入案例名称');
                return;
            }
            setMaxReachable((current) => Math.max(current, step + 1));
            setStep(step + 1);
            setError(null);
            return;
        }

        setError(null);
        if (!form.title.trim()) {
            setStep(0);
            setMaxReachable((current) => Math.max(current, 0));
            setError('请输入案例名称');
            return;
        }

        const direction = DIRECTIONS.find((item) => item.id === form.directionId);
        if (!direction) {
            setError('请选择有效山向');
            return;
        }

        const input: CreateSanYuanCaseInput = {
            title: form.title.trim(),
            case_type: form.caseType,
            mountain: direction.mountain,
            facing: direction.facing,
            yun: form.yun,
            pan_type: form.panType,
            yuan_phase: form.yuanPhase,
            location_label: optionalValue(form.locationLabel),
            site_usage: optionalValue(form.siteUsage),
            landform_notes: optionalValue(form.landformNotes),
            analysis: optionalValue(form.analysis),
            feedback: optionalValue(form.feedback),
        };

        setIsSubmitting(true);
        try {
            const savedCase = initialCase
                ? await sanyuanCaseService.updateCase(initialCase.id, input)
                : await sanyuanCaseService.createCase(input);
            onSaved(savedCase);
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : '保存失败，请稍后重试');
        } finally {
            setIsSubmitting(false);
        }
    };

    /** 左栏点击：可到达步直接跳；锁定步聚焦缺失项并提示 */
    const handleRailClick = (index: number) => {
        if (index <= maxReachable) {
            gotoStep(index);
            return;
        }
        setStep(0);
        setError('请先填写案例名称，填写后解锁后续步骤');
    };

    /** 山向菜单开合：按触发钮在滚动容器内的剩余空间决定向上/向下弹出与最大高度（含菜单自身内边距 12px + 外偏移 6px） */
    const toggleDirMenu = () => {
        if (isDirMenuOpen) {
            setIsDirMenuOpen(false);
            return;
        }
        const trigger = dirTriggerRef.current;
        const scroller = contentScrollRef.current;
        const MENU_PADDING = 12;
        const MENU_OFFSET = 6;
        if (trigger && scroller) {
            const triggerRect = trigger.getBoundingClientRect();
            const scrollerRect = scroller.getBoundingClientRect();
            const spaceBelow = scrollerRect.bottom - triggerRect.bottom - MENU_OFFSET - MENU_PADDING;
            const spaceAbove = triggerRect.top - scrollerRect.top - MENU_OFFSET - MENU_PADDING;
            // 下方放不下而上方更宽裕时向上弹；可用高度下限 120px，超出内部滚动
            const openUp = spaceBelow < 240 && spaceAbove > spaceBelow;
            const limit = Math.max(120, Math.floor(openUp ? spaceAbove : spaceBelow));
            setDirMenuPlacement({ openUp, maxHeight: Math.min(252, limit) });
        } else {
            setDirMenuPlacement({ openUp: false, maxHeight: 252 });
        }
        setIsDirMenuOpen(true);
    };

    const titleError = error === '请输入案例名称' || error?.startsWith('请先填写案例名称');
    const yuanPhaseChoiceRequired = isYuanPhaseChoiceRequired(form.yun);

    const primaryLabel = step === 0 ? '下一步' : step === 1 ? '下一步' : initialCase ? '保存修改' : '保存案例';
    const footHint = step === 0 ? '必填完成后解锁跳转' : step === 1 ? '山向、元运保存后可随时回改' : '全部可选，可保存后补录';

    // ===== 左栏步骤项（完成步 ✓ + 摘要 / 当前步高亮 / 锁定步禁点） =====
    const railItems = [
        {
            index: 0,
            name: '基本信息',
            summary: isTitleFilled
                ? `${form.title.trim()}${form.locationLabel.trim() ? ` · ${form.locationLabel.trim()}` : ''}`
                : null,
            fallback: '名称 · 宅类 · 地点',
        },
        {
            index: 1,
            name: '排盘参数',
            summary: stepDone[1] ? `${getDirectionLabel(form.directionId)} · ${form.yun}运` : null,
            fallback: '山向 · 元运 · 卦类',
        },
        {
            index: 2,
            name: '记录与研判',
            summary: null,
            fallback: '可选，可保存后补录',
        },
    ];

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={(closeButton) => (
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 text-base font-semibold text-foreground">
                        {initialCase ? <Pencil className="h-[18px] w-[18px] text-primary" /> : <Plus className="h-[18px] w-[18px] text-primary" />}
                        {initialCase ? '编辑三元案例' : '新建三元案例'}
                    </div>
                    {closeButton}
                </div>
            )}
            footer={
                <div className="flex w-full items-center gap-3">
                    <div className="mr-auto flex min-w-0 flex-col gap-0.5">
                        <span className="text-xs text-muted-foreground">
                            步骤 <span className="font-semibold text-foreground">{step + 1}</span> / {STEP_COUNT}
                        </span>
                        <span className="text-[11px] text-muted-foreground/70">{footHint}</span>
                    </div>
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="modal-btn focus-ring">
                        取消
                    </button>
                    {step > 0 && (
                        <button type="button" onClick={() => gotoStep(step - 1)} disabled={isSubmitting} className="modal-btn focus-ring">
                            上一步
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => void handlePrimary()}
                        disabled={isSubmitting}
                        className="modal-btn primary flex items-center gap-2 focus-ring"
                    >
                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {primaryLabel}
                    </button>
                </div>
            }
            maxWidth="max-w-3xl"
            bodyClassName="p-0"
        >
            <div className="grid min-h-[372px] grid-cols-[190px_minmax(0,1fr)]">
                {/* 左栏步骤导航 */}
                <div className="flex flex-col gap-1.5 border-r border-border/60 bg-sidebar/30 px-3 py-4">
                    {railItems.map((item) => {
                        const reachable = item.index <= maxReachable;
                        const isCurrent = item.index === step;
                        const isDone = stepDone[item.index] && !isCurrent;
                        return (
                            <button
                                key={item.index}
                                type="button"
                                onClick={() => handleRailClick(item.index)}
                                disabled={!reachable || isSubmitting}
                                className={`flex w-full items-start gap-2.5 rounded-lg border px-2.5 py-2.5 text-left transition-colors focus-ring ${isCurrent
                                    ? 'border-primary/20 bg-primary/10 font-semibold text-primary'
                                    : isDone
                                        ? 'border-transparent text-foreground hover:bg-white/3'
                                        : reachable
                                            ? 'border-transparent text-muted-foreground hover:bg-white/3 hover:text-foreground'
                                            : 'cursor-not-allowed border-transparent text-muted-foreground opacity-45'
                                    }`}
                            >
                                <span className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border text-[11px] ${isCurrent
                                    ? 'border-primary/50 text-primary'
                                    : isDone
                                        ? 'border-primary/50 text-primary'
                                        : 'border-border bg-secondary text-muted-foreground'
                                    }`}
                                >
                                    {isDone ? <Check className="h-3 w-3" /> : item.index + 1}
                                </span>
                                <span className="flex min-w-0 flex-col gap-px">
                                    <span className="text-[13px] leading-[1.35]">{item.name}</span>
                                    <span className={`truncate text-[11px] leading-[1.45] ${isDone ? 'text-primary/85' : 'text-muted-foreground/70'}`}>
                                        {isDone && item.summary ? item.summary : item.fallback}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* 右侧内容区 */}
                <div
                    ref={contentScrollRef}
                    className="flex min-h-[372px] flex-col gap-3.5 overflow-y-auto p-5"
                    onScroll={() => { if (isDirMenuOpen) setIsDirMenuOpen(false); }}
                >
                    {/* ===== 步 1：基本信息 ===== */}
                    <div style={step !== 0 ? { display: 'none' } : undefined} className="flex flex-col gap-3.5">
                        <section className="rounded-xl border border-border/70 bg-card/40 p-4">
                            <div className="mb-3 flex items-baseline justify-between gap-4">
                                <h3 className="text-sm font-medium text-foreground">基本信息</h3>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10.5rem]">
                                <label className="modal-field mb-0">
                                    <span className="modal-label">案例名称 *</span>
                                    <input
                                        value={form.title}
                                        onChange={(event) => {
                                            updateForm('title', event.target.value);
                                            if (titleError) setError(null);
                                        }}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                                event.preventDefault();
                                                void handlePrimary();
                                            }
                                        }}
                                        placeholder="例如：自宅九运勘察"
                                        className={`modal-input ${titleError ? 'border-destructive/60' : ''}`}
                                        disabled={isSubmitting}
                                        autoFocus
                                    />
                                    {titleError && <p className="mt-1.5 text-[11.5px] text-destructive">请输入案例名称</p>}
                                </label>
                                <div className="modal-field mb-0">
                                    <span className="modal-label">宅类 *</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        {SANYUAN_CASE_TYPES.map((type) => (
                                            <button
                                                key={type.id}
                                                type="button"
                                                onClick={() => updateForm('caseType', type.id)}
                                                disabled={isSubmitting}
                                                className={`h-[42px] rounded-lg border px-3 text-sm transition-colors focus-ring ${form.caseType === type.id
                                                    ? 'border-primary/40 bg-primary/10 text-primary'
                                                    : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
                                                    }`}
                                            >
                                                {type.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <label className="modal-field mb-0 sm:col-span-2">
                                    <span className="modal-label">地点 / 项目别名（可选）</span>
                                    <input
                                        value={form.locationLabel}
                                        onChange={(event) => updateForm('locationLabel', event.target.value)}
                                        placeholder="例如：城南自宅、祖坟 A 地"
                                        className="modal-input"
                                        disabled={isSubmitting}
                                    />
                                </label>
                            </div>
                        </section>
                    </div>

                    {/* ===== 步 2：排盘参数 ===== */}
                    <div style={step !== 1 ? { display: 'none' } : undefined} className="flex flex-col gap-3.5">
                        <section className="rounded-xl border border-border/70 bg-card/40 p-4">
                            <div className="mb-3 flex items-baseline justify-between gap-4">
                                <h3 className="text-sm font-medium text-foreground">排盘参数</h3>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="modal-field mb-0 relative">
                                    <span className="modal-label">山向 *</span>
                                    <button
                                        ref={dirTriggerRef}
                                        type="button"
                                        onClick={toggleDirMenu}
                                        disabled={isSubmitting}
                                        className={`flex h-[42px] w-full items-center justify-between rounded-lg border border-border bg-secondary px-3 text-sm text-foreground transition-colors focus-ring hover:border-primary/30 ${isDirMenuOpen ? 'border-primary/50' : ''}`}
                                    >
                                        <span className="truncate">{getDirectionLabel(form.directionId)}</span>
                                        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${isDirMenuOpen && dirMenuPlacement.openUp ? '' : isDirMenuOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isDirMenuOpen && (
                                        <div
                                            ref={dirMenuRef}
                                            className={`absolute left-0 right-0 z-30 flex flex-col rounded-[10px] border border-border bg-sidebar shadow-lg p-1.5 ${dirMenuPlacement.openUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}`}
                                            style={{ maxHeight: dirMenuPlacement.maxHeight }}
                                        >
                                            <div className="min-h-0 flex-1 overflow-y-auto">
                                                {DIRECTIONS.map((item) => (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => {
                                                            updateForm('directionId', item.id);
                                                            setIsDirMenuOpen(false);
                                                        }}
                                                        className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors ${item.id === form.directionId
                                                            ? 'bg-primary/10 text-primary'
                                                            : 'text-foreground hover:bg-secondary/60'
                                                            }`}
                                                    >
                                                        <span>{item.label}</span>
                                                        {item.id === form.directionId && <Check className="h-3 w-3 shrink-0" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="modal-field mb-0">
                                    <span className="modal-label">卦类 *</span>
                                    <CustomSelect
                                        options={PAN_TYPE_OPTIONS}
                                        value={form.panType}
                                        onChange={(value) => updateForm('panType', value as PanType)}
                                        className="[&>div:first-child]:h-[42px] [&>div:first-child]:px-3 [&>div:first-child]:py-0"
                                    />
                                </div>
                                <div className="modal-field mb-0">
                                    <span className="modal-label">元运 *</span>
                                    <CustomSelect
                                        options={YUN_OPTIONS}
                                        value={form.yun}
                                        onChange={(value) => handleYunChange(value as number)}
                                        className="[&>div:first-child]:h-[42px] [&>div:first-child]:px-3 [&>div:first-child]:py-0"
                                    />
                                </div>
                                <div className="modal-field mb-0">
                                    <span className="modal-label">元期{yuanPhaseChoiceRequired ? ' *' : ''}</span>
                                    {yuanPhaseChoiceRequired ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            {YUAN_PHASE_OPTIONS.map((option) => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => updateForm('yuanPhase', option.value)}
                                                    disabled={isSubmitting}
                                                    className={`h-[42px] rounded-lg border px-3 text-sm transition-colors focus-ring ${form.yuanPhase === option.value
                                                        ? 'border-primary/40 bg-primary/10 text-primary'
                                                        : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
                                                        }`}
                                                >
                                                    {option.label}
                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="flex h-[42px] w-full items-center rounded-lg border border-border/60 bg-background/60 px-3 text-sm text-muted-foreground">
                                            {form.yuanPhase === 'upper' ? '上元' : '下元'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </section>
                        <div className="flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2.5 text-[12.5px] leading-[1.65] text-primary">
                            <span aria-hidden className="mt-px">ⓘ</span>
                            <span>
                                {yuanPhaseChoiceRequired
                                    ? '5 运介于上元与下元之间，需人工归属；请在上方选择。'
                                    : `元期为 5 运时需人工选择上元 / 下元；其余运自动判定。当前 ${form.yun} 运自动归属「${form.yuanPhase === 'upper' ? '上元' : '下元'}」。`}
                            </span>
                        </div>
                    </div>

                    {/* ===== 步 3：记录与研判 ===== */}
                    <div style={step !== 2 ? { display: 'none' } : undefined} className="flex flex-col gap-3.5">
                        {/* 前两步摘要条 */}
                        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 rounded-[10px] border border-border/60 bg-card/40 px-3.5 py-2.5 text-[12.5px]">
                            <span><span className="text-muted-foreground/70">名称 </span><span className="text-foreground">{form.title.trim() || '—'}</span></span>
                            <span><span className="text-muted-foreground/70">宅类 </span><span className="text-foreground">{SANYUAN_CASE_TYPES.find((t) => t.id === form.caseType)?.name}</span></span>
                            <span><span className="text-muted-foreground/70">山向 </span><span className="text-foreground">{getDirectionLabel(form.directionId)}</span></span>
                            <span><span className="text-muted-foreground/70">元运 </span><span className="font-mono tabular-nums text-foreground">{form.yun}运 · {form.yuanPhase === 'upper' ? '上元' : '下元'}</span></span>
                            <span><span className="text-muted-foreground/70">卦类 </span><span className="text-foreground">{form.panType === 'xia' ? '下卦' : '替卦'}</span></span>
                        </div>

                        <section className="rounded-xl border border-border/70 bg-card/40 p-4">
                            <div className="mb-3 flex items-baseline justify-between gap-4">
                                <h3 className="text-sm font-medium text-foreground">记录与研判</h3>
                                <span className="text-xs text-muted-foreground">全部可选，可保存后补录</span>
                            </div>
                            <div className="flex flex-col gap-3">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <label className="modal-field mb-0">
                                        <span className="modal-label">主要用途与气口</span>
                                        <textarea
                                            value={form.siteUsage}
                                            onChange={(event) => updateForm('siteUsage', event.target.value)}
                                            placeholder="大门、床位、灶位、水景及长期活动区域"
                                            className="modal-input resize-none"
                                            rows={3}
                                            disabled={isSubmitting}
                                        />
                                    </label>
                                    <label className="modal-field mb-0">
                                        <span className="modal-label">峦头记录</span>
                                        <textarea
                                            value={form.landformNotes}
                                            onChange={(event) => updateForm('landformNotes', event.target.value)}
                                            placeholder="记录砂、水、来去、周边形势或室内外环境"
                                            className="modal-input resize-none"
                                            rows={3}
                                            disabled={isSubmitting}
                                        />
                                    </label>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <label className="modal-field mb-0">
                                        <span className="modal-label">研判结论</span>
                                        <textarea
                                            value={form.analysis}
                                            onChange={(event) => updateForm('analysis', event.target.value)}
                                            placeholder="记录本次勘察与研判结论"
                                            className="modal-input resize-none"
                                            rows={3}
                                            disabled={isSubmitting}
                                        />
                                    </label>
                                    <label className="modal-field mb-0">
                                        <span className="modal-label">后续反馈</span>
                                        <textarea
                                            value={form.feedback}
                                            onChange={(event) => updateForm('feedback', event.target.value)}
                                            placeholder="记录后续验证、调整结果或补充情况"
                                            className="modal-input resize-none"
                                            rows={3}
                                            disabled={isSubmitting}
                                        />
                                    </label>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* 通用错误（保存失败等） */}
                    {error && !titleError && (
                        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </BaseModal>
    );
}
