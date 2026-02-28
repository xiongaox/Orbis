import type { ComponentType } from 'react';

export interface NavItemType {
    id: any;
    name: string;
    icon: ComponentType<{ className?: string }>;
    priority: 'core' | 'extra';
}

export function NavButton({
    item,
    isActive,
    onClick,
}: {
    item: NavItemType;
    isActive: boolean;
    onClick: () => void;
}) {
    const Icon = item.icon;
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center gap-1 px-2 md:px-3 py-1.5 text-sm md:text-base font-medium transition-all duration-200 whitespace-nowrap ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
        >
            <Icon className="w-4 h-4" />
            <span className="hidden md:inline">{item.name}</span>
        </button>
    );
}

export function DrawerNavButton({
    item,
    isActive,
    onClick,
}: {
    item: NavItemType;
    isActive: boolean;
    onClick: () => void;
}) {
    const Icon = item.icon;
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium border transition-colors ${isActive
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-card/60 text-muted-foreground border-border/60 hover:text-foreground hover:bg-secondary/50'
                }`}
        >
            <Icon className="w-4 h-4" />
            <span>{item.name}</span>
        </button>
    );
}
