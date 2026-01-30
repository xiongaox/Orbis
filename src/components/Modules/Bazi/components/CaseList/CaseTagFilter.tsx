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
    const tagMenuRef = useRef<HTMLDivElement | null>(null);
    const allLabel = '\u5168\u90e8';

    useEffect(() => {
        if (!isTagMenuOpen) return;

        const handlePointerDown = (event: MouseEvent) => {
            if (tagMenuRef.current && !tagMenuRef.current.contains(event.target as Node)) {
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
        <div className="relative" ref={tagMenuRef}>
            <button
                type="button"
                onClick={() => setIsTagMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={isTagMenuOpen}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded-md hover:bg-muted/50"
            >
                {selectedTag ?? allLabel}
                <span className="text-muted-foreground/60">({selectedTag ? cases.filter(c => c.tags?.includes(selectedTag)).length : cases.length})</span>
                <ChevronRight className={`w-3 h-3 transition-transform ${isTagMenuOpen ? 'rotate-90' : ''}`} />
            </button>
            {isTagMenuOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-popover border border-border shadow-lg rounded-xl p-1.5 z-20 animate-in fade-in zoom-in-95 duration-100">
                    <button
                        type="button"
                        onClick={() => {
                            onSelectTag(null);
                            setIsTagMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-md transition-colors ${selectedTag === null
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-foreground hover:bg-muted'
                            }`}
                    >
                        <span>{allLabel}</span>
                        <span className="text-muted-foreground/70">{cases.length}</span>
                    </button>
                    <div className="mt-1 max-h-56 overflow-y-auto scrollbar-none">
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
                                    className={`w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-md transition-colors ${isActive
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
