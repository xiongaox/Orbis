/**
 * CaseStudy 页面 - 极致解耦重构版
 * 状态逻辑提取至 useCaseStudy 和 useCaseStudyBaziData，
 * UI 布局彻底分离为 Desktop/Pad/Mobile 三端布局组件。
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useLayoutMode } from '../../../hooks/useLayoutMode';
import { useAuth } from '../../../contexts/AuthContext';
import { useCaseStudy, ALL_CASES } from './hooks/useCaseStudy';
import { useReadingProgress } from './hooks/useReadingProgress';
import { useDuanFa } from './hooks/useDuanFa';
import { useCaseStudyBaziData } from './hooks/useCaseStudyBaziData';
import { DUANFA_FILES } from '../../../lib/caseStudy/duanfaData';

import JuSelectDialog from './components/JuSelectDialog';
import LearningPanelModal from './components/LearningPanelModal';
import CaseStudyDesktopLayout from './layouts/CaseStudyDesktopLayout';
import CaseStudyPadLayout from './layouts/CaseStudyPadLayout';
import CaseStudyMobileLayout from './layouts/CaseStudyMobileLayout';
import { type CaseStudyLayoutProps } from './layouts/CaseStudyLayoutProps';

export default function CaseStudyPage() {
    const { isPadLandscape, useDesktopLayout } = useLayoutMode();
    const isMobile = !useDesktopLayout && !isPadLandscape;
    const { isAuthenticated } = useAuth();

    // Core state hooks
    const caseStudyState = useCaseStudy();
    const duanFa = useDuanFa();
    const baziData = useCaseStudyBaziData(caseStudyState.activeCase, caseStudyState.activeChartIndex);

    const [isJuDialogOpen, setIsJuDialogOpen] = useState(false);
    const [isLearningPanelOpen, setIsLearningPanelOpen] = useState(false);
    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
    const [isChartPanelOpen, setIsChartPanelOpen] = useState(false);

    // Reading progress refs
    const contentScrollRef = useRef<HTMLDivElement>(null);
    const duanFaContentRef = useRef<HTMLDivElement>(null);

    // Sync progress tracking
    const progressProps = useReadingProgress({
        articleId: caseStudyState.activeCase?.id || null,
        scrollContainerRef: contentScrollRef,
        enabled: isAuthenticated,
    });

    const duanFaProgressProps = useReadingProgress({
        articleId: duanFa.selectedFileId,
        scrollContainerRef: duanFaContentRef,
        enabled: isAuthenticated && caseStudyState.selectedCategory === 'duanfa' && isMobile,
    });

    useEffect(() => {
        if (caseStudyState.activeCase && contentScrollRef.current) {
            contentScrollRef.current.scrollTo({ top: 0 });
        }
    }, [caseStudyState.activeCase?.id]);

    const getArticleInfo = useCallback((articleId: string): { title: string; author: string } => {
        const caseItem = ALL_CASES.find(c => c.id === articleId);
        if (caseItem) return { title: caseItem.title, author: caseItem.author };
        const duanFaFile = DUANFA_FILES.find(f => f.id === articleId);
        if (duanFaFile) return { title: duanFaFile.name, author: '断法' };
        return { title: '未知标题', author: '未知作者' };
    }, []);

    const layoutProps: CaseStudyLayoutProps = {
        useDesktopLayout, isPadLandscape, isMobile, isAuthenticated,
        ...caseStudyState,
        baziData,
        duanFa,
        isLeftPanelOpen, setIsLeftPanelOpen,
        isChartPanelOpen, setIsChartPanelOpen,
        setIsJuDialogOpen, setIsLearningPanelOpen,
        contentScrollRef, duanFaContentRef,
        savedProgress: progressProps.savedProgress,
        currentProgress: progressProps.currentProgress,
        restoreProgress: progressProps.restoreProgress,
        duanFaSavedProgress: duanFaProgressProps.savedProgress,
        duanFaCurrentProgress: duanFaProgressProps.currentProgress,
        duanFaRestoreProgress: duanFaProgressProps.restoreProgress,
    };

    return (
        <div className="flex w-full h-full overflow-hidden bg-background relative">
            {useDesktopLayout ? (
                <CaseStudyDesktopLayout {...layoutProps} />
            ) : isPadLandscape ? (
                <CaseStudyPadLayout {...layoutProps} />
            ) : (
                <CaseStudyMobileLayout {...layoutProps} />
            )}

            <JuSelectDialog
                isOpen={isJuDialogOpen}
                onClose={() => setIsJuDialogOpen(false)}
                currentJu={caseStudyState.customJu}
                onSelectJu={caseStudyState.setCustomJu}
            />

            <LearningPanelModal
                isOpen={isLearningPanelOpen}
                onClose={() => setIsLearningPanelOpen(false)}
                onSelectArticle={caseStudyState.handleSelectCase}
                getArticleInfo={getArticleInfo}
            />
        </div>
    );
}
