import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface Option<T extends string | number = string | number> {
    label: string;
    value: T;
}

interface CustomSelectProps<T extends string | number> {
    options: Option<T>[];
    value: T;
    onChange: (value: T) => void;
    placeholder?: string;
    className?: string;
    /** form：表单式 select（默认）；toolbar：工具条按钮式（label: 值 + 图标，见 AiChatDrawer 换挡条） */
    variant?: 'form' | 'toolbar';
    /** toolbar 专属：按钮内的「label:」前缀与左侧图标 */
    label?: string;
    icon?: ReactNode;
    disabled?: boolean;
}

export default function CustomSelect<T extends string | number = string>({
    options,
    value,
    onChange,
    placeholder = '请选择',
    className = '',
    variant = 'form',
    label,
    icon,
    disabled = false,
}: CustomSelectProps<T>) {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);
    const displayText = selectedOption?.label ?? (variant === 'form' ? placeholder : (value || placeholder));

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    if (variant === 'toolbar') {
        return (
            <div className={`relative inline-block ${isOpen ? 'z-50' : 'z-10'} ${className}`} ref={selectRef}>
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setIsOpen((prev) => !prev)}
                    className={`flex items-center gap-1.5 px-3 h-10 text-[13px] rounded-lg border border-border/80 bg-background/90 hover:bg-muted/70 text-foreground transition-all duration-150 cursor-pointer select-none focus:outline-none focus:ring-1 focus:ring-primary ${
                        disabled ? 'opacity-50 cursor-not-allowed' : ''
                    } ${isOpen ? 'border-primary ring-1 ring-primary/40 bg-muted/50' : ''}`}
                >
                    {icon}
                    {label && <span className="text-muted-foreground">{label}:</span>}
                    <span className="font-medium text-foreground max-w-[100px] sm:max-w-[130px] truncate">
                        {displayText}
                    </span>
                    <ChevronDown
                        className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ${
                            isOpen ? 'rotate-180' : ''
                        }`}
                    />
                </button>

                {isOpen && (
                    <div className="absolute left-0 top-full mt-1.5 z-50 min-w-full w-max max-w-[260px] rounded-xl border border-border/90 bg-popover text-popover-foreground shadow-2xl p-1 text-xs space-y-0.5 max-h-56 overflow-y-auto">
                        {options.map((opt) => {
                            const isSelected = opt.value === value;
                            return (
                                <div
                                    key={opt.value}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors text-left ${
                                        isSelected
                                            ? 'bg-primary/15 text-primary font-medium'
                                            : 'hover:bg-muted text-foreground'
                                    }`}
                                >
                                    <span className="truncate">{opt.label}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`relative ${className}`} ref={selectRef}>
            <div
                className="flex items-center justify-between gap-1 w-full bg-background/80 border border-border/50 rounded-lg px-2 py-1.5 text-sm text-foreground cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="truncate flex-1">{selectedOption ? selectedOption.label : placeholder}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-max min-w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden py-1 max-h-60 overflow-y-auto">
                    {options.map((opt) => (
                        <div
                            key={opt.value}
                            className={`px-3 py-2 text-sm cursor-pointer transition-colors text-left ${opt.value === value ? 'bg-primary/20 text-primary font-medium' : 'hover:bg-muted text-foreground'
                                }`}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                        >
                            {opt.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
