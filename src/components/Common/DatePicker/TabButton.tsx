/**
 * TabButton - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：提供跨模块的通用 UI 组件
 *
 * 关键职责：
 * - 渲染 UI 视图并处理交互逻辑
 * - 处理用户输入与展示边界行为
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `default TabButton`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `utils`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { cn } from '../../../lib/utils';

interface TabButtonProps {
    active: boolean;
    children: React.ReactNode;
    onClick: () => void;
}

export default function TabButton({ active, children, onClick }: TabButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "px-3 py-1 rounded text-xs font-medium transition-all",
                active ? 'bg-popover text-popover-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
        >
            {children}
        </button>
    );
}
