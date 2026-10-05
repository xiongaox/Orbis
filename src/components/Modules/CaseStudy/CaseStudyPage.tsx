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

export interface CaseStudyCategoryIntent {
    /** 目标分类 id（见 lib/caseStudy/constants CATEGORIES，如 'duanfa'） */
    category: string;
    /** 递增序号：外部重复触发同一分类时也能再次生效 */
    seq: number;
}

interface CaseStudyPageProps {
    /** 外部入口（移动端个人中心「案例 / 断法」）指定的分类；seq 变化时应用 */
    categoryIntent?: CaseStudyCategoryIntent | null;
}

export default function CaseStudyPage({ categoryIntent }: CaseStudyPageProps) {
    const { isPadLandscape, useDesktopLayout } = useLayoutMode();
    const isMobile = !useDesktopLayout && !isPadLandscape;

    // Core state hooks
    const caseStudyState = useCaseStudy();
    const { setSelectedCategory } = caseStudyState;
    const duanFa = useDuanFa();
    // 试读片段不参与排盘：盘面在激活前不对试读条目开放
    const baziData = useCaseStudyBaziData(caseStudyState.isPreviewMode ? null : caseStudyState.activeCase, caseStudyState.activeChartIndex);

    const [isJuDialogOpen, setIsJuDialogOpen] = useState(false);
    const [isLearningPanelOpen, setIsLearningPanelOpen] = useState(false);
    const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);
    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
    const [isChartPanelOpen, setIsChartPanelOpen] = useState(false);

    const openActivation = useCallback(() => setIsActivationModalOpen(true), []);

    // 应用外部分类直达意图（移动端个人中心「案例 / 断法」入口）：按 seq 去重，重复触发同一分类仍可再次生效
    const appliedIntentSeqRef = useRef(0);
    useEffect(() => {
        if (!categoryIntent || categoryIntent.seq === appliedIntentSeqRef.current) return;
        appliedIntentSeqRef.current = categoryIntent.seq;
        setSelectedCategory(categoryIntent.category);
    }, [categoryIntent, setSelectedCategory]);

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
