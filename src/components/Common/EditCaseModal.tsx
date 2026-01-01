import { useState, useEffect } from 'react';
import type { BaziCase } from '../../services/baziCaseService';
import { baziCaseService } from '../../services/baziCaseService';
import { calculateBazi } from '../../services/bazi/caseHelper';
import { BAZI_CASES_CHANGED_EVENT } from '../../data/caseConstants';

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
    }>({ name: '', gender: 'male', birth_date: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (caseData) {
            const date = new Date(caseData.birth_date);
            const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
            setFormData({
                name: caseData.name,
                gender: caseData.gender,
                birth_date: localDate.toISOString().slice(0, 16),
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
        <div className="modal-backdrop">
            <div className="modal-card">
                <h2 className="modal-title">编辑案例</h2>
                <form onSubmit={handleSubmit}>
                    <div className="modal-field">
                        <label className="modal-label">姓名</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="modal-input"
                            required
                        />
                    </div>
                    <div className="modal-field">
                        <label className="modal-label">性别</label>
                        <select
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' })}
                            className="modal-select"
                        >
                            <option value="male">男</option>
                            <option value="female">女</option>
                        </select>
                    </div>
                    <div className="modal-field">
                        <label className="modal-label">出生日期</label>
                        <input
                            type="datetime-local"
                            value={formData.birth_date}
                            onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                            className="modal-input"
                            required
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
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="modal-btn primary"
                        >
                            {loading ? '保存中...' : '保存'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
