
import { useRef, useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { CASE_TAGS } from '../../../../../services/baziCaseService';
import type { CaseTag } from '../../../../../services/baziCaseService';

interface CaseTagFilterProps {
    selectedTag: CaseTag | null;
    onSelectTag: (tag: CaseTag | null) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cases: any[]; // Used for counts
}

export default function CaseTagFilter({ selectedTag, onSelectTag, cases }: CaseTagFilterProps) {
    const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
    // ref 必须同时包住触发按钮与面板：只包面板时，点按钮的 mousedown 会被判成「外部点击」
    // 先关掉，紧接着 click 又把 prev 从 false 翻回 true，表现为「只能展开、点不回缩」。
    // display:contents 让这层包裹不参与布局，面板的 absolute 仍按外层 relative 定位。
    const containerRef = useRef<HTMLDivElement | null>(null);
    const allLabel = '\u5168\u90e8';

    useEffect(() => {
        if (!isTagMenuOpen) return;

        const handlePointerDown = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsTagMenuOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsTagMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isTagMenuOpen]);

    return (
        <div ref={containerRef} className="contents">
            <button
                type="button"
                onClick={() => setIsTagMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={isTagMenuOpen}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded-md hover:bg-muted/50"
            >
                {selectedTag ?? allLabel}
                <span className="text-muted-foreground/60">({selectedTag ? cases.filter(c => c.tags?.includes(selectedTag)).length : cases.length})</span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isTagMenuOpen ? 'rotate-90' : ''}`} />
            </button>
            {isTagMenuOpen && (
                // top-full 必须显式声明（原因同 CategoryFilterDropdown）：
                // flex 容器内绝对定位元素缺省 static position 会让面板上移、顶部几项被遮住
                // 标签有 14 项，保留滚动并给出足够高度，避免在手机上被视口裁掉底部
                <div className="absolute right-0 left-0 top-full mt-2 max-h-[60vh] overflow-y-auto scrollbar-none bg-popover border border-border shadow-xl rounded-xl p-2 z-20 animate-in fade-in zoom-in-95 duration-100">
                    <button
                        type="button"
                        onClick={() => {
                            onSelectTag(null);
                            setIsTagMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm rounded-lg transition-colors ${selectedTag === null
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-foreground hover:bg-muted'
                            }`}
                    >
                        <span>{allLabel}</span>
                        <span className="text-muted-foreground/70">{cases.length}</span>
                    </button>
                    <div className="mt-1">
                        {CASE_TAGS.map(tag => {
                            const isActive = tag === selectedTag;
                            const count = cases.filter(c => c.tags?.includes(tag)).length;
                            return (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => {
                                        onSelectTag(tag);
                                        setIsTagMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm rounded-lg transition-colors ${isActive
                                        ? 'bg-primary/10 text-primary font-medium'
                                        : 'text-foreground hover:bg-muted'
                                        }`}
                                >
                                    <span>{tag}</span>
                                    {count > 0 && <span className="text-muted-foreground/70">{count}</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
