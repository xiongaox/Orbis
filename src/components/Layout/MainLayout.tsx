import type { ReactNode } from 'react';
import Navbar from './Navbar';
import CaseList from '../Sidebar/CaseList';
import type { Case } from '../../types';

interface MainLayoutProps {
    children: ReactNode;
    onSelectCase: (c: Case) => void;
    selectedCaseId?: string;
    refreshKey?: number;
}

export default function MainLayout({ children, onSelectCase, selectedCaseId, refreshKey }: MainLayoutProps) {
    return (
        <>
            <Navbar />
            <main className="main-container figma-main">
                <CaseList
                    onSelectCase={onSelectCase}
                    selectedCaseId={selectedCaseId}
                    refreshKey={refreshKey}
                />
                {children}
                <aside className="sidebar sidebar-right">
                    {/* Retain Right Sidebar Static Content for now */}
                    <div className="relation-card">
                        <div className="relation-header">
                            <span className="relation-icon">☢</span>
                            <span className="relation-title">天干地支关系</span>
                        </div>
                        {/* ... content ... */}
                    </div>
                </aside>
            </main>
            <footer className="footer">
                <div className="footer-info">
                    <span>© 2024 随心所欲 - 专业八字排盘系统</span>
                </div>
            </footer>
        </>
    );
}
