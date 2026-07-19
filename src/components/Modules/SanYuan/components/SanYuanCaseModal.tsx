import { useEffect, useState } from 'react';
import { ChevronDown, Loader2, Pencil, Plus } from 'lucide-react';
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

function FormSection({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-xl border border-border/70 bg-card/40 p-4">
            <div className="mb-4 flex items-baseline justify-between gap-4">
                <h3 className="text-sm font-medium text-foreground">{title}</h3>
                {description && <p className="text-right text-xs text-muted-foreground">{description}</p>}
            </div>
            {children}
        </section>
    );
}

const SELECT_CONTROL_CLASS = '[&>div:first-child]:h-11 [&>div:first-child]:px-3 [&>div:first-child]:py-0';

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

    useEffect(() => {
        if (isOpen) {
            setForm(createFormState(chartInput, initialCase));
            setError(null);
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

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);

        if (!form.title.trim()) {
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

    const footer = (
        <div className="flex w-full justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="modal-btn focus-ring">
                取消
            </button>
            <button type="submit" form="sanyuan-case-form" disabled={isSubmitting} className="modal-btn primary flex items-center gap-2 focus-ring">
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {initialCase ? '保存修改' : '保存案例'}
            </button>
        </div>
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={initialCase ? '编辑三元案例' : '新建三元案例'}
            titleIcon={initialCase ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            footer={footer}
            maxWidth="max-w-3xl"
            bodyClassName="p-5 sm:p-6"
        >
            <form id="sanyuan-case-form" onSubmit={handleSubmit} className="space-y-4">
                <FormSection title="基本信息">
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
                        <label className="modal-field">
                            <span className="modal-label">案例名称 *</span>
                            <input
                                value={form.title}
                                onChange={(event) => updateForm('title', event.target.value)}
                                placeholder="例如：自宅九运勘察"
                                className="modal-input"
                                disabled={isSubmitting}
                            />
                        </label>
                        <div className="modal-field">
                            <span className="modal-label">宅类 *</span>
                            <div className="grid grid-cols-2 gap-2">
                                {SANYUAN_CASE_TYPES.map((type) => (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => updateForm('caseType', type.id)}
                                        disabled={isSubmitting}
                                        className={`h-12 rounded-lg border px-3 text-sm transition-colors focus-ring ${form.caseType === type.id
                                            ? 'border-primary/40 bg-primary/10 text-primary'
                                            : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
                                            }`}
                                    >
                                        {type.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <label className="modal-field mb-0 mt-4">
                        <span className="modal-label">地点 / 项目别名</span>
                        <input
                            value={form.locationLabel}
                            onChange={(event) => updateForm('locationLabel', event.target.value)}
                            placeholder="可选，例如：城南自宅、祖坟 A 地"
                            className="modal-input"
                            disabled={isSubmitting}
                        />
                    </label>
                </FormSection>

                <FormSection title="排盘参数" description="保存后可从案例库恢复此盘">
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1.45fr)_minmax(5.5rem,.7fr)_minmax(5.5rem,.7fr)_minmax(0,1fr)]">
                        <div className="modal-field">
                            <span className="modal-label">山向 *</span>
                            <CustomSelect
                                options={DIRECTIONS.map(({ id, label }) => ({ value: id, label }))}
                                value={form.directionId}
                                onChange={(value) => updateForm('directionId', value as string)}
                                className={SELECT_CONTROL_CLASS}
                            />
                        </div>
                        <div className="modal-field">
                            <span className="modal-label">元运 *</span>
                            <CustomSelect
                                options={YUN_OPTIONS}
                                value={form.yun}
                                onChange={(value) => handleYunChange(value as number)}
                                className={SELECT_CONTROL_CLASS}
                            />
                        </div>
                        <div className="modal-field">
                            <span className="modal-label">元期</span>
                            {isYuanPhaseChoiceRequired(form.yun) ? (
                                <CustomSelect
                                    options={YUAN_PHASE_OPTIONS}
                                    value={form.yuanPhase}
                                    onChange={(value) => updateForm('yuanPhase', value as YuanPhase)}
                                    className={SELECT_CONTROL_CLASS}
                                />
                            ) : (
                                <span className="inline-flex h-11 w-full items-center rounded-lg border border-border bg-background/80 px-3 text-sm text-muted-foreground">
                                    {form.yuanPhase === 'upper' ? '上元' : '下元'}
                                </span>
                            )}
                        </div>
                        <div className="modal-field">
                            <span className="modal-label">卦类 *</span>
                            <CustomSelect
                                options={PAN_TYPE_OPTIONS}
                                value={form.panType}
                                onChange={(value) => updateForm('panType', value as PanType)}
                                className={SELECT_CONTROL_CLASS}
                            />
                        </div>
                    </div>
                </FormSection>

                <details open className="group rounded-xl border border-border/70 bg-card/40">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 focus-ring [&::-webkit-details-marker]:hidden">
                        <span>
                            <span className="text-sm font-medium text-foreground">现场记录</span>
                            <span className="ml-2 text-xs text-muted-foreground">可选 · 便于回看实际环境</span>
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                    </summary>
                    <div className="grid gap-4 border-t border-border/60 px-4 pb-4 pt-4 sm:grid-cols-2">
                        <label className="modal-field">
                            <span className="modal-label">主要用途与气口</span>
                            <textarea
                                value={form.siteUsage}
                                onChange={(event) => updateForm('siteUsage', event.target.value)}
                                placeholder="例如：大门、床位、灶位、水景及长期活动区域"
                                className="modal-input resize-y"
                                rows={4}
                                disabled={isSubmitting}
                            />
                        </label>
                        <label className="modal-field">
                            <span className="modal-label">峦头记录</span>
                            <textarea
                                value={form.landformNotes}
                                onChange={(event) => updateForm('landformNotes', event.target.value)}
                                placeholder="记录砂、水、来去、周边形势或室内外环境"
                                className="modal-input resize-y"
                                rows={4}
                                disabled={isSubmitting}
                            />
                        </label>
                    </div>
                </details>

                <details className="group rounded-xl border border-border/70 bg-card/40">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 focus-ring [&::-webkit-details-marker]:hidden">
                        <span>
                            <span className="text-sm font-medium text-foreground">研判与验证</span>
                            <span className="ml-2 text-xs text-muted-foreground">可选 · 保存结论与后续反馈</span>
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                    </summary>
                    <div className="grid gap-4 border-t border-border/60 px-4 pb-4 pt-4 sm:grid-cols-2">
                        <label className="modal-field">
                            <span className="modal-label">研判结论</span>
                            <textarea
                                value={form.analysis}
                                onChange={(event) => updateForm('analysis', event.target.value)}
                                placeholder="记录本次勘察与研判结论"
                                className="modal-input resize-y"
                                rows={4}
                                disabled={isSubmitting}
                            />
                        </label>
                        <label className="modal-field">
                            <span className="modal-label">后续反馈</span>
                            <textarea
                                value={form.feedback}
                                onChange={(event) => updateForm('feedback', event.target.value)}
                                placeholder="记录后续验证、调整结果或补充情况"
                                className="modal-input resize-y"
                                rows={4}
                                disabled={isSubmitting}
                            />
                        </label>
                    </div>
                </details>

                {error && (
                    <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {error}
                    </div>
                )}
            </form>
        </BaseModal>
    );
}
