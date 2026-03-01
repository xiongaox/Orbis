/**
 * QimenNewCaseModal - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：承载具体业务模块的前端功能
 *
 * 关键职责：
 * - 渲染 UI 视图并处理交互逻辑
 * - 处理用户输入与展示边界行为
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `default QimenNewCaseModal`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、外部依赖 `lucide-react`、内部模块 `BaseModal` 等 5 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { useState } from 'react';
import { Calendar, Loader2, Plus, Pencil } from 'lucide-react';
import BaseModal from '../../UI/BaseModal';
import AdvancedDatePicker from '../../Common/AdvancedDatePicker';
import { qimenCaseService, type CreateQimenCaseInput, type UpdateQimenCaseInput, type QimenCategory, type QimenCase } from '../../../services/qimenCaseService';

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
}

export default function QimenNewCaseModal({ isOpen, onClose, onConfirm, initialData }: QimenNewCaseModalProps) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [date, setDate] = useState<Date>(initialData ? new Date(initialData.test_date) : new Date());
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    const [category, setCategory] = useState<QimenCategory>(initialData?.category || 'work');
    const [description, setDescription] = useState(initialData?.description || '');
    const [feedback, setFeedback] = useState(initialData?.feedback || '');
    const [analysis, setAnalysis] = useState(initialData?.analysis || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

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
                const updateInput: UpdateQimenCaseInput = {
                    title,
                    test_date: date.toISOString(),
                    category,
                    description,
                    feedback,
                    analysis,
                };
                await qimenCaseService.updateCase(initialData.id, updateInput);
            } else {
                const createInput: CreateQimenCaseInput = {
                    title,
                    test_date: date.toISOString(),
                    category,
                    description,
                    feedback,
                    analysis,
                };
                await qimenCaseService.createCase(createInput);
            }

            onConfirm({
                title,
                date,
                category,
                description: description || '',
                feedback: feedback || '',
                analysis: analysis || '',
            });
        } catch (e) {
            console.error(e);
            alert('操作失败');
        } finally {
            setIsSubmitting(false);
        }
    };

    const footer = (
        <div className="flex justify-end gap-3 w-full">
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
                {initialData ? '保存' : '创建'}
            </button>
        </div>
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? '编辑案例' : '新建案例'}
            titleIcon={initialData ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            footer={footer}
            maxWidth="max-w-md"
        >
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
                    {/* DatePicker Portal/Z-Index handling needed if BaseModal has high z-index. 
                        AdvancedDatePicker typically uses Portal. If not, it might be behind.
                        Assuming AdvancedDatePicker uses a Portal with higher Z. */}
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
                                className={`px-3 py-1 text-xs rounded-md border transition-all focus-ring ${category === cat.id
                                    ? 'bg-primary/20 border-primary text-primary'
                                    : 'bg-muted/30 border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                                    }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 事情描述 */}
                <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">
                        事情描述
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="可选，添加案例背景、起因等..."
                        rows={2}
                        className="w-full px-3 py-2 bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50 resize-none focus-ring"
                    />
                </div>

                {/* 事件反馈 */}
                <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">
                        事件反馈
                    </label>
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="可选，添加反馈结果..."
                        rows={2}
                        className="w-full px-3 py-2 bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50 resize-none focus-ring"
                    />
                </div>

                {/* 案例断法 */}
                <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">
                        案例断法
                    </label>
                    <textarea
                        value={analysis}
                        onChange={(e) => setAnalysis(e.target.value)}
                        placeholder="可选，记录断卦思路..."
                        rows={4}
                        className="w-full px-3 py-2 bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50 resize-none focus-ring"
                    />
                </div>
            </div>

            {/* 时间选择器 - Must be outside BaseModal content flow if it's a portal, or inside if it's inline. 
                Assuming AdvancedDatePicker renders a Modal. */}
            <AdvancedDatePicker
                isOpen={isDatePickerOpen}
                value={date}
                onClose={() => setIsDatePickerOpen(false)}
                onConfirm={(d) => {
                    setDate(d);
                    setIsDatePickerOpen(false);
                }}
            />
        </BaseModal>
    );
}
