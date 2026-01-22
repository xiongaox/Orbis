/**
 * 自定义局数弹窗
 * 允许用户选择阴阳遁和局数（1-9），用于手动指定奇门排盘的局数
 */
import { useState } from 'react';

interface CustomJuModalProps {
    isOpen: boolean;
    currentJu: string;  // 当前局数，如 "阳遁三局"
    onClose: () => void;
    onConfirm: (customJu: number) => void;  // customJu: 1~9=阳遁, -1~-9=阴遁
}

const JU_NUM_MAP: Record<string, number> = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9
};

const JU_LABELS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

export default function CustomJuModal({
    isOpen,
    currentJu,
    onClose,
    onConfirm
}: CustomJuModalProps) {
    // 解析当前局数作为默认值
    const parseCurrentJu = () => {
        const match = currentJu.match(/(阳|阴)遁([一二三四五六七八九])局/);
        if (match) {
            return {
                isYang: match[1] === '阳',
                juNum: JU_NUM_MAP[match[2]] || 1
            };
        }
        return { isYang: true, juNum: 1 };
    };

    const defaultJu = parseCurrentJu();
    const [isYang, setIsYang] = useState(defaultJu.isYang);
    const [juNum, setJuNum] = useState(defaultJu.juNum);

    if (!isOpen) return null;

    const handleConfirm = () => {
        // 阳遁用正数，阴遁用负数
        const customJu = isYang ? juNum : -juNum;
        onConfirm(customJu);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* 背景遮罩 */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* 弹窗内容 */}
            <div className="relative bg-card rounded-xl border border-border shadow-2xl w-[90vw] max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* 头部 */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <h3 className="text-lg font-serif font-bold text-foreground">
                        自定义局数
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-muted rounded-lg transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                        </svg>
                    </button>
                </div>

                {/* 内容 */}
                <div className="p-5 space-y-5">
                    {/* 阴阳遁选择 */}
                    <div className="space-y-2">
                        <label className="text-sm text-muted-foreground font-serif">遁法</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsYang(true)}
                                className={`flex-1 py-2 rounded-lg font-serif text-sm transition-colors ${isYang
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                    }`}
                            >
                                阳遁
                            </button>
                            <button
                                onClick={() => setIsYang(false)}
                                className={`flex-1 py-2 rounded-lg font-serif text-sm transition-colors ${!isYang
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                    }`}
                            >
                                阴遁
                            </button>
                        </div>
                    </div>

                    {/* 局数选择 */}
                    <div className="space-y-2">
                        <label className="text-sm text-muted-foreground font-serif">局数</label>
                        <div className="grid grid-cols-3 gap-2">
                            {JU_LABELS.map((label, idx) => {
                                const num = idx + 1;
                                const isSelected = juNum === num;
                                return (
                                    <button
                                        key={num}
                                        onClick={() => setJuNum(num)}
                                        className={`py-3 rounded-lg font-serif text-lg transition-colors ${isSelected
                                            ? 'bg-primary text-primary-foreground font-bold'
                                            : 'bg-muted/50 text-foreground hover:bg-muted'
                                            }`}
                                    >
                                        {label}局
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 预览 */}
                    <div className="text-center py-2 bg-muted/30 rounded-lg">
                        <span className="text-sm text-muted-foreground">选择结果：</span>
                        <span className="ml-2 text-lg font-bold font-serif text-primary">
                            {isYang ? '阳' : '阴'}遁{JU_LABELS[juNum - 1]}局
                        </span>
                    </div>
                </div>

                {/* 底部按钮 */}
                <div className="flex gap-2 px-5 py-4 border-t border-border">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 rounded-lg bg-muted/50 text-muted-foreground font-serif text-sm hover:bg-muted transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-serif text-sm hover:bg-primary/90 transition-colors"
                    >
                        确认排盘
                    </button>
                </div>
            </div>
        </div>
    );
}
