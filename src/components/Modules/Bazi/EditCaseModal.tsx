import { useState, useEffect } from 'react';
import { Loader2, Calendar as CalendarIcon, Pencil } from 'lucide-react';
import type { BaziCase, CaseTag } from '../../../services/baziCaseService';
import { baziCaseService } from '../../../services/baziCaseService';
import { calculateBazi } from '../../../services/bazi/caseHelper';
import { BAZI_CASES_CHANGED_EVENT } from '../../../data/caseConstants';
import TagSelector from '../../Common/TagSelector';
import AdvancedDatePicker from '../../Common/AdvancedDatePicker';

import BaseModal from '../../UI/BaseModal';

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
            setFormData({
                name: caseData.name,
                gender: caseData.gender,
                birth_date: caseData.birth_date,
                tags: caseData.tags || [],
                notes: caseData.notes || '',
            });
        }
    }, [caseData]);

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

    const footer = (
        <div className="flex justify-end gap-3 w-full">
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
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="编辑案例"
            titleIcon={<Pencil className="w-5 h-5" />}
            footer={footer}
            maxWidth="max-w-[480px]"
        >
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
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="radio"
                                name="edit_gender"
                                value="male"
                                checked={formData.gender === 'male'}
                                onChange={() => setFormData({ ...formData, gender: 'male' })}
                                disabled={loading}
                                className="w-4 h-4 accent-primary focus-ring"
                            />
                            <span className="text-sm text-foreground group-hover:text-primary transition-colors">男</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="radio"
                                name="edit_gender"
                                value="female"
                                checked={formData.gender === 'female'}
                                onChange={() => setFormData({ ...formData, gender: 'female' })}
                                disabled={loading}
                                className="w-4 h-4 accent-primary focus-ring"
                            />
                            <span className="text-sm text-foreground group-hover:text-primary transition-colors">女</span>
                        </label>
                    </div>
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
        </BaseModal>
    );
}
