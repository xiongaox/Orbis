import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { baziReverseSearch, type BaziSearchResult } from '../../lib/xuan-bazi/utils/baziSearchUtil';

interface BaziDatePickerProps {
    onChange?: (val: any) => void;
    onSelectDate?: (date: Date) => void;
}

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// Element Colors
const ELEMENT_COLORS: Record<string, string> = {
    '甲': 'text-[#22c55e]', '乙': 'text-[#22c55e]', // Wood
    '丙': 'text-[#ef4444]', '丁': 'text-[#ef4444]', // Fire
    '戊': 'text-[#a16207]', '己': 'text-[#a16207]', // Earth
    '庚': 'text-[#d97706]', '辛': 'text-[#d97706]', // Metal
    '壬': 'text-[#2563eb]', '癸': 'text-[#2563eb]', // Water

    '寅': 'text-[#22c55e]', '卯': 'text-[#22c55e]',
    '巳': 'text-[#ef4444]', '午': 'text-[#ef4444]',
    '辰': 'text-[#a16207]', '戌': 'text-[#a16207]', '丑': 'text-[#a16207]', '未': 'text-[#a16207]',
    '申': 'text-[#d97706]', '酉': 'text-[#d97706]',
    '亥': 'text-[#2563eb]', '子': 'text-[#2563eb]',
};

// Background colors match the text color but very light (opacity 5-10%)
const ELEMENT_BG_COLORS: Record<string, string> = {
    '甲': 'bg-[#22c55e]/5', '乙': 'bg-[#22c55e]/5',
    '丙': 'bg-[#ef4444]/5', '丁': 'bg-[#ef4444]/5',
    '戊': 'bg-[#a16207]/5', '己': 'bg-[#a16207]/5',
    '庚': 'bg-[#d97706]/5', '辛': 'bg-[#d97706]/5',
    '壬': 'bg-[#2563eb]/5', '癸': 'bg-[#2563eb]/5',

    '寅': 'bg-[#22c55e]/5', '卯': 'bg-[#22c55e]/5',
    '巳': 'bg-[#ef4444]/5', '午': 'bg-[#ef4444]/5',
    '辰': 'bg-[#a16207]/5', '戌': 'bg-[#a16207]/5', '丑': 'bg-[#a16207]/5', '未': 'bg-[#a16207]/5',
    '申': 'bg-[#d97706]/5', '酉': 'bg-[#d97706]/5',
    '亥': 'bg-[#2563eb]/5', '子': 'bg-[#2563eb]/5',
};

const getElementColor = (char: string) => ELEMENT_COLORS[char] || 'text-foreground';
const getElementBg = (char: string) => ELEMENT_BG_COLORS[char] || 'bg-muted/50';

type SlotIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7; // Y-Gan, Y-Zhi, M-Gan, M-Zhi, D-Gan, D-Zhi, H-Gan, H-Zhi

