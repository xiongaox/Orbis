import { useState, useEffect } from 'react';
import type { Case } from '../../types';
import { caseService } from '../../services/caseService';

interface EditCaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    caseData: Case;
    onSaved: () => void;
}

export default function EditCaseModal({ isOpen, onClose, caseData, onSaved }: EditCaseModalProps) {
    const [formData, setFormData] = useState<Partial<Case>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (caseData) {
            setFormData({
                name: caseData.name,
                gender: caseData.gender,
                birth_date: caseData.birth_date.split('T')[0], // Extract YYYY-MM-DD
            });
        }
    }, [caseData]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await caseService.updateCase({
                ...caseData,
                ...formData,
                birth_date: new Date(formData.birth_date!).toISOString(), // Ensure ISO format
            } as Case);
            onSaved();
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to save');
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
                            value={formData.name || ''}
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
                            value={formData.birth_date || ''}
                            onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                            className="modal-input"
                            required
                        />
                    </div>
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
