import { X } from 'lucide-react';
import { useState } from 'react';

interface JuSelectDialogProps {
    isOpen: boolean;
    onClose: () => void;
    currentJu: number; // 0=Auto, >0 Yang, <0 Yin
    onSelectJu: (ju: number) => void;
}

export default function JuSelectDialog({
    isOpen,
    onClose,
    currentJu,
    onSelectJu,
}: JuSelectDialogProps) {
    const [isYang, setIsYang] = useState(currentJu >= 0); // Default to Yang if 0 or positive

    if (!isOpen) return null;

    // Helper to get selected number (absolute value)
    const selectedNum = currentJu === 0 ? 0 : Math.abs(currentJu);
    // If currentJu is opposite sign of current tab, logic handles it in rendering visual state

    const handleConfirm = (num: number) => {
        // Construct final ju
        // If isYang is true, ju is positive (1-9)
        // If isYang is false, ju is negative (-1 to -9)
        const finalJu = isYang ? num : -num;
        onSelectJu(finalJu);
        onClose();
    };

    const handleAuto = () => {
        onSelectJu(0);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bg-card w-full max-w-sm rounded-lg shadow-lg border border-border animate-in zoom-in-95 fade-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="text-lg font-bold font-serif text-foreground">选择局数</h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Auto Button */}
                    <button
                        onClick={handleAuto}
                        className={`w-full py-2.5 rounded-md font-serif text-sm transition-all border ${currentJu === 0
                            ? 'bg-primary text-primary-foreground border-primary shadow-md'
                            : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                            }`}
                    >
                        自动计算 (Auto)
                    </button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">Or Manual Select</span>
                        </div>
                    </div>

                    {/* Manual Selection */}
                    <div className="space-y-4">
                        {/* Type Toggle */}
                        <div className="flex rounded-md bg-muted p-1">
                            <button
                                onClick={() => setIsYang(true)}
                                className={`flex-1 py-1.5 text-sm font-serif rounded-sm transition-all ${isYang
                                    ? 'bg-background text-foreground shadow-sm font-medium'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                阳遁
                            </button>
                            <button
                                onClick={() => setIsYang(false)}
                                className={`flex-1 py-1.5 text-sm font-serif rounded-sm transition-all ${!isYang
                                    ? 'bg-background text-foreground shadow-sm font-medium'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                阴遁
                            </button>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-3 gap-3">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                                // Checking if this specific button is theoretically active
                                // Active if: not auto (currentJu != 0), signs match, and absolute values match
                                const isActive = currentJu !== 0 &&
                                    (currentJu > 0) === isYang &&
                                    selectedNum === num;

                                return (
                                    <button
                                        key={num}
                                        onClick={() => handleConfirm(num)}
                                        className={`py-3 rounded-md font-serif text-base transition-all border ${isActive
                                            ? 'bg-primary/10 border-primary text-primary font-bold'
                                            : 'bg-muted/10 border-border text-foreground hover:bg-muted/30 hover:border-primary/50'
                                            }`}
                                    >
                                        {isYang ? '阳' : '阴'}{num}局
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
