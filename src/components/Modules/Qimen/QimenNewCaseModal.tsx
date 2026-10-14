import { useEffect, useState } from 'react';
import { Calendar, Loader2, Plus, Pencil } from 'lucide-react';
import BaseModal from '../../UI/BaseModal';
import SubPage from '../../UI/SubPage';
import { useLayoutMode } from '../../../hooks/useLayoutMode';
import AdvancedDatePicker from '../../Common/AdvancedDatePicker';
import { qimenCaseService, type CreateQimenCaseInput, type UpdateQimenCaseInput, type QimenCategory, type QimenCase } from '../../../services/qimenCaseService';
import type { PaiPanMethod } from '../../../lib/csp-qimen/qimenService';

// 奇门案例分类（复用 CaseList 的定义，或统一定义）
const CATEGORIES = [
    { id: 'work', name: '工作事业' },
    { id: 'study', name: '求学考试' },
    { id: 'love', name: '恋爱婚姻' },
    { id: 'wealth', name: '生意财运' },
    { id: 'lost', name: '失物失人' },
    { id: 'travel', name: '出行出国' },
    { id: 'health', name: '疾病身体' },
    { id: 'other', name: '其他杂项' },
];

interface QimenNewCaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: {
        title: string;
        date: Date;
        category: string;
        description: string;
        feedback?: string;
        analysis?: string;
    }) => void;
    initialData?: QimenCase | null; // Added prop for edit mode
    /** 「立即排盘」：用当前表单时间直接排盘。只有奇门主页有排盘上下文，案例库弹窗不传 */
    onPreview?: (date: Date) => void;
    /** 当前页面的排盘方式，随案例一起保存（列表「盘式」标签的数据来源） */
    paiPanMethod?: PaiPanMethod;
}

export default function QimenNewCaseModal({ isOpen, onClose, onConfirm, initialData, paiPanMethod, onPreview }: QimenNewCaseModalProps) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [date, setDate] = useState<Date>(initialData ? new Date(initialData.test_date) : new Date());
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    const [category, setCategory] = useState<QimenCategory>(initialData?.category || 'work');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 移动端检测：与全应用统一走 useLayoutMode
    const { isMobile } = useLayoutMode();

    // 编辑目标切换时重建表单（列表页编辑弹窗常驻挂载，仅靠 initialData 变化无法自更新）
    useEffect(() => {
        if (!isOpen) return;
        setTitle(initialData?.title || '');
        setDate(initialData ? new Date(initialData.test_date) : new Date());
        setCategory(initialData?.category || 'work');
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!title.trim()) {
            // 简单校验
            alert('请输入案例名称');
            return;
        }

        try {
            setIsSubmitting(true);
            // If initialData exists, UPDATE; else CREATE
            if (initialData) {
                // 正文（描述/反馈/断法）不在这里维护，更新时原样保留
                const updateInput: UpdateQimenCaseInput = {
                    title,
                    test_date: date.toISOString(),
                    category,
                    ...(paiPanMethod ? { pai_pan_method: paiPanMethod } : {}),
                };
                await qimenCaseService.updateCase(initialData.id, updateInput);
            } else {
                // 新建即把标题作为正文首句（提问）：案例详情首行自动带上题目，
                // 不必再逐个手填；后续在详情里追加的问答会接在它后面
                const createInput: CreateQimenCaseInput = {
                    title,
                    test_date: date.toISOString(),
                    category,
                    description: title.trim(),
                    ...(paiPanMethod ? { pai_pan_method: paiPanMethod } : {}),
                };
                await qimenCaseService.createCase(createInput);
            }

            onConfirm({
                title,
                date,
                category,
                description: initialData?.description || '',
                feedback: initialData?.feedback || '',
                analysis: initialData?.analysis || '',
            });
        } catch (e) {
            console.error(e);
            alert('操作失败');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 底部三按钮：与八字新建弹窗同构（左「立即排盘」/ 右「取消 + 保存」）。
    // 正文不在这里录：建好后从案例区摘要卡进入「案例详情」弹窗，边看盘边记问答
    const footer = (
        <div className="flex items-center justify-between w-full">
            <div>
                {onPreview && (
                    <button
                        type="button"
                        onClick={() => onPreview(date)}
                        disabled={isSubmitting}
                        className="modal-btn hover:bg-primary/5 hover:border-primary/50 hover:text-primary transition-colors text-primary border-primary/30 focus-ring"
                    >
                        立即排盘
                    </button>
                )}
            </div>

            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="modal-btn focus-ring"
                >
                    取消
                </button>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="modal-btn primary flex items-center gap-2 focus-ring"
                >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {initialData ? '保存' : '保存到案例库'}
                </button>
            </div>
        </div>
    );

    // 表单正文：移动端 SubPage 与桌面端 BaseModal 共用
    const formContent = (
        <>
            <div className="space-y-5">
                {/* 案例名称 */}
                <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">
                        案例名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="例如：张三问事业"
                        className="w-full px-3 py-2 bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50 focus-ring"
                    />
                </div>

                {/* 求测时间 */}
                <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">
                        求测时间 <span className="text-red-500">*</span>
                    </label>
                    <button
                        type="button"
                        onClick={() => setIsDatePickerOpen(true)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 border border-border rounded-lg text-foreground hover:border-primary/50 transition-all group focus-ring"
                    >
                        <span className="font-mono tracking-wide">
                            {date.getFullYear()}/{String(date.getMonth() + 1).padStart(2, '0')}/{String(date.getDate()).padStart(2, '0')} {String(date.getHours()).padStart(2, '0')}:{String(date.getMinutes()).padStart(2, '0')}
                        </span>
                        <Calendar className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                </div>

                {/* 标签分类 */}
                <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">
                        标签分类
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setCategory(cat.id as QimenCategory)}
                                className={`grow whitespace-nowrap text-center px-3 py-1 text-xs rounded-md border transition-all focus-ring ${category === cat.id
                                    ? 'bg-primary/20 border-primary text-primary'
                                    : 'bg-muted/30 border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                                    }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 时间选择器 */}
            <AdvancedDatePicker
                isOpen={isDatePickerOpen}
                value={date}
                onClose={() => setIsDatePickerOpen(false)}
                onConfirm={(d) => {
                    setDate(d);
                    setIsDatePickerOpen(false);
                }}
            />
        </>
    );

    // 移动端：统一二级页面壳（返回手势 + 统一页头）；桌面端：保留居中弹窗
    if (isMobile) {
        return (
            <SubPage
                isOpen={isOpen}
                onClose={onClose}
                title={initialData ? '编辑案例' : '新建案例'}
                bodyClassName="p-4"
                footer={footer}
            >
                {formContent}
            </SubPage>
        );
    }

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? '编辑案例' : '新建案例'}
            titleIcon={initialData ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            footer={footer}
            maxWidth="max-w-md"
        >
            {formContent}
        </BaseModal>
    );
}
