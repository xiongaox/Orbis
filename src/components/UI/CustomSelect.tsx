import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
    label: string;
    value: string | number;
}

interface CustomSelectProps {
    options: Option[];
    value: string | number;
    onChange: (value: string | number) => void;
    placeholder?: string;
    className?: string;
}

export default function CustomSelect({ options, value, onChange, placeholder = '请选择', className = '' }: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value) || options[0];

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
