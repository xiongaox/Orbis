/**
 * 学习面板浮动按钮 (FAB)
 * 位于中间栏右下角，仅登录用户可见
 */
import { BookOpen } from 'lucide-react';

interface LearningPanelFABProps {
    onClick: () => void;
}

export default function LearningPanelFAB({ onClick }: LearningPanelFABProps) {
    return (
        <button
            onClick={onClick}
            className="
                w-12 h-12 rounded-full
                bg-primary text-primary-foreground
                shadow-lg hover:shadow-xl
                flex items-center justify-center
                transition-all duration-200
                hover:scale-105 active:scale-95
                cursor-pointer
            "
            title="打开文章管理"
            aria-label="打开文章管理"
        >
            <BookOpen className="w-5 h-5" />
        </button>
    );
}