export default function BaziDatePicker({ onChange, onSelectDate }: BaziDatePickerProps) {
    // Array of 8 nulls
    const [slots, setSlots] = useState<(string | null)[]>(Array(8).fill(null));
    const [activeSlot, setActiveSlot] = useState<SlotIndex | null>(0);
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<BaziSearchResult[]>([]);
    const [showResults, setShowResults] = useState(false);

    const handleSelect = (char: string) => {
        if (activeSlot === null) return;

        const newSlots = [...slots];
        newSlots[activeSlot] = char;
        setSlots(newSlots);
        onChange?.(newSlots);

        // Auto advance
        if (activeSlot < 7) {
            setActiveSlot((activeSlot + 1) as SlotIndex);
        } else {
            setActiveSlot(null);
        }
    };

    const handleClear = () => {
        setSlots(Array(8).fill(null));
        setActiveSlot(0);
        setSearchResults([]);
        setShowResults(false);
        onChange?.(Array(8).fill(null));
    };

    const handleSearch = async () => {
        if (slots.some(s => !s)) {
            alert('请完整填写四柱信息');
            return;
        }

        setIsSearching(true);
        try {
            const target = {
                yearGan: slots[0]!, yearZhi: slots[1]!,
                monthGan: slots[2]!, monthZhi: slots[3]!,
                dayGan: slots[4]!, dayZhi: slots[5]!,
                hourGan: slots[6]!, hourZhi: slots[7]!
            };

            const results = await baziReverseSearch(target);
            setSearchResults(results);

            if (results.length === 0) {
                alert('未找到匹配的日期 (1900-2100年)');
            } else if (results.length === 1 && onSelectDate) {
                onSelectDate(results[0].solarDate);
            } else {
                setShowResults(true);
            }
        } catch (e) {
            console.error(e);
            alert('查询出错');
        } finally {
            setIsSearching(false);
        }
    };

    const isSelectingStem = activeSlot !== null && activeSlot % 2 === 0;

    // Filter logic for Branches based on Stem polarity
    let currentOptions = isSelectingStem ? STEMS : BRANCHES;

    if (!isSelectingStem && activeSlot !== null) {
        const stemSlotIndex = activeSlot - 1;
        const selectedStem = slots[stemSlotIndex];

        if (selectedStem) {
            const stemIndex = STEMS.indexOf(selectedStem);
            const isYang = stemIndex % 2 === 0;
            currentOptions = BRANCHES.filter((_, idx) => (idx % 2 === 0) === isYang);
        }
    }

    return (
        <div className="flex flex-col h-full bg-popover">
            {/* Pillars Display Area */}
            <div className="grid grid-cols-4 gap-4 px-6 py-6 border-b border-border bg-popover z-10 shadow-sm relative">
                {['年柱', '月柱', '日柱', '时柱'].map((label, colIndex) => {
                    const ganIndex = colIndex * 2;
                    const zhiIndex = colIndex * 2 + 1;

                    const ganValue = slots[ganIndex];
                    const zhiValue = slots[zhiIndex];

                    const isGanActive = activeSlot === ganIndex;
                    const isZhiActive = activeSlot === zhiIndex;

                    return (
                        <div key={colIndex} className="flex flex-col items-center gap-3">
                            <span className="text-sm text-foreground font-medium select-none">{label}</span>

                            {/* Stem Slot */}
                            <div
                                onClick={() => setActiveSlot(ganIndex as SlotIndex)}
                                className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-serif font-bold cursor-pointer transition-all duration-200 select-none border
                                    ${isGanActive ? 'border-primary shadow-[0_0_10px_rgba(var(--primary),0.3)] bg-background' : 'border-border/30 bg-muted hover:bg-muted/80'}
                                    ${ganValue ? getElementColor(ganValue) : ''}
                                `}
                                style={{
                                    backgroundColor: ganValue && !isGanActive ? ELEMENT_BG_COLORS[ganValue]?.replace('/5', '/10') : undefined
                                }}
                            >
                                {ganValue}
                            </div>

                            {/* Branch Slot */}
                            <div
                                onClick={() => setActiveSlot(zhiIndex as SlotIndex)}
                                className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-serif font-bold cursor-pointer transition-all duration-200 select-none border
                                    ${isZhiActive ? 'border-primary shadow-[0_0_10px_rgba(var(--primary),0.3)] bg-background' : 'border-border/30 bg-muted hover:bg-muted/80'}
                                    ${zhiValue ? getElementColor(zhiValue) : ''}
                                `}
                                style={{
                                    backgroundColor: zhiValue && !isZhiActive ? ELEMENT_BG_COLORS[zhiValue]?.replace('/5', '/10') : undefined
                                }}
                            >
                                {zhiValue}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Range & Actions */}
            <div className="flex items-center justify-between px-6 py-3 text-xs text-muted-foreground bg-popover z-10 border-b border-border">
                <span>范围：1900-2100</span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSearch}
                        disabled={isSearching}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full transition-all text-xs font-medium border border-transparent
                            ${isSearching ? 'bg-muted text-muted-foreground cursor-wait' : 'bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/20 active:scale-95'}
                        `}
                    >
                        {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                        {isSearching ? '...' : '反查'}
                    </button>
                    <div className="w-[1px] h-3 bg-border mx-1" />
                    <button
                        onClick={handleClear}
                        className="hover:text-foreground px-2 py-1.5 rounded-md hover:bg-muted transition-colors"
                    >
                        清除
                    </button>
                </div>
            </div>

            {/* Selection Grid or Results */}
            <div className="flex-1 overflow-y-auto w-full p-4 relative min-h-0">
                {showResults ? (
                    <div className="flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-2 px-1">
                            <span className="text-sm font-medium text-foreground">找到 {searchResults.length} 个结果:</span>
                            <button onClick={() => setShowResults(false)} className="text-xs text-primary hover:underline">返回修改</button>
                        </div>
                        {searchResults.map((res, i) => (
                            <button
                                key={i}
                                onClick={() => onSelectDate?.(res.solarDate)}
                                className="p-3 rounded-xl bg-muted/50 hover:bg-accent border border-transparent hover:border-border text-left text-sm transition-all flex items-center justify-between group"
                            >
                                <span className="font-mono text-foreground/90">{res.description}</span>
                                <span className="opacity-0 group-hover:opacity-100 text-primary text-xs font-medium bg-primary/10 px-2 py-1 rounded-full transition-opacity">选择</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-5 gap-3 pb-8">
                        {currentOptions.map((char) => (
                            <button
                                key={char}
                                onClick={() => handleSelect(char)}
                                className={`
                                    aspect-square rounded-xl flex items-center justify-center text-xl font-serif font-bold transition-all
                                    ${getElementColor(char)}
                                    ${getElementBg(char)}
                                    hover:brightness-95 active:scale-95
                                `}
                            >
                                {char}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
