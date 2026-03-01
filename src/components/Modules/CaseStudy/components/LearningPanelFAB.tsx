/**
 * LearningPanelFAB - 应用源码层
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
 * - `default LearningPanelFAB`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `lucide-react`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
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
