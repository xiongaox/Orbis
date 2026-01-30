import { cn } from '../../../lib/utils';

interface TabButtonProps {
    active: boolean;
    children: React.ReactNode;
    onClick: () => void;
}

export default function TabButton({ active, children, onClick }: TabButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "px-3 py-1 rounded text-xs font-medium transition-all",
                active ? 'bg-popover text-popover-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
        >
            {children}
        </button>
    );
}
