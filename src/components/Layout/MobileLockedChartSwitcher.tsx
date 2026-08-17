import { SquareStack } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import type { NavItemType } from './NavButton';

interface MobileLockedChartSwitcherProps {
    activeChart: string;
    lockedCharts: string[];
    items: NavItemType[];
    onChartChange: (chart: string) => void;
}

interface Position {
    left: number;
    top: number;
}

const EDGE_GAP = 16;
const BUTTON_SIZE = 56;

function getDefaultPosition(): Position {
    if (typeof window === 'undefined') {
        return { left: EDGE_GAP, top: EDGE_GAP };
    }

    return {
        left: Math.max(EDGE_GAP, window.innerWidth - BUTTON_SIZE - EDGE_GAP),
        top: Math.max(EDGE_GAP, window.innerHeight - BUTTON_SIZE - EDGE_GAP),
    };
}

function clampPosition(position: Position): Position {
    if (typeof window === 'undefined') return position;

    return {
        left: Math.min(Math.max(EDGE_GAP, position.left), Math.max(EDGE_GAP, window.innerWidth - BUTTON_SIZE - EDGE_GAP)),
        top: Math.min(Math.max(EDGE_GAP, position.top), Math.max(EDGE_GAP, window.innerHeight - BUTTON_SIZE - EDGE_GAP)),
    };
}

export default function MobileLockedChartSwitcher({
    activeChart,
    lockedCharts,
    items,
    onChartChange,
}: MobileLockedChartSwitcherProps) {
    const { isMobile } = useLayoutMode();
    const lockedItems = items.filter((item) => lockedCharts.includes(item.id));
    const [position, setPosition] = useState<Position>(getDefaultPosition);
    const [rotationKey, setRotationKey] = useState(0);
    const dragStartRef = useRef<{ pointerX: number; pointerY: number; position: Position } | null>(null);
    const didDragRef = useRef(false);

    useEffect(() => {
        const handleResize = () => setPosition((current) => clampPosition(current));
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!isMobile || lockedItems.length !== 2 || !lockedItems.some((item) => item.id === activeChart)) return null;

    const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        dragStartRef.current = {
            pointerX: event.clientX,
            pointerY: event.clientY,
            position,
        };
        didDragRef.current = false;
    };

    const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
        const dragStart = dragStartRef.current;
        if (!dragStart) return;

        const nextPosition = clampPosition({
            left: dragStart.position.left + event.clientX - dragStart.pointerX,
            top: dragStart.position.top + event.clientY - dragStart.pointerY,
        });

        if (Math.abs(event.clientX - dragStart.pointerX) > 4 || Math.abs(event.clientY - dragStart.pointerY) > 4) {
            didDragRef.current = true;
        }

        setPosition(nextPosition);
    };

    const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        dragStartRef.current = null;
    };

    const handleClick = () => {
        if (didDragRef.current) {
            didDragRef.current = false;
            return;
        }

        const activeIndex = lockedItems.findIndex((item) => item.id === activeChart);
        const nextItem = lockedItems[(activeIndex + 1) % lockedItems.length] ?? lockedItems[0];
        if (nextItem) {
            setRotationKey((current) => current + 1);
            onChartChange(nextItem.id);
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="fixed z-40 inline-flex h-14 w-14 touch-none cursor-grab items-center justify-center rounded-full border-2 border-primary/35 bg-background/10 text-primary/90 shadow-lg shadow-primary/15 backdrop-blur-sm transition-colors hover:bg-background/20 active:cursor-grabbing active:bg-background/30 dark:border-primary/55 dark:bg-background/[0.03] dark:shadow-xl dark:shadow-black/30 dark:hover:bg-background/[0.07] dark:active:bg-background/10 focus-ring"
            style={{ left: position.left, top: position.top }}
            aria-label="切换锁定模块"
            title={`在${lockedItems[0]?.name}和${lockedItems[1]?.name}之间切换`}
        >
            <SquareStack
                key={rotationKey}
                className={`h-6 w-6 ${rotationKey > 0 ? 'animate-[spin_720ms_cubic-bezier(0.16,1,0.3,1)_1] motion-reduce:animate-none' : ''}`}
                strokeWidth={2.5}
                aria-hidden="true"
            />
        </button>
    );
}
