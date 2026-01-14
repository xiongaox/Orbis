import { useState } from 'react';
import { Loader2, Search, ChevronRight } from 'lucide-react';
import { baziReverseSearch, type BaziSearchResult } from '../../lib/xuan-bazi/utils/baziSearchUtil';
import { TIAN_GAN, DI_ZHI } from '../../lib/xuan-bazi/maps/baziJichuMap';
import { getElementTextColor, getElementBgColor } from '../../lib/xuan-bazi/maps/baziStyleMap';

interface BaziDatePickerProps {
    onChange?: (val: any) => void;
    onSelectDate?: (date: Date) => void;
}

const STEMS = [...TIAN_GAN];
const BRANCHES = [...DI_ZHI]; // Keep local names for minimal diff, or refactor usages

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
                yearGan: slots[0]! as any, yearZhi: slots[1]! as any,
                monthGan: slots[2]! as any, monthZhi: slots[3]! as any,
                dayGan: slots[4]! as any, dayZhi: slots[5]! as any,
                hourGan: slots[6]! as any, hourZhi: slots[7]! as any
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
            const stemIndex = STEMS.indexOf(selectedStem as any);
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
                                    ${isGanActive ? 'border-primary shadow-[0_0_10px_rgba(var(--primary),0.3)] bg-transparent' : 'border-border/30 bg-muted hover:bg-muted/80'}
                                    ${ganValue ? getElementTextColor(ganValue) : ''}
                                `}
                                style={{
                                    backgroundColor: ganValue && !isGanActive ? getElementBgColor(ganValue)?.replace('/5', '/10') : undefined
                                }}
                            >
                                {ganValue}
                            </div>

                            {/* Branch Slot */}
                            <div
                                onClick={() => setActiveSlot(zhiIndex as SlotIndex)}
                                className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-serif font-bold cursor-pointer transition-all duration-200 select-none border
                                    ${isZhiActive ? 'border-primary shadow-[0_0_10px_rgba(var(--primary),0.3)] bg-transparent' : 'border-border/30 bg-muted hover:bg-muted/80'}
                                    ${zhiValue ? getElementTextColor(zhiValue) : ''}
                                `}
                                style={{
                                    backgroundColor: zhiValue && !isZhiActive ? getElementBgColor(zhiValue)?.replace('/5', '/10') : undefined
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
                        type="button"
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
                        type="button"
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
                                type="button"
                                key={i}
                                onClick={() => onSelectDate?.(res.solarDate)}
                                className="p-3 rounded-xl bg-muted/30 border border-transparent hover:border-primary/50 hover:bg-primary/5 text-left text-sm transition-all flex items-center justify-between group"
                            >
                                <span className="font-mono text-foreground/90 group-hover:text-primary transition-colors">{res.description}</span>
                                <ChevronRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-5 gap-3 pb-8">
                        {currentOptions.map((char) => (
                            <button
                                type="button"
                                key={char}
                                onClick={() => handleSelect(char)}
                                className={`
                                    aspect-square rounded-xl flex items-center justify-center text-xl font-serif font-bold transition-all
                                    ${getElementTextColor(char)}
                                    ${getElementBgColor(char)}
                                    hover:brightness-95 active:scale-95
                                `}
                            >
                                {char}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div >
    );
}
