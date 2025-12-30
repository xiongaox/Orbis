import { useEffect, useState } from 'react';
import type { Case } from '../../types';
import { caseService } from '../../services/caseService';

interface CaseListProps {
    onSelectCase: (c: Case) => void;
    selectedCaseId?: string;
    refreshKey?: number;
}

export default function CaseList({ onSelectCase, selectedCaseId, refreshKey }: CaseListProps) {
    const [cases, setCases] = useState<Case[]>([]);

    useEffect(() => {
        const fetchCases = async () => {
            const data = await caseService.getCases();
            setCases(data);
            if (data.length > 0 && !selectedCaseId) {
                onSelectCase(data[0]);
            }
        };
        fetchCases();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshKey]);

    return (
        <aside className="sidebar sidebar-left">
            <div className="search-box">
                <input type="text" className="search-input" placeholder="搜索案例..." />
                <span className="search-icon">🔍</span>
            </div>

            <div className="case-list">
                {cases.map((c) => (
                    <div
                        key={c.id}
                        className={`case-item ${selectedCaseId === c.id ? 'active' : ''}`}
                        onClick={() => onSelectCase(c)}
                    >
                        <div className="case-info">
                            <div className="case-header">
                                <span className="case-name">{c.name}</span>
                                <span className={`case-gender ${c.gender}`}>
                                    {c.gender === 'female' ? '女' : '男'}
                                </span>
                            </div>
                            <div className="case-date">阳历：{c.birth_date.split('T')[0]}</div>
                        </div>
                        {/* Mock pillars display for list item - in future align with actual data */}
                        <div className="case-pillars">
                            <span className="pillar earth">戊</span>
                            <span className="pillar water">壬</span>
                            <span className="pillar fire">丙</span>
                            <span className="pillar earth">戊</span>
                        </div>
                    </div>
                ))}
            </div>

            <button className="btn btn-add">
                <span className="icon">+</span> 新增案例
            </button>
        </aside>
    );
}
