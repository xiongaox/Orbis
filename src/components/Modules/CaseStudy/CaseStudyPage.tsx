import { useState, useRef, useEffect, useCallback } from 'react';
import { useLayoutMode } from '../../../hooks/useLayoutMode';
import { useCaseStudy, ALL_CASES } from './hooks/useCaseStudy';
import { isActivationSupported } from '../../../services/publicCaseLibraryService';
import { useReadingProgress } from './hooks/useReadingProgress';
import { useDuanFa } from './hooks/useDuanFa';
import { useCaseStudyBaziData } from './hooks/useCaseStudyBaziData';
import { DUANFA_FILES } from '../../../lib/caseStudy/duanfaData';

import ActivationModal from './ActivationModal';
import JuSelectDialog from './components/JuSelectDialog';
import LearningPanelModal from './components/LearningPanelModal';
import CaseStudyDesktopLayout from './layouts/CaseStudyDesktopLayout';
import CaseStudyPadLayout from './layouts/CaseStudyPadLayout';
import CaseStudyMobileLayout from './layouts/CaseStudyMobileLayout';
import { type CaseStudyLayoutProps } from './layouts/CaseStudyLayoutProps';

export default function CaseStudyPage() {
    const { isPadLandscape, useDesktopLayout } = useLayoutMode();
    const isMobile = !useDesktopLayout && !isPadLandscape;

    // Core state hooks
    const caseStudyState = useCaseStudy();
    const duanFa = useDuanFa();
    // 试读片段不参与排盘：盘面在激活前不对试读条目开放
    const baziData = useCaseStudyBaziData(caseStudyState.isPreviewMode ? null : caseStudyState.activeCase, caseStudyState.activeChartIndex);

    const [isJuDialogOpen, setIsJuDialogOpen] = useState(false);
    const [isLearningPanelOpen, setIsLearningPanelOpen] = useState(false);
    const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);
    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
    const [isChartPanelOpen, setIsChartPanelOpen] = useState(false);

    const openActivation = useCallback(() => setIsActivationModalOpen(true), []);

    // Reading progress refs
    const contentScrollRef = useRef<HTMLDivElement>(null);
    const duanFaContentRef = useRef<HTMLDivElement>(null);

    // Sync progress tracking
    const progressProps = useReadingProgress({
        articleId: caseStudyState.isPreviewMode ? null : caseStudyState.activeCase?.id || null,
        scrollContainerRef: contentScrollRef,
    });

    const duanFaProgressProps = useReadingProgress({
        articleId: duanFa.selectedFileId,
        scrollContainerRef: duanFaContentRef,
        enabled: caseStudyState.selectedCategory === 'duanfa' && isMobile,
    });

    useEffect(() => {
        if (caseStudyState.activeCase?.id && contentScrollRef.current) {
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
        useDesktopLayout, isPadLandscape, isMobile,
        ...caseStudyState,
        openActivation,
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

            {isActivationModalOpen && caseStudyState.activationState === 'locked' && (
                <ActivationModal
                    machineId={caseStudyState.machineId}
                    isActivating={caseStudyState.isActivating}
                    progress={caseStudyState.activationProgress}
                    error={caseStudyState.activationError}
                    onActivate={caseStudyState.activate}
                    onActivateWithMasterPassword={caseStudyState.activateWithMasterPassword}
                    onClose={() => setIsActivationModalOpen(false)}
                    canActivate={isActivationSupported()}
                />
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
