/**
 * 新建案例 Modal
 * 包含姓名、性别、出生日期、标签、备注
 */
import { useState } from 'react';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import TagSelector from './TagSelector';
import AdvancedDatePicker from './AdvancedDatePicker';
import { baziCaseService, type CaseTag, type CreateCaseInput } from '../../services/baziCaseService';
import { calculateBazi } from '../../services/bazi/caseHelper';

interface CreateCaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export default function CreateCaseModal({ isOpen, onClose, onCreated }: CreateCaseModalProps) {
    const [name, setName] = useState('');
    const [gender, setGender] = useState<'male' | 'female'>('male');
    const [birthDate, setBirthDate] = useState('');
    const [tags, setTags] = useState<CaseTag[]>([]);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // 验证
        if (!name.trim()) {
            setError('请输入案例名称');
            return;
        }

        if (!birthDate) {
            setError('请选择出生日期');
            return;
        }

        setLoading(true);

        try {
            // 计算八字数据
            const baziData = calculateBazi(birthDate, gender);

            const input: CreateCaseInput = {
                name: name.trim(),
                gender,
                birth_date: new Date(birthDate).toISOString(),
                tags,
                notes: notes.trim() || undefined,
                bazi_data: baziData as Record<string, unknown>,
            };

            await baziCaseService.createCase(input);

            // 重置表单
            resetForm();
            onCreated();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : '创建失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setName('');
        setGender('male');
        setBirthDate('');
        setTags([]);
        setNotes('');
        setError(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && handleClose()}>
            <div className="modal-card" style={{ maxWidth: '480px' }}>
                <h2 className="modal-title">新建案例</h2>

                <form onSubmit={handleSubmit}>
                    {/* 姓名 */}
                    <div className="modal-field">
                        <label className="modal-label">案例名称 *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="例如：张三"
                            className="modal-input"
                            disabled={loading}
                        />
                    </div>

                    {/* 性别 */}
                    <div className="modal-field">
                        <label className="modal-label">性别 *</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="gender"
                                    value="male"
                                    checked={gender === 'male'}
                                    onChange={() => setGender('male')}
                                    disabled={loading}
                                    className="w-4 h-4 accent-primary"
                                />
                                <span className="text-sm text-foreground">男</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="gender"
                                    value="female"
                                    checked={gender === 'female'}
                                    onChange={() => setGender('female')}
                                    disabled={loading}
                                    className="w-4 h-4 accent-primary"
                                />
                                <span className="text-sm text-foreground">女</span>
                            </label>
                        </div>
                    </div>

                    {/* 出生日期 */}
                    <div className="modal-field">
                        <label className="modal-label">出生日期时间 *</label>
                        <div
                            onClick={() => !loading && setIsDatePickerOpen(true)}
                            className="modal-input cursor-pointer flex items-center justify-between group"
                        >
                            <span className={birthDate ? 'text-foreground' : 'text-muted-foreground'}>
                                {birthDate ? new Date(birthDate).toLocaleString('zh-CN', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '请选择出生日期'}
                            </span>
                            <CalendarIcon className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors" />
                        </div>

                        <AdvancedDatePicker
                            isOpen={isDatePickerOpen}
                            onClose={() => setIsDatePickerOpen(false)}
                            onConfirm={(date) => {
                                // Convert to local ISO string (keeping local time)
                                // Standard toISOString() converts to UTC, which might shift the day.
                                // We want to preserve the selected "wall clock" time.
                                // Simple trick: construct ISO manually or offset.
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                const hour = String(date.getHours()).padStart(2, '0');
                                const minute = String(date.getMinutes()).padStart(2, '0');
                                setBirthDate(`${year}-${month}-${day}T${hour}:${minute}`);
                                setIsDatePickerOpen(false);
                            }}
                            value={birthDate ? new Date(birthDate) : undefined}
                        />
                    </div>

                    {/* 标签 */}
                    <div className="modal-field">
                        <label className="modal-label">标签分类</label>
                        <TagSelector
                            selectedTags={tags}
                            onChange={setTags}
                            disabled={loading}
                        />
                    </div>

                    {/* 备注 */}
                    <div className="modal-field">
                        <label className="modal-label">备注</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="可选，添加案例备注..."
                            className="modal-input resize-none"
                            rows={3}
                            disabled={loading}
                        />
                    </div>

                    {/* 错误提示 */}
                    {error && (
                        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg px-3 py-2 mb-4">
                            {error}
                        </div>
                    )}

                    {/* 按钮 */}
                    <div className="modal-actions">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="modal-btn"
                            disabled={loading}
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="modal-btn primary flex items-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            创建
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
