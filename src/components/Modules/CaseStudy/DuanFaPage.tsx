/**
 * 奇门断法页面组件
 * 三栏布局：左侧主题列表 + 中间正文 + 右侧大纲
 */
import { useState, useRef, useCallback } from 'react';
import { useDuanFa } from './hooks/useDuanFa';
import DuanFaSidebar from './components/DuanFaSidebar';
import DuanFaContent from './components/DuanFaContent';
import DuanFaOutline from './components/DuanFaOutline';
import ShuShuSidebar from './components/ShuShuSidebar';
import SideDrawer from '../../UI/SideDrawer';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useIsPadLandscape } from '../../../hooks/useIsPadLandscape';

// 学习面板相关
import { useAuth } from '../../../contexts/AuthContext';
import { useReadingProgress } from './hooks/useReadingProgress';
import LearningPanelModal from './components/LearningPanelModal';
import LearningPanelFAB from './components/LearningPanelFAB';
import ReadingProgressButton from './components/ReadingProgressButton';
import { DUANFA_FILES } from '../../../lib/caseStudy/duanfaData';
import { ALL_CASES } from './hooks/useCaseStudy';

export default function DuanFaPage() {
    const isDesktop = useMediaQuery('(min-width: 1024px)');
    const isPadLandscape = useIsPadLandscape();
    const useDesktopLayout = isDesktop && !isPadLandscape;
    const {
        selectedShuShuId,
        files,
        selectedFileId,
        selectedFile,
        outline,
        activeSectionId,
        handleSelectShuShu,
        handleSelectFile,
        handleOutlineClick,
        setOutline,
    } = useDuanFa();

    // 认证与面板状态
    const { isAuthenticated } = useAuth();
    const [isLearningPanelOpen, setIsLearningPanelOpen] = useState(false);
    const [isLeftOpen, setIsLeftOpen] = useState(false);
    const [isOutlineOpen, setIsOutlineOpen] = useState(false);

    // 滚动容器 Ref
    const contentScrollRef = useRef<HTMLDivElement>(null);

    // 阅读进度 Hook
    const {
        savedProgress,
        currentProgress,
        restoreProgress,
    } = useReadingProgress({
        articleId: selectedFileId,
        scrollContainerRef: contentScrollRef,
        enabled: isAuthenticated && !!selectedFileId,
    });

    // 学习面板 - 获取文章信息（支持多数据源）
    const getArticleInfo = useCallback((articleId: string) => {
        // 1. 在断法文件中查找
        const duanfaFile = DUANFA_FILES.find(f => f.id === articleId);
        if (duanfaFile) {
            return { title: duanfaFile.name, author: '不吹牛' };
        }

        // 2. 在八字/奇门案例中查找（id 是完整路径）
        const caseItem = ALL_CASES.find(c => c.id === articleId);
        if (caseItem) {
            return { title: caseItem.title, author: caseItem.author };
        }

        // 3. 未找到
        return { title: '未知文章', author: '未知' };
    }, []);

    // 学习面板 - 选中文章
    const handleSelectPanelArticle = useCallback((articleId: string) => {
        handleSelectFile(articleId);
        setIsLearningPanelOpen(false);
    }, [handleSelectFile]);

    const content = (
        <div className="flex-1 flex flex-col overflow-hidden relative">
            <DuanFaContent
                ref={contentScrollRef}
                content={selectedFile?.content || ''}
                title={selectedFile?.name || (selectedShuShuId === 'qimen' ? '奇门断法' : '暂无内容')}
                onOutlineChange={setOutline}
            />

            {/* 浮动按钮区 - 仅登录用户可见 */}
            {isAuthenticated && (
                <div className="absolute right-6 bottom-6 z-10 flex flex-col items-center gap-3">
                    {/* 进度环按钮 */}
                    {selectedFileId && (
                        <ReadingProgressButton
                            progress={currentProgress}
                            savedProgress={savedProgress}
                            isFinished={currentProgress > 0 ? currentProgress >= 90 : savedProgress >= 90}
                            onRestore={restoreProgress}
                        />
                    )}
                    {/* 学习面板按钮 */}
                    <LearningPanelFAB onClick={() => setIsLearningPanelOpen(true)} />
                </div>
            )}
        </div>
    );

    return (
        <div className="flex w-full h-full overflow-hidden bg-background relative">
            {useDesktopLayout ? (
                <>
                    {/* 1. 术数分类 (12%) */}
                    <ShuShuSidebar
                        selectedId={selectedShuShuId}
                        onSelect={handleSelectShuShu}
                    />

                    {/* 2. 主题列表 (15%) */}
                    <DuanFaSidebar
                        files={files}
                        selectedFileId={selectedFileId}
                        onSelectFile={handleSelectFile}
                    />

                    {/* 3. 中间：正文内容 */}
                    {content}

                    {/* 4. 右侧：大纲导航 (15%) */}
                    <DuanFaOutline
                        outline={outline}
                        activeSectionId={activeSectionId}
                        onItemClick={handleOutlineClick}
                    />
                </>
            ) : (
                <>
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-3 py-2 border-b border-border/40 bg-background/70 backdrop-blur-sm flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => setIsLeftOpen(true)}
                                className="px-3 py-1.5 rounded-lg border border-border bg-card/60 text-sm text-foreground hover:bg-muted/40 transition-colors"
                            >
                                目录
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsOutlineOpen(true)}
                                className="px-3 py-1.5 rounded-lg border border-border bg-card/60 text-sm text-foreground hover:bg-muted/40 transition-colors"
                            >
                                大纲
                            </button>
                        </div>
                        {content}
                    </div>

                    <SideDrawer
                        open={isLeftOpen}
                        title="目录"
                        side="left"
                        onClose={() => setIsLeftOpen(false)}
                    >
                        <div className="h-full min-h-0 overflow-hidden flex flex-col">
                            <ShuShuSidebar
                                selectedId={selectedShuShuId}
                                onSelect={(id) => {
                                    handleSelectShuShu(id);
                                }}
                                variant="drawer"
                            />
                            <div className="flex-1 min-h-0 overflow-hidden">
                                <DuanFaSidebar
                                    files={files}
                                    selectedFileId={selectedFileId}
                                    onSelectFile={(id) => {
                                        handleSelectFile(id);
                                        setIsLeftOpen(false);
                                    }}
                                    variant="drawer"
                                />
                            </div>
                        </div>
                    </SideDrawer>

                    <SideDrawer
                        open={isOutlineOpen}
                        title="大纲"
                        side="right"
                        onClose={() => setIsOutlineOpen(false)}
                    >
                        <DuanFaOutline
                            outline={outline}
                            activeSectionId={activeSectionId}
                            onItemClick={(id) => {
                                handleOutlineClick(id);
                                setIsOutlineOpen(false);
                            }}
                            variant="drawer"
                        />
                    </SideDrawer>
                </>
            )}

            {/* 学习面板弹窗 */}
            <LearningPanelModal
                isOpen={isLearningPanelOpen}
                onClose={() => setIsLearningPanelOpen(false)}
                onSelectArticle={handleSelectPanelArticle}
                getArticleInfo={getArticleInfo}
            />
        </div>
    );
}
