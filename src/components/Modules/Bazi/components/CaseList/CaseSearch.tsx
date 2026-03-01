/**
 * CaseSearch - 应用源码层
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
 * - `default CaseSearch`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `lucide-react`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { Search } from 'lucide-react';

interface CaseSearchProps {
    value: string;
    onChange: (value: string) => void;
}

export default function CaseSearch({ value, onChange }: CaseSearchProps) {
    return (
        <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
            <input
                type="text"
                placeholder="搜索案例..."
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full bg-card border border-border/40 hover:border-border/60 rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all font-light"
            />
        </div>
    );
}
