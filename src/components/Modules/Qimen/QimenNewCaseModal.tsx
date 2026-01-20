/**
 * 奇门遁甲 - 新建案例弹窗
 * 包含字段：案例名称、求测时间、标签分类、事情描述、事件反馈、案例断法
 */
import { useState } from 'react';
import { X, Calendar, Loader2 } from 'lucide-react';
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

    return (
        <div className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl animate-in zoom-in-95 duration-200">
                {/* 标题栏 */}
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                    <h2 className="text-lg font-medium text-foreground font-display">
                        {initialData ? '编辑案例' : '新建案例'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 表单内容 */}
                <div className="p-6 space-y-5">

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
                            className="w-full px-3 py-2 bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
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
                            className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 border border-border rounded-lg text-foreground hover:border-primary/50 transition-all group"
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
                                    className={`px-3 py-1 text-xs rounded-md border transition-all ${category === cat.id
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
                            className="w-full px-3 py-2 bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50 resize-none"
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
                            className="w-full px-3 py-2 bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50 resize-none"
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
                            className="w-full px-3 py-2 bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50 resize-none"
                        />
                    </div>
                </div>

                {/* 底部按钮 */}
                <div className="p-4 border-t border-border/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-6 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {initialData ? '保存' : '创建'}
                    </button>
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
        </div>
    );
}
