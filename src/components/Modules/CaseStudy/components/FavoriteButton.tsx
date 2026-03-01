/**
 * 收藏按钮组件
 * 详情页右上角收藏切换按钮，仅登录用户可见
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
