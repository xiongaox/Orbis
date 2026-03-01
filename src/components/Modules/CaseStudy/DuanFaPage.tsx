/**
 * DuanFaPage - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：承载具体业务模块的前端功能
 *
 * 关键职责：
 * - 渲染 UI 视图并处理交互逻辑
 * - 处理用户输入与展示边界行为
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `default DuanFaPage`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、内部模块 `useDuanFa`、内部模块 `DuanFaSidebar` 等 16 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
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
import { useAuth } from '../../../contexts/useAuth';
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
            ) : isPadLandscape ? (
                /* ========== Pad 横屏：竖线触发抽屉，抽屉内保持双列布局 ========== */
                <>
                    {/* 主内容区域 */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                        {/* 左侧贴边竖线触发按钮 */}
                        <button
                            type="button"
                            onClick={() => setIsLeftOpen(true)}
                            className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-8 h-28 bg-transparent flex items-center justify-start group focus:outline-none"
                            aria-label="打开目录"
                        >
                            <span className="w-[3px] h-20 rounded-r bg-primary/35 group-hover:bg-primary/70 group-active:bg-primary/80 transition-colors shadow-[0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-none" />
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="px-2 py-1 rounded-md text-xs bg-card border border-border shadow-sm text-foreground/80 whitespace-nowrap">
                                    目录
                                </span>
                            </span>
                        </button>

                        {/* 右侧贴边竖线触发按钮 */}
                        <button
                            type="button"
                            onClick={() => setIsOutlineOpen(true)}
                            className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-8 h-28 bg-transparent flex items-center justify-end group focus:outline-none"
                            aria-label="打开大纲"
                        >
                            <span className="w-[3px] h-20 rounded-l bg-primary/35 group-hover:bg-primary/70 group-active:bg-primary/80 transition-colors shadow-[0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-none" />
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="px-2 py-1 rounded-md text-xs bg-card border border-border shadow-sm text-foreground/80 whitespace-nowrap">
                                    大纲
                                </span>
                            </span>
                        </button>

                        {content}
                    </div>

                    {/* 左侧目录抽屉 - 双列并排布局（术数分类 + 断法列表） */}
                    <SideDrawer
                        open={isLeftOpen}
                        title="目录"
                        side="left"
                        size="sm"
                        hideHeader={true}
                        onClose={() => setIsLeftOpen(false)}
                    >
                        <div className="h-full min-h-0 overflow-hidden flex flex-row">
                            <ShuShuSidebar
                                selectedId={selectedShuShuId}
                                onSelect={handleSelectShuShu}
                            />
                            <div className="flex-1 min-w-0 h-full overflow-hidden border-r border-border/40">
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

                    {/* 右侧大纲抽屉 */}
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
