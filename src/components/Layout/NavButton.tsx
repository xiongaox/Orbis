/**
 * 模块定位：
 * - 主要目标：提供应用的基础布局框架
*/

import { LockKeyhole, LockKeyholeOpen } from 'lucide-react';
import type { ComponentType } from 'react';

export interface NavItemType {
    id: string;
    name: string;
    icon: ComponentType<{ className?: string }>;
    priority: 'core' | 'extra';
    lockable?: boolean;
}

export function NavButton({
    item,
    isActive,
    isLocked,
    isLockable,
    onClick,
    onToggleLock,
}: {
    item: NavItemType;
    isActive: boolean;
    isLocked: boolean;
    isLockable: boolean;
    onClick: () => void;
    onToggleLock: () => void;
}) {
    const Icon = item.icon;

    return (
        <button
            type="button"
            onClick={onClick}
            onContextMenu={(event) => {
                if (!isLockable) return;
                event.preventDefault();
                onToggleLock();
            }}
            className={`flex items-center gap-1 px-2 md:px-3 py-1.5 text-sm md:text-base font-medium transition-all duration-200 whitespace-nowrap ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
            title={isLockable ? (isLocked ? `已锁定${item.name}，右键取消锁定` : `右键锁定${item.name}`) : undefined}
        >
            <Icon className="w-4 h-4" />
            <span className="hidden md:inline">{item.name}</span>
            {isLockable && isLocked && <LockKeyhole className="w-3 h-3 text-primary" aria-label="已锁定" />}
        </button>
    );
}

export function DrawerNavButton({
    item,
    isActive,
    isLocked,
    isLockable,
    onClick,
    onToggleLock,
}: {
    item: NavItemType;
    isActive: boolean;
    isLocked: boolean;
    isLockable: boolean;
    onClick: () => void;
    onToggleLock: () => void;
}) {
    const Icon = item.icon;

    return (
        <div
            className={`w-full flex items-center rounded-xl text-sm font-medium border transition-colors ${isActive
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-card/60 text-muted-foreground border-border/60 hover:text-foreground hover:bg-secondary/50'
            }`}
        >
            <button
                type="button"
                onClick={onClick}
                className="flex min-w-0 flex-1 items-center gap-3 px-3.5 py-3 text-left"
                title={`打开${item.name}`}
            >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
            </button>
            {isLockable && (
                <button
                    type="button"
                    onClick={onToggleLock}
                    className={`mr-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors focus-ring ${
                        isLocked
                            ? 'bg-primary/10 text-primary hover:bg-primary/15'
                            : 'text-muted-foreground/40 hover:bg-secondary/60 hover:text-muted-foreground'
                    }`}
                    aria-label={isLocked ? `解除${item.name}锁定` : `锁定${item.name}`}
                    aria-pressed={isLocked}
                    title={isLocked ? `解除${item.name}锁定` : `锁定${item.name}`}
                >
                    {isLocked
                        ? <LockKeyhole className="h-4 w-4" />
                        : <LockKeyholeOpen className="h-4 w-4" />}
                </button>
            )}
        </div>
    );
}
