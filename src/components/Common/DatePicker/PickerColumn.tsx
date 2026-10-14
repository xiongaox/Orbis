
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
    // 程序性定位（初始化 / 外部同步）期间置位：这类滚动不产生中间态，也不允许回写值
    const programmaticRef = useRef(false);
    // 用户是否正在手动拖动（触摸/拖拽）。容器的 scroll-behavior 是 smooth，
    // 程序性定位同样会走动画；若不区分，onScroll 会在动画中途采样出错误项并回写（年份跨度大时最明显）
    const userInteractingRef = useRef(false);

    /** 瞬时定位到某下标：必须用 behavior: 'instant'，否则会被容器的 scroll-behavior: smooth 拉成动画 */
    const jumpToIndex = (index: number) => {
        const el = scrollRef.current;
        if (!el) return;
        indexRef.current = index;
        programmaticRef.current = true;
        el.scrollTo({ top: index * ITEM_HEIGHT, behavior: 'instant' });
        requestAnimationFrame(() => { programmaticRef.current = false; });
    };

    // Initial scroll
    useEffect(() => {
        if (!scrollRef.current) return;
        const index = items.indexOf(value);
        if (index === -1) return;
        // 已在位就不重复滚动，避免每次渲染都触发一次滚动动画
        if (indexRef.current === index && Math.abs(scrollRef.current.scrollTop - index * ITEM_HEIGHT) <= 5) return;
        jumpToIndex(index);
    }, [items, value]);

    // Sync external value change
    useEffect(() => {
        if (!isScrolling.current && scrollRef.current) {
            const index = items.indexOf(value);
            if (index !== -1 && Math.abs(scrollRef.current.scrollTop - index * ITEM_HEIGHT) > 5) {
                jumpToIndex(index);
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
        // 程序性定位产生的滚动：直接忽略，不回写
        if (programmaticRef.current) return;
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

            // 只有用户手动拖动（触摸/拖拽）才由这里回写值；
            // 滚轮与点击都自带 onChange，程序性定位更不该回写——否则动画中途的位置会被当成选择结果
            if (userInteractingRef.current && items[clampedIndex] !== value) {
                onChange(items[clampedIndex]);
            }
            userInteractingRef.current = false;
        }, 150);
    };

    return (
        <div className={`h-full relative group ${width}`}>
            <div
                ref={scrollRef}
                className="h-full overflow-y-scroll no-scrollbar py-[80px]"
                onScroll={handleScroll}
                // 只有用户自己拖动/触摸滚出来的，才允许 onScroll 回写选中值
                onPointerDown={() => { userInteractingRef.current = true; }}
                onTouchStart={() => { userInteractingRef.current = true; }}
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
