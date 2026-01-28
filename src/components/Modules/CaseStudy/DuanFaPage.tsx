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

// 学习面板相关
import { useAuth } from '../../../contexts/AuthContext';
import { useReadingProgress } from './hooks/useReadingProgress';
import LearningPanelModal from './components/LearningPanelModal';
import LearningPanelFAB from './components/LearningPanelFAB';
import ReadingProgressButton from './components/ReadingProgressButton';
import { DUANFA_FILES } from '../../../lib/caseStudy/duanfaData';

export default function DuanFaPage() {
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

    // 学习面板 - 获取文章信息
    const getArticleInfo = useCallback((articleId: string) => {
        // 在所有断法文件中查找
        const file = DUANFA_FILES.find(f => f.id === articleId);
        if (file) {
            return { title: file.name, author: '不吹牛' };
        }
        return { title: '未知断法文章', author: '未知' };
    }, []);

    // 学习面板 - 选中文章
    const handleSelectPanelArticle = useCallback((articleId: string) => {
        handleSelectFile(articleId);
        setIsLearningPanelOpen(false);
    }, [handleSelectFile]);

    return (
        <div className="flex w-full h-full overflow-hidden bg-background">
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
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <DuanFaContent
                    ref={contentScrollRef}
                    content={selectedFile?.content || ''}
                    title={selectedFile?.name || (selectedShuShuId === 'qimen' ? '奇门断法' : '暂无内容')}
                    onOutlineChange={setOutline}
                />

                {/* 浮动按钮区 - 仅登录用户可见 */}
                {isAuthenticated && (
                    <div className="absolute right-8 bottom-8 z-10 flex flex-col items-center gap-3">
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

            {/* 4. 右侧：大纲导航 (15%) */}
            <DuanFaOutline
                outline={outline}
                activeSectionId={activeSectionId}
                onItemClick={handleOutlineClick}
            />

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
