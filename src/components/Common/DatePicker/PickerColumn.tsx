
import { useEffect, useRef } from 'react';
import { cn } from '../../../lib/utils';

interface PickerColumnProps {
    items: number[];
    value: number;
    onChange: (v: number) => void;
    label?: string;
    formatItem: (v: number) => string;
    width?: string;
}

const ITEM_HEIGHT = 40;

export default function PickerColumn({ items, value, onChange, label, formatItem, width = "flex-1" }: PickerColumnProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const isScrolling = useRef(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // 当前选中下标：wheel 步进期间 scrollTop 还在 smooth 动画中，直接按 scrollTop 取整会滞后错位
    const indexRef = useRef(0);

    // Initial scroll
    useEffect(() => {
        if (scrollRef.current) {
            const index = items.indexOf(value);
            if (index !== -1) {
                indexRef.current = index;
                scrollRef.current.scrollTop = index * ITEM_HEIGHT;
            }
        }
    }, [items, value]);

    // Sync external value change
    useEffect(() => {
        if (!isScrolling.current && scrollRef.current) {
            const index = items.indexOf(value);
            if (index !== -1 && Math.abs(scrollRef.current.scrollTop - index * ITEM_HEIGHT) > 5) {
                indexRef.current = index;
                scrollRef.current.scrollTop = index * ITEM_HEIGHT;
            }
        }
    }, [value, items]);

    // 鼠标滚轮步进：原生滚动一格 deltaY≈100px（≈2.5 项）会一次跳多个数，
    // 这里拦截 wheel 改为按累计 delta 精确步进（触控板小步连续滑动同样一次一项）
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        let accumulated = 0;
        const handleWheel = (event: WheelEvent) => {
            event.preventDefault();
            accumulated += event.deltaY;
            if (Math.abs(accumulated) < 10) return;
            const direction = accumulated > 0 ? 1 : -1;
            accumulated = 0;
            const next = Math.max(0, Math.min(indexRef.current + direction, items.length - 1));
            if (next === indexRef.current) return;
            indexRef.current = next;
            isScrolling.current = false;
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            el.scrollTo({ top: next * ITEM_HEIGHT, behavior: 'smooth' });
            if (items[next] !== value) onChange(items[next]);
        };
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, [items, value, onChange]);

    const handleScroll = () => {
        isScrolling.current = true;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            isScrolling.current = false;
            if (!scrollRef.current) return;

            const scrollTop = scrollRef.current.scrollTop;
            const index = Math.round(scrollTop / ITEM_HEIGHT);
            const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
            indexRef.current = clampedIndex;

            scrollRef.current.scrollTo({
                top: clampedIndex * ITEM_HEIGHT,
                behavior: 'smooth'
            });

            if (items[clampedIndex] !== value) {
                onChange(items[clampedIndex]);
            }
        }, 150);
    };

    return (
        <div className={`h-full relative group ${width}`}>
            <div
                ref={scrollRef}
                className="h-full overflow-y-scroll no-scrollbar py-[80px]"
                onScroll={handleScroll}
                style={{ scrollSnapType: 'y mandatory', scrollBehavior: 'smooth' }}
            >
                {items.map(item => (
                    <div
                        key={item}
                        className={cn(
                            "h-[40px] flex items-center justify-center snap-center text-sm transition-all duration-200 cursor-pointer select-none",
                            item === value ? 'text-foreground font-medium scale-110 opacity-100' : 'text-muted-foreground scale-95 opacity-50'
                        )}
                        onClick={() => {
                            if (scrollRef.current) {
                                scrollRef.current.scrollTo({
                                    top: items.indexOf(item) * ITEM_HEIGHT,
                                    behavior: 'smooth'
                                });
                                onChange(item);
                            }
                        }}
                    >
                        {formatItem(item)}{label}
                    </div>
                ))}
            </div>
        </div>
    );
}
