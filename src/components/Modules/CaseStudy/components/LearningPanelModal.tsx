import { useState, useEffect, useCallback } from 'react';
import { X, Heart, Clock, ChevronLeft, ChevronRight, Loader2, AlertCircle, BookOpen, Trash2 } from 'lucide-react';
import { learningPanelService, type CaseFavorite, type CaseProgress } from '../../../../services/learningPanelService';
import ArticleCard from './ArticleCard';
import SubPage from '../../../UI/SubPage';
import SubPageTabs from '../../../UI/SubPageTabs';
import { useLayoutMode } from '../../../../hooks/useLayoutMode';

// 菜单类型
type MenuType = 'favorites' | 'recent';

interface LearningPanelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectArticle: (articleId: string) => void;
    getArticleInfo: (articleId: string) => { title: string; author: string };
}

// 菜单配置
const MENU_ITEMS: { id: MenuType; label: string; icon: typeof Heart }[] = [
    { id: 'favorites', label: '收藏文章', icon: Heart },
    { id: 'recent', label: '最近阅读', icon: Clock },
];

export default function LearningPanelModal({
    isOpen,
    onClose,
    onSelectArticle,
    getArticleInfo,
}: LearningPanelModalProps) {
    const [activeMenu, setActiveMenu] = useState<MenuType>('favorites');
    const { isMobile } = useLayoutMode();

    // 数据状态
    const [favorites, setFavorites] = useState<CaseFavorite[]>([]);
    const [recentReads, setRecentReads] = useState<CaseProgress[]>([]);

    // 分页状态
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // 加载状态
    const [isLoading, setIsLoading] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [isClearConfirming, setIsClearConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 加载数据
    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            if (activeMenu === 'favorites') {
                const result = await learningPanelService.getFavorites(currentPage);
                setFavorites(result.data);
                setTotalCount(result.count);
            } else if (activeMenu === 'recent') {
                const data = await learningPanelService.getRecentReads();
                setRecentReads(data);
                setTotalCount(data.length);
            }
        } catch (err) {
            console.error('加载数据失败:', err);
            setError('加载失败，请重试');
        } finally {
            setIsLoading(false);
        }
    }, [activeMenu, currentPage]);

    // 切换菜单时重置页码
    useEffect(() => {
        setCurrentPage(1);
    }, [activeMenu]);

    // 加载数据
    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen, loadData]);

    // ESC 关闭
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose]);

    // 处理继续阅读
    const handleContinueReading = (articleId: string) => {
        onSelectArticle(articleId);
        onClose();
    };

    // 处理取消收藏
    const handleRemoveFavorite = async (articleId: string) => {
        const success = await learningPanelService.removeFavorite(articleId);
        if (success) {
            // 重新加载收藏列表
            loadData();
        }
    };

    // 处理清空最近阅读
    const handleClearAllProgress = async () => {
        if (isClearing) return;

        if (!isClearConfirming) {
            setIsClearConfirming(true);
            return;
        }

        setIsClearing(true);
        try {
            const success = await learningPanelService.clearAllProgress();
            if (success) {
                // 立即同步当前视图，避免删除成功后仍显示旧缓存列表。
                setRecentReads([]);
                setTotalCount(0);
            }
        } catch (err) {
            console.error('清空最近阅读失败:', err);
            setError('清空失败，请重试');
        } finally {
            setIsClearing(false);
            setIsClearConfirming(false);
        }
    };

    const cancelClearProgress = () => {
        if (!isClearing) setIsClearConfirming(false);
    };

    // 获取当前显示的列表数据
    const getCurrentListData = (): { articleId: string; progress?: CaseProgress }[] => {
        if (activeMenu === 'favorites') {
            return favorites.map(f => ({ articleId: f.article_id }));
        } else {
            return recentReads.map(p => ({ articleId: p.article_id, progress: p }));
        }
    };

    // 空状态文案
    const getEmptyMessage = () => {
        if (activeMenu === 'favorites') return '暂无收藏';
        return '暂无最近阅读';
    };

    if (!isOpen) return null;

    const listData = getCurrentListData();
    const totalPages = Math.ceil(totalCount / 10);

    // 列表内容：移动端 SubPage 与桌面端弹窗共用
    const renderBody = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            );
        }
        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                    <p className="text-sm text-muted-foreground">{error}</p>
                    <button
                        onClick={loadData}
                        className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                    >
                        重试
                    </button>
                </div>
            );
        }
        if (listData.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <BookOpen className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">{getEmptyMessage()}</p>
                </div>
            );
        }
        return (
            <div className="space-y-3">
                {/* 最近阅读清空入口：平时轻量文字按钮，确认时展开红框提示 */}
                {activeMenu === 'recent' && (
                    <div className={`flex items-center gap-2 mb-2 ${isClearConfirming ? 'rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2' : 'justify-end'}`}>
                        {isClearConfirming ? (
                            <>
                                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                                <span className="mr-auto text-xs text-red-500/90">清空后无法恢复</span>
                                <button
                                    type="button"
                                    onClick={cancelClearProgress}
                                    disabled={isClearing}
                                    className="inline-flex h-8 items-center rounded-md border border-border bg-card px-3 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    取消
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClearAllProgress}
                                    disabled={isClearing}
                                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-500/40 bg-red-500/10 px-3 text-xs font-semibold text-red-500 shadow-sm transition-colors hover:bg-red-500/20 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    {isClearing ? '正在清空…' : '确认清空'}
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={handleClearAllProgress}
                                disabled={isClearing}
                                className="inline-flex h-7 items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                清空最近阅读
                            </button>
                        )}
                    </div>
                )}

                {listData.map((item) => {
                    const info = getArticleInfo(item.articleId);
                    return (
                        <ArticleCard
                            key={item.articleId}
                            articleId={item.articleId}
                            title={info.title}
                            author={info.author}
                            progressPercent={item.progress?.progress_percent}
                            lastReadAt={item.progress?.last_read_at}
                            showFavoriteAction={activeMenu === 'favorites'}
                            onContinueReading={handleContinueReading}
                            onRemoveFavorite={handleRemoveFavorite}
                        />
                    );
                })}
            </div>
        );
    };

    const pagination = totalPages > 1 ? (
        <div className="flex items-center justify-center gap-4">
            <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-muted-foreground">
                {currentPage} / {totalPages}
            </span>
            <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    ) : null;

    // 移动端：SubPage 二级页 + SubPageTabs（与数据备份同款）；桌面端保留居中弹窗 + 左侧菜单
    if (isMobile) {
        return (
            <SubPage
                isOpen={isOpen}
                onClose={onClose}
                title="文章管理"
                bodyClassName="overflow-hidden flex flex-col"
                tabBar={(
                    <SubPageTabs
                        ariaLabel="文章管理"
                        tabs={[
                            { key: 'favorites' as MenuType, label: '收藏文章' },
                            { key: 'recent' as MenuType, label: '最近阅读' },
                        ]}
                        active={activeMenu}
                        onChange={setActiveMenu}
                    />
                )}
                footer={pagination ? <div className="flex items-center justify-center">{pagination}</div> : undefined}
            >
                <div className="flex-1 min-h-0 overflow-y-auto p-4">{renderBody()}</div>
            </SubPage>
        );
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={onClose}
        >
            {/* 遮罩 */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* 弹窗主体 - 移动端全屏，桌面端居中 */}
            <div
                className="
                    relative z-10 bg-card shadow-2xl
                    w-full h-full
                    lg:w-full lg:max-w-3xl lg:h-[600px] lg:max-h-[80vh] lg:rounded-xl
                    flex flex-col overflow-hidden
                    animate-in fade-in lg:zoom-in-95 duration-200
                "
                // 移动端全屏贴顶贴底，需自行避开系统栏（见 MainActivity.kt 注入的
                // --safe-area-inset-*）；桌面端该变量未定义、退化为 0，居中布局不受影响。
                style={{
                    paddingTop: 'var(--safe-area-inset-top, 0px)',
                    paddingBottom: 'var(--safe-area-inset-bottom, 0px)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 头部 */}
                <div className="flex items-center justify-between px-5 py-3 lg:px-6 lg:py-4 border-b border-border">
                    <h2 className="text-base lg:text-lg font-semibold">文章管理</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                        aria-label="关闭"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 内容区 - 移动端纵向(Tab在上)，桌面端横向(菜单在左) */}
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    {/* 移动端：顶部水平 Tab 按钮 / 桌面端：左侧菜单 */}
                    <div className="
                        flex flex-row lg:flex-col
                        lg:w-48 bg-muted/20
                        border-b lg:border-b-0 lg:border-r border-border
                        p-1.5 lg:p-3 gap-1 lg:space-y-1
                        shrink-0
                    ">
                        {MENU_ITEMS.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeMenu === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveMenu(item.id)}
                                    className={`
                                        flex-1 lg:flex-none
                                        flex items-center justify-center lg:justify-start
                                        gap-1.5 lg:gap-3 px-3 py-2 lg:py-2.5 rounded-lg
                                        transition-colors cursor-pointer text-center lg:text-left
                                        ${isActive
                                            ? 'bg-primary text-primary-foreground'
                                            : 'hover:bg-muted text-foreground'
                                        }
                                    `}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="text-xs lg:text-sm font-medium">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* 右侧内容 */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* 列表区域 */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {renderBody()}
                        </div>

                        {/* 分页控制 */}
                        {pagination && (
                            <div className="flex items-center justify-center border-t border-border px-4 py-3">
                                {pagination}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
