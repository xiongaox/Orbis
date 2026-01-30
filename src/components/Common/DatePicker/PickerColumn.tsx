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

    // Initial scroll
    useEffect(() => {
        if (scrollRef.current) {
            const index = items.indexOf(value);
            if (index !== -1) {
                scrollRef.current.scrollTop = index * ITEM_HEIGHT;
            }
        }
    }, []);

    // Sync external value change
    useEffect(() => {
        if (!isScrolling.current && scrollRef.current) {
            const index = items.indexOf(value);
            if (index !== -1 && Math.abs(scrollRef.current.scrollTop - index * ITEM_HEIGHT) > 5) {
                scrollRef.current.scrollTop = index * ITEM_HEIGHT;
            }
        }
    }, [value, items]);

    const handleScroll = () => {
        isScrolling.current = true;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            isScrolling.current = false;
            if (!scrollRef.current) return;

            const scrollTop = scrollRef.current.scrollTop;
            const index = Math.round(scrollTop / ITEM_HEIGHT);
            const clampedIndex = Math.max(0, Math.min(index, items.length - 1));

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
