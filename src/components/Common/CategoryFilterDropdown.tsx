/**
 * 模块定位：
 * - 案例列表头部右上角的分类筛选下拉（触发按钮 + 展开的分类面板）
 *
 * 关键职责：
 * - 只负责视图与交互回调，分类数据与计数由调用方传入（各术数分类表不同）
 * - 面板尺寸偏大，保证移动端/触屏上的点击目标足够
 *
 * 为什么抽到 Common：奇门与三元案例列表原本各写了一份同样的下拉，
 * 样式调整需要改多处且容易漏，统一收敛到此处。
 */
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface CategoryFilterOption {
    id: string;
    name: string;
    count: number;
}

interface CategoryFilterDropdownProps {
    /** 当前选中分类的显示名 */
    label: string;
    /** 触发器上括号内的数量（当前筛选结果数） */
    count: number;
    options: CategoryFilterOption[];
    selectedId: string;
    onSelect: (id: string) => void;
}

export default function CategoryFilterDropdown({ label, count, options, selectedId, onSelect }: CategoryFilterDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
                {label}
                <span className="text-muted-foreground/60">({count})</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                // top-full 必须显式声明：绝对定位元素在 flex 容器内的 static position
                // 取容器内容起点（行顶部）而非按钮下方，缺省会让面板整体上移、上面几项被页头遮住
                <div className="absolute right-0 left-0 top-full mt-2 bg-sidebar border border-sidebar-border rounded-xl shadow-xl p-2 z-20">
                    {options.map((option) => {
                        const isActive = option.id === selectedId;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => {
                                    onSelect(option.id);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm rounded-lg transition-colors ${isActive
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : 'text-foreground hover:bg-sidebar-accent/60'
                                    }`}
                            >
                                <span>{option.name}</span>
                                <span className="text-muted-foreground/60">{option.count}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </>
    );
}
