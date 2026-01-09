import { useState, useEffect } from 'react';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import type { BaziCase, CaseTag } from '../../services/baziCaseService';
import { baziCaseService } from '../../services/baziCaseService';
import { calculateBazi } from '../../services/bazi/caseHelper';
import { BAZI_CASES_CHANGED_EVENT } from '../../data/caseConstants';
import TagSelector from './TagSelector';
import AdvancedDatePicker from './AdvancedDatePicker';

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
    }>({ name: '', gender: 'male', birth_date: '', tags: [], notes: '' });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    useEffect(() => {
        if (caseData) {
            // Adjust for local display if needed, or keep ISO string if picker handles it.
            // AdvancedDatePicker expects a Date object or string it can parse.
            // CreateCaseModal stores it as ISO string but displays it localized.
            setFormData({
                name: caseData.name,
                gender: caseData.gender,
                birth_date: caseData.birth_date,
                tags: caseData.tags || [],
                notes: caseData.notes || '',
            });
        }
    }, [caseData]);

    if (!isOpen) return null;

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

    return (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-card" style={{ maxWidth: '480px' }}>
                <h2 className="modal-title">编辑案例</h2>
                <form onSubmit={handleSubmit}>
                    {/* 姓名 */}
                    <div className="modal-field">
                        <label className="modal-label">案例名称</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="modal-input"
                            placeholder="例如：张三"
                            disabled={loading}
                        />
                    </div>

                    {/* 性别 */}
                    <div className="modal-field">
                        <label className="modal-label">性别</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="edit_gender"
                                    value="male"
                                    checked={formData.gender === 'male'}
                                    onChange={() => setFormData({ ...formData, gender: 'male' })}
                                    disabled={loading}
                                    className="w-4 h-4 accent-primary"
                                />
                                <span className="text-sm text-foreground">男</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="edit_gender"
                                    value="female"
                                    checked={formData.gender === 'female'}
                                    onChange={() => setFormData({ ...formData, gender: 'female' })}
                                    disabled={loading}
                                    className="w-4 h-4 accent-primary"
                                />
                                <span className="text-sm text-foreground">女</span>
                            </label>
                        </div>
                    </div>

                    {/* 出生日期 */}
                    <div className="modal-field">
                        <label className="modal-label">出生日期时间</label>
                        <div
                            onClick={() => !loading && setIsDatePickerOpen(true)}
                            className="modal-input cursor-pointer flex items-center justify-between group"
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
                        </div>

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
                            className="modal-input resize-none"
                            rows={3}
                            disabled={loading}
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-4">
                            {error}
                        </div>
                    )}

                    <div className="modal-actions">
                        <button
                            type="button"
                            onClick={onClose}
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
                            保存
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
