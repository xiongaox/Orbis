/**
 * FavoriteButton - 应用源码层
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
 * - `default FavoriteButton`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、外部依赖 `lucide-react`、内部模块 `useAuth` 等 4 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { useState, useEffect } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { useAuth } from '../../../../contexts/useAuth';
import { learningPanelService } from '../../../../services/learningPanelService';

interface FavoriteButtonProps {
    articleId: string;
    onFavoriteChange?: (isFavorited: boolean) => void;
}

export default function FavoriteButton({ articleId, onFavoriteChange }: FavoriteButtonProps) {
    const { user } = useAuth();
    const [isFavorited, setIsFavorited] = useState(false);
    const [isLoading, setIsLoading] = useState(!!user);

    // 初始化时检查收藏状态
    useEffect(() => {
        if (!user) {
            return;
        }

        const checkFavoriteStatus = async () => {
            setIsLoading(true);
            const favorited = await learningPanelService.isFavorited(user.id, articleId);
            setIsFavorited(favorited);
            setIsLoading(false);
        };

        checkFavoriteStatus();
    }, [user, articleId]);

    const handleToggleFavorite = async () => {
        if (!user || isLoading) return;

        setIsLoading(true);

        if (isFavorited) {
            const success = await learningPanelService.removeFavorite(user.id, articleId);
            if (success) {
                setIsFavorited(false);
                onFavoriteChange?.(false);
            }
        } else {
            const success = await learningPanelService.addFavorite(user.id, articleId);
            if (success) {
                setIsFavorited(true);
                onFavoriteChange?.(true);
            }
        }

        setIsLoading(false);
    };

    // 未登录不显示
    if (!user) return null;

    return (
        <button
            onClick={handleToggleFavorite}
            disabled={isLoading}
            className={`
                p-2 rounded-lg transition-all duration-200
                ${isFavorited
                    ? 'text-red-500 hover:text-red-600 hover:bg-red-500/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
                cursor-pointer
            `}
            title={isFavorited ? '取消收藏' : '收藏文章'}
            aria-label={isFavorited ? '取消收藏' : '收藏文章'}
        >
            {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <Heart
                    className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`}
                />
            )}
        </button>
    );
}
