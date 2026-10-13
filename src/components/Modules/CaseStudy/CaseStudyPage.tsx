import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLayoutMode } from '../../../hooks/useLayoutMode';
import { useCaseStudy, ALL_CASES } from './hooks/useCaseStudy';
import { isActivationSupported } from '../../../services/publicCaseLibraryService';
import { useReadingProgress } from './hooks/useReadingProgress';
import { useDuanFa } from './hooks/useDuanFa';
import { useCaseStudyBaziData } from './hooks/useCaseStudyBaziData';
import { DUANFA_FILES } from '../../../lib/caseStudy/duanfaData';
import type { CaseStudyLockedSnapshot } from '../../../lib/lockedChartStorage';

import ActivationModal from './ActivationModal';
import CustomJuModal from '../Qimen/components/CustomJuModal';
import LearningPanelModal from './components/LearningPanelModal';
import CaseStudyDesktopLayout from './layouts/CaseStudyDesktopLayout';
import CaseStudyPadLayout from './layouts/CaseStudyPadLayout';
import CaseStudyMobileLayout from './layouts/CaseStudyMobileLayout';
import { type CaseStudyLayoutProps } from './layouts/CaseStudyLayoutProps';
import ConfirmModal from '../../Common/ConfirmModal';
import Toast from '../../Common/Toast';
import { useToast } from '../../../hooks/useToast';

export interface CaseStudyCategoryIntent {
    /** 目标分类 id（见 lib/caseStudy/constants CATEGORIES，如 'duanfa'） */
    category: string;
    /** 递增序号：外部重复触发同一分类时也能再次生效 */
    seq: number;
}

interface CaseStudyPageProps {
    /** 外部入口（移动端个人中心「案例 / 断法」）指定的分类；seq 变化时应用 */
    categoryIntent?: CaseStudyCategoryIntent | null;
    /** 模块锁定恢复快照（切走再回来 / 重启后回到原文章） */
    lockedSnapshot?: CaseStudyLockedSnapshot;
    /** 上报实时导航态，供锁定瞬间捕获快照 */
    onSnapshotChange?: (snapshot: CaseStudyLockedSnapshot) => void;
}

export default function CaseStudyPage({ categoryIntent, lockedSnapshot, onSnapshotChange }: CaseStudyPageProps) {
    const { isPadLandscape, useDesktopLayout } = useLayoutMode();
    const isMobile = !useDesktopLayout && !isPadLandscape;

    // Core state hooks
    const caseStudyState = useCaseStudy(lockedSnapshot);
    const { setSelectedCategory } = caseStudyState;
    const duanFa = useDuanFa(lockedSnapshot?.duanFaFileId);
    // 试读片段不参与排盘：盘面在激活前不对试读条目开放
    const baziData = useCaseStudyBaziData(caseStudyState.isPreviewMode ? null : caseStudyState.activeCase, caseStudyState.activeChartIndex);

    const [isJuDialogOpen, setIsJuDialogOpen] = useState(false);
    const [isLearningPanelOpen, setIsLearningPanelOpen] = useState(false);
    const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);
    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
    const [isChartPanelOpen, setIsChartPanelOpen] = useState(false);

    const openActivation = useCallback(() => setIsActivationModalOpen(true), []);

    // 锁定时捕获的导航态（分类 / 当前文章 / 列表页码 / 断法选中文件）；
    // 正文与排盘结果不入快照，按需重新加载
    const liveSnapshot = useMemo((): CaseStudyLockedSnapshot => ({
        version: 1,
        capturedAt: new Date().toISOString(),
        selectedCategory: caseStudyState.selectedCategory,
        selectedCaseId: caseStudyState.selectedCaseId,
        currentPage: caseStudyState.currentPage,
        duanFaFileId: duanFa.selectedFileId,
    }), [
        caseStudyState.selectedCategory,
        caseStudyState.selectedCaseId,
        caseStudyState.currentPage,
        duanFa.selectedFileId,
    ]);

    useEffect(() => {
        onSnapshotChange?.(liveSnapshot);
    }, [liveSnapshot, onSnapshotChange]);

    // 移除激活：破坏性操作，必须二次确认后再清空本地案例库
    const { toast, showToast } = useToast();
    const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
    const { removeActivation, isRemoving } = caseStudyState;
    const confirmRemoveActivation = () => {
        void removeActivation().then(() => {
            setIsRemoveConfirmOpen(false);
            showToast('已移除激活，已回到试读模式');
        }).catch((cause: unknown) => {
            setIsRemoveConfirmOpen(false);
            showToast(cause instanceof Error ? cause.message : String(cause), 'error');
        });
    };

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
        // 列表里的移除按钮只负责发起确认，真正的清空在确认后执行
        removeActivation: () => { setIsRemoveConfirmOpen(true); return Promise.resolve(); },
        isRemoving,
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

            {/* 局数弹窗直接复用奇门遁甲的 CustomJuModal，不再自建一套 */}
            <CustomJuModal
                isOpen={isJuDialogOpen}
                currentJu={caseStudyState.qimenResult?.header.ju ?? ''}
                onClose={() => setIsJuDialogOpen(false)}
                onConfirm={(ju) => {
                    caseStudyState.setCustomJu(ju);
                    setIsJuDialogOpen(false);
                }}
            />

            <LearningPanelModal
                isOpen={isLearningPanelOpen}
                onClose={() => setIsLearningPanelOpen(false)}
                onSelectArticle={caseStudyState.handleSelectCase}
                getArticleInfo={getArticleInfo}
            />

            <ConfirmModal
                isOpen={isRemoveConfirmOpen}
                onClose={() => setIsRemoveConfirmOpen(false)}
                onConfirm={confirmRemoveActivation}
                title="移除激活"
                description="将清空本机已下载的案例库并回到试读模式，需要重新输入激活码才能恢复。本机激活记录会被一并清除，此操作不可撤销。"
                confirmText={isRemoving ? '移除中…' : '确认移除'}
                loading={isRemoving}
                variant="destructive"
            />

            <Toast toast={toast} />
        </div>
    );
}
