
import { useState, useEffect, useMemo } from 'react';
import { Loader2, Calendar as CalendarIcon, Pencil, History } from 'lucide-react';
import type { BaziCase, CaseTag, LifeEvent } from '../../../services/baziCaseService';
import { baziCaseService } from '../../../services/baziCaseService';
import { calculateBazi } from '../../../services/bazi/caseHelper';
import { calculateBazi as calculateFullBazi } from '../../../services/bazi/baziCalculator';
import { BAZI_CASES_CHANGED_EVENT } from '../../../data/caseConstants';
import TagSelector from '../../Common/TagSelector';
import AdvancedDatePicker from '../../Common/AdvancedDatePicker';
import GenderSegment from './components/GenderSegment';
import LifeTimelineModal, { type DaYunLike, type LiuNianLike } from './LifeTimelineModal';

import BaseModal from '../../UI/BaseModal';
import SubPage from '../../UI/SubPage';
import { useLayoutMode } from '../../../hooks/useLayoutMode';

interface EditCaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    caseData: BaziCase;
    onSaved: () => void;
}

export default function EditCaseModal({ isOpen, onClose, caseData, onSaved }: EditCaseModalProps) {
    const [formData, setFormData] = useState<{
        name: string;
        gender: 'male' | 'female';
        birth_date: string;
        tags: CaseTag[];
        notes: string;
        life_events: LifeEvent[];
    }>({ name: '', gender: 'male', birth_date: '', tags: [], notes: '', life_events: [] });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isLifeModalOpen, setIsLifeModalOpen] = useState(false);

    // 移动端检测：与全应用统一走 useLayoutMode
    const { isMobile } = useLayoutMode();

    useEffect(() => {
        if (caseData) {
            setFormData({
                name: caseData.name,
                gender: caseData.gender,
                birth_date: caseData.birth_date,
                tags: caseData.tags || [],
                notes: caseData.notes || '',
                life_events: caseData.life_events || [],
            });
        }
    }, [caseData]);

    // 生平记事的数据源：案例只存了简化排盘（无大运流年），要用完整计算器现算。
    // 只在弹窗真正打开时算——完整排盘会生成数百条流年，不该让编辑弹窗每次都付这个代价
    const lifeTimelineData = useMemo((): { daYun: DaYunLike[]; liuNian: LiuNianLike[] } => {
        if (!isLifeModalOpen || !formData.birth_date) return { daYun: [], liuNian: [] };
        const date = new Date(formData.birth_date);
        if (Number.isNaN(date.getTime())) return { daYun: [], liuNian: [] };
        try {
            const full = calculateFullBazi({
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                day: date.getDate(),
                hour: date.getHours(),
                minute: date.getMinutes(),
                gender: formData.gender,
            });
            return { daYun: full.daYun ?? [], liuNian: full.liuNian ?? [] };
        } catch {
            return { daYun: [], liuNian: [] };
        }
    }, [isLifeModalOpen, formData.birth_date, formData.gender]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!formData.name.trim() || !formData.birth_date) {
            setError('请填写完整信息');
            return;
        }
        setLoading(true);
        try {
            const baziData = calculateBazi(formData.birth_date, formData.gender);
            await baziCaseService.updateCase(caseData.id, {
                name: formData.name.trim(),
                gender: formData.gender,
                birth_date: new Date(formData.birth_date).toISOString(),
                tags: formData.tags,
                notes: formData.notes.trim() || undefined,
                bazi_data: baziData as Record<string, unknown>,
                life_events: formData.life_events.length > 0 ? formData.life_events : undefined,
            });
            window.dispatchEvent(new CustomEvent(BAZI_CASES_CHANGED_EVENT));
            onSaved();
            onClose();
        } catch (error) {
            console.error(error);
            setError('保存失败');
        } finally {
            setLoading(false);
        }
    };

    // footer 左端放生平记事入口（原左侧空白），右侧主操作保持「取消 / 保存」
    const footer = (
        <div className="flex justify-between items-center gap-3 w-full">
            <button
                type="button"
                onClick={() => setIsLifeModalOpen(true)}
                disabled={loading}
                title="记录大运 / 流年上发生的事情"
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors disabled:opacity-50 focus-ring cursor-pointer"
            >
                <History className="w-4 h-4" />
                生平记事
                {formData.life_events.length > 0 && (
                    // 固定宽高才是正圆（用 px 撑宽会变成椭圆）
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary font-mono text-[11px] text-primary-foreground">
                        {formData.life_events.length}
                    </span>
                )}
            </button>
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="modal-btn focus-ring"
                    disabled={loading}
                >
                    取消
                </button>
                <button
                    type="submit"
                    form="edit-case-form"
                    disabled={loading}
                    className="modal-btn primary flex items-center gap-2 focus-ring"
                >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    保存
                </button>
            </div>
        </div>
    );

    // 表单正文：移动端 SubPage 与桌面端 BaseModal 共用
    const formContent = (
        <form id="edit-case-form" onSubmit={handleSubmit}>
                {/* 姓名 */}
                <div className="modal-field">
                    <label className="modal-label">案例名称</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="modal-input focus-ring"
                        placeholder="例如：张三"
                        disabled={loading}
                    />
                </div>

                {/* 性别 */}
                <div className="modal-field">
                    <label className="modal-label">性别</label>
                    <GenderSegment
                        value={formData.gender}
                        onChange={(gender) => setFormData({ ...formData, gender })}
                        disabled={loading}
                    />
                </div>

                {/* 出生日期 */}
                <div className="modal-field">
                    <label className="modal-label">出生日期时间</label>
                    <button
                        type="button"
                        onClick={() => !loading && setIsDatePickerOpen(true)}
                        className="modal-input cursor-pointer flex items-center justify-between group focus-ring text-left w-full"
                    >
                        <span className={formData.birth_date ? 'text-foreground' : 'text-muted-foreground'}>
                            {formData.birth_date
                                ? new Date(formData.birth_date).toLocaleString('zh-CN', {
                                    hour12: false,
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })
                                : '请选择出生日期'
                            }
                        </span>
                        <CalendarIcon className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors" />
                    </button>

                    <AdvancedDatePicker
                        isOpen={isDatePickerOpen}
                        onClose={() => setIsDatePickerOpen(false)}
                        onConfirm={(date) => {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const hour = String(date.getHours()).padStart(2, '0');
                            const minute = String(date.getMinutes()).padStart(2, '0');
                            setFormData({ ...formData, birth_date: `${year}-${month}-${day}T${hour}:${minute}` });
                            setIsDatePickerOpen(false);
                        }}
                        value={formData.birth_date ? new Date(formData.birth_date) : undefined}
                    />
                </div>

                {/* 标签 */}
                <div className="modal-field">
                    <label className="modal-label">标签分类</label>
                    <TagSelector
                        selectedTags={formData.tags}
                        onChange={(tags) => setFormData({ ...formData, tags })}
                        disabled={loading}
                    />
                </div>

                {/* 备注 */}
                <div className="modal-field">
                    <label className="modal-label">备注</label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="可选，添加案例备注..."
                        className="modal-input resize-none focus-ring"
                        rows={3}
                        disabled={loading}
                    />
                </div>

                {error && (
                    <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-4">
                        {error}
                    </div>
                )}
        </form>
    );

    // 移动端：统一二级页面壳（返回手势 + 统一页头）；桌面端：保留居中弹窗
    // 生平记事子弹窗：两套壳下都渲染，由它自己再按端切壳。
    // 条件渲染（而非 isOpen 常驻挂载）：每次打开都是新实例，内部状态自然回到初始值，无需 effect 重置
    const lifeModal = isLifeModalOpen ? (
        <LifeTimelineModal
            onClose={() => setIsLifeModalOpen(false)}
            daYun={lifeTimelineData.daYun}
            liuNian={lifeTimelineData.liuNian}
            events={formData.life_events}
            onChange={(events) => setFormData((prev) => ({ ...prev, life_events: events }))}
        />
    ) : null;

    if (isMobile) {
        return (
            <>
                <SubPage
                    isOpen={isOpen}
                    onClose={onClose}
                    title="编辑案例"
                    bodyClassName="p-4"
                    footer={footer}
                >
                    {formContent}
                </SubPage>
                {lifeModal}
            </>
        );
    }

    return (
        <>
            <BaseModal
                isOpen={isOpen}
                onClose={onClose}
                title="编辑案例"
                titleIcon={<Pencil className="w-5 h-5" />}
                footer={footer}
                maxWidth="max-w-[480px]"
            >
                {formContent}
            </BaseModal>
            {lifeModal}
        </>
    );
}
