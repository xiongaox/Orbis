/**
 * ArticleCard - 应用源码层
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
 * - `default ArticleCard`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `lucide-react`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { Clock, BookOpen, Check, Trash2 } from 'lucide-react';

interface ArticleCardProps {
    articleId: string;
    title: string;
    author?: string;
    progressPercent?: number;
    lastReadAt?: string;
    showFavoriteAction?: boolean;
    onContinueReading: (articleId: string) => void;
    onRemoveFavorite?: (articleId: string) => void;
}

// 格式化相对时间
function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return '刚刚';
    if (diffMinutes < 60) return `${diffMinutes}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 30) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
}

export default function ArticleCard({
    articleId,
    title,
    author,
    progressPercent,
    lastReadAt,
    showFavoriteAction = false,
    onContinueReading,
    onRemoveFavorite,
}: ArticleCardProps) {
    const isFinished = progressPercent !== undefined && progressPercent >= 90;
    const hasProgress = progressPercent !== undefined && progressPercent > 0;

    return (
        <div
            className="
                p-3 bg-card rounded-lg border border-border/50
                hover:border-border hover:shadow-sm
                transition-all duration-200
                cursor-pointer group
                relative
            "
            onClick={() => onContinueReading(articleId)}
        >
            {/* 标题行 & 操作区 */}
            <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate pr-2">
                        {title}
                    </h4>
                    {/* 作者信息移到标题下方紧凑显示 */}
                    {author && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                            作者：{author}
                        </div>
                    )}
                </div>

                {/* 右上角操作区：继续阅读 + 收藏 */}
                <div className="flex items-center gap-1 shrink-0">
                    {/* 继续阅读按钮（图标 + 文字） */}
                    <div className="
                        hidden group-hover:flex items-center gap-1 
                        text-xs text-primary font-medium
                        bg-primary/10 px-2 py-0.5 rounded-md
                    ">
                        <BookOpen className="w-3 h-3" />
                        继续阅读
                    </div>

                    {showFavoriteAction && onRemoveFavorite && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemoveFavorite(articleId);
                            }}
                            className="
                                p-1 rounded-md opacity-0 group-hover:opacity-100
                                text-muted-foreground hover:text-red-500 hover:bg-red-500/10
                                transition-all duration-200
                            "
                            title="取消收藏"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* 进度和状态行 */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                {/* 进度条 */}
                {hasProgress && (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-300 ${isFinished ? 'bg-green-500' : 'bg-primary/80'
                                    }`}
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <span className="tabular-nums shrink-0 opacity-80">
                            {progressPercent}%
                        </span>
                    </div>
                )}

                {/* 右侧信息：时间或已读 */}
                <div className="shrink-0 flex items-center gap-2">
                    {isFinished && (
                        <span className="text-green-600 flex items-center gap-0.5">
                            <Check className="w-3 h-3" />
                            已读
                        </span>
                    )}

                    {lastReadAt && (
                        <span className="flex items-center gap-1 opacity-60">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(lastReadAt)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
