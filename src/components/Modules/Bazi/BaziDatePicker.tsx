/**
 * BaziDatePicker - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：承载具体业务模块的前端功能
 *
 * 关键职责：
 * - 渲染 UI 视图并处理交互逻辑
 * - 处理用户输入与展示边界行为
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `default BaziDatePicker`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、外部依赖 `lucide-react`、内部模块 `baziSearchUtil`、`baziJichuMap`、`baziStyleMap`、`useToast`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { useState } from 'react';
import { Loader2, Search, ChevronRight } from 'lucide-react';
import { baziReverseSearch, type BaziSearchResult, type BaziTarget } from '../../../lib/xuan-bazi/utils/baziSearchUtil';
import { TIAN_GAN, DI_ZHI } from '../../../lib/xuan-bazi/maps/baziJichuMap';
import { getElementTextColor } from '../../../lib/xuan-bazi/maps/baziStyleMap';
import { useToast } from '../../../hooks/useToast';
import Toast from '../../Common/Toast';
import { cn } from '../../../lib/utils';

interface BaziDatePickerProps {
    onChange?: (val: (string | null)[]) => void;
    onSelectDate?: (date: Date) => void;
}

type SlotIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7; // Y-Gan, Y-Zhi, M-Gan, M-Zhi, D-Gan, D-Zhi, H-Gan, H-Zhi

const STEMS: string[] = [...TIAN_GAN];
const BRANCHES: string[] = [...DI_ZHI];
// 键盘固定双行：天干按序 2×5，地支按阴阳 2×6（偶位为阳），键数与行数不随输入状态跳动
const STEM_ROWS: string[][] = [STEMS.slice(0, 5), STEMS.slice(5)];
const YANG_ZHI: string[] = DI_ZHI.filter((_, i) => i % 2 === 0);
const YIN_ZHI: string[] = DI_ZHI.filter((_, i) => i % 2 === 1);
const PILLAR_NAMES = ['年', '月', '日', '时'] as const;

// 从 from+1 起找下一个空位，找不到则回绕到第一个空位；全部填满返回 null（四柱已成）
function nextEmptySlot(arr: (string | null)[], from: SlotIndex): SlotIndex | null {
    for (let i = from + 1; i < arr.length; i++) {
        if (!arr[i]) return i as SlotIndex;
    }
    for (let i = 0; i < arr.length; i++) {
        if (!arr[i]) return i as SlotIndex;
    }
    return null;
}

export default function BaziDatePicker({ onChange, onSelectDate }: BaziDatePickerProps) {
    const [slots, setSlots] = useState<(string | null)[]>(Array(8).fill(null));
    const [activeSlot, setActiveSlot] = useState<SlotIndex | null>(0);
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<BaziSearchResult[]>([]);
    const [showResults, setShowResults] = useState(false);
    const { toast, showToast } = useToast();

    const isComplete = slots.every(Boolean);

    const handleSelect = (char: string) => {
        if (activeSlot === null) return;

        const newSlots = [...slots];
        newSlots[activeSlot] = char;

        // 天干换到另一阴阳后，同柱旧地支必然失配（如 乙寅）：清掉地支，让焦点落回地支位强制重选
        if (activeSlot % 2 === 0) {
            const zhi = newSlots[activeSlot + 1];
            if (zhi && (BRANCHES.indexOf(zhi) % 2 === 0) !== (STEMS.indexOf(char) % 2 === 0)) {
                newSlots[activeSlot + 1] = null;
            }
        }

        setSlots(newSlots);
        onChange?.(newSlots);
        setActiveSlot(nextEmptySlot(newSlots, activeSlot));
    };

    const handleSlotClick = (index: SlotIndex) => {
        // 任意字位（含已填地支）点击后直接聚焦该位；失配由 handleSelect 选天干时兜底清理
        setActiveSlot(index);
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
            showToast('请先完整填写四柱', 'error');
            return;
        }

        setIsSearching(true);
        try {
            const target: BaziTarget = {
                yearGan: slots[0]!, yearZhi: slots[1]!,
                monthGan: slots[2]!, monthZhi: slots[3]!,
                dayGan: slots[4]!, dayZhi: slots[5]!,
                hourGan: slots[6]!, hourZhi: slots[7]!
            };

            const results = await baziReverseSearch(target);
            setSearchResults(results);

            if (results.length === 0) {
                showToast('未找到匹配的日期 (1900-2100年)', 'error');
            } else if (results.length === 1 && onSelectDate) {
                onSelectDate(results[0].solarDate);
            } else {
                setShowResults(true);
            }
        } catch (e) {
            console.error(e);
            showToast('查询出错', 'error');
        } finally {
            setIsSearching(false);
        }
    };

    // 键盘行数据：天干轮全开放；地支轮按同柱天干阴阳锁定另一组（天干未定时两组都开放）
    const keyboardRows: { chars: string[]; enabled: boolean }[] = (() => {
        if (activeSlot === null) {
            return STEM_ROWS.map(chars => ({ chars, enabled: false }));
        }
        if (activeSlot % 2 === 0) {
            return STEM_ROWS.map(chars => ({ chars, enabled: true }));
        }
        const ganValue = slots[activeSlot - 1];
        if (!ganValue) {
            return [
                { chars: YANG_ZHI, enabled: true },
                { chars: YIN_ZHI, enabled: true },
            ];
        }
        const isYangStem = STEMS.indexOf(ganValue) % 2 === 0;
        return [
            { chars: YANG_ZHI, enabled: isYangStem },
            { chars: YIN_ZHI, enabled: !isYangStem },
        ];
    })();

    const hint = (() => {
        if (activeSlot === null) {
            return <>四柱已成，可<span className="font-medium text-primary">反查日期</span></>;
        }
        const name = PILLAR_NAMES[Math.floor(activeSlot / 2)];
        if (activeSlot % 2 === 0) {
            return <>正在输入 · <span className="font-medium text-primary">{name}柱天干</span></>;
        }
        const ganValue = slots[activeSlot - 1];
        const pairHint = ganValue ? ` · 取${STEMS.indexOf(ganValue) % 2 === 0 ? '阳' : '阴'}支` : '';
        return <>正在输入 · <span className="font-medium text-primary">{name}柱地支</span>{pairHint}</>;
    })();

    return (
        <div className="flex h-full flex-col bg-popover">
            {/* 柱卡区：每柱一张竖卡，衬线大字直接落卡，空位以「干 / 支」水印占位 */}
            <div className="grid grid-cols-4 gap-2 px-4 pt-4">
                {PILLAR_NAMES.map((name, col) => {
                    const ganIndex = (col * 2) as SlotIndex;
                    const zhiIndex = (col * 2 + 1) as SlotIndex;
                    return (
                        <div key={name} className="flex flex-col items-center rounded-xl border border-border/60 bg-secondary/30 px-1 pb-3 pt-2">
                            <span className="select-none text-[10px] tracking-[0.2em] text-muted-foreground">{name}</span>
                            <PillarSlot index={ganIndex} value={slots[ganIndex]} activeSlot={activeSlot} onSelect={handleSlotClick} />
                            <span className="my-1 h-px w-3.5 bg-border" />
                            <PillarSlot index={zhiIndex} value={slots[zhiIndex]} activeSlot={activeSlot} onSelect={handleSlotClick} />
                        </div>
                    );
                })}
            </div>

            {/* 输入进度点：8 点对应 8 字 */}
            <div className="flex justify-center gap-3 pb-2 pt-3">
                {PILLAR_NAMES.map((name, col) => (
                    <div key={name} className="flex gap-1">
                        {[0, 1].map(k => {
                            const i = (col * 2 + k) as SlotIndex;
                            return (
                                <span
                                    key={k}
                                    className={cn(
                                        'h-1.5 w-1.5 rounded-full transition-colors',
                                        slots[i]
                                            ? 'bg-primary'
                                            : activeSlot === i
                                                ? 'animate-pen-breathe border-[1.5px] border-primary bg-transparent'
                                                : 'bg-muted-foreground/25'
                                    )}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* 状态行：当前输入位置 / 配对规则 / 有效年份范围 */}
            <div className="flex items-center justify-between px-5 pb-3 text-xs text-muted-foreground">
                <span>{hint}</span>
                <span>范围 1900–2100</span>
            </div>

            {/* 字盘 / 反查结果 */}
            {showResults ? (
                <div className="max-h-56 overflow-y-auto px-4">
                    <div className="mb-2 flex items-center justify-between px-1">
                        <span className="text-sm font-medium text-foreground">找到 {searchResults.length} 个结果</span>
                        <button
                            type="button"
                            onClick={() => {
                                setShowResults(false);
                                setActiveSlot(prev => (prev === null ? 0 : prev));
                            }}
                            className="text-xs text-primary hover:underline"
                        >
                            返回修改
                        </button>
                    </div>
                    {searchResults.map((res, i) => (
                        <button
                            type="button"
                            key={i}
                            onClick={() => onSelectDate?.(res.solarDate)}
                            className="mb-2 flex w-full items-center justify-between rounded-xl border border-border/60 bg-secondary/40 px-3.5 py-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 active:bg-primary/10"
                        >
                            <span className="font-mono text-sm text-foreground/90">{res.description}</span>
                            <ChevronRight className="h-4 w-4 text-primary" />
                        </button>
                    ))}
                </div>
            ) : (
                <div className="min-h-0 flex-1 px-3">
                    {keyboardRows.map((row, r) => (
                        <div key={r} className="mb-1.5 flex gap-1.5">
                            {row.chars.map(char => (
                                <button
                                    type="button"
                                    key={char}
                                    onClick={() => handleSelect(char)}
                                    disabled={!row.enabled}
                                    className={cn(
                                        'h-11 flex-1 select-none rounded-lg font-serif text-xl font-semibold transition-all active:scale-95 active:bg-muted',
                                        getElementTextColor(char),
                                        row.enabled ? 'hover:bg-muted/40' : 'pointer-events-none opacity-15'
                                    )}
                                >
                                    {char}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* 动作行：清除 + 反查（四柱填满后升为主按钮） */}
            <div className="flex items-center gap-2.5 px-4 pb-4 pt-1">
                <button
                    type="button"
                    onClick={handleClear}
                    className="h-11 rounded-lg border border-border px-4 text-sm text-muted-foreground transition-colors hover:text-foreground active:bg-muted/40"
                >
                    清除
                </button>
                <button
                    type="button"
                    onClick={handleSearch}
                    disabled={isSearching}
                    className={cn(
                        'flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-all active:scale-[0.99]',
                        isComplete
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'bg-primary/10 text-primary hover:bg-primary/15'
                    )}
                >
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    反查日期
                </button>
            </div>

            <Toast toast={toast} />
        </div>
    );
}

interface PillarSlotProps {
    index: SlotIndex;
    value: string | null;
    activeSlot: SlotIndex | null;
    onSelect: (index: SlotIndex) => void;
}

/** 柱内单字位：空位显示「干 / 支」水印，当前输入位以呼吸金线标记笔位 */
function PillarSlot({ index, value, activeSlot, onSelect }: PillarSlotProps) {
    const isGan = index % 2 === 0;
    const isActive = activeSlot === index;
    return (
        <button
            type="button"
            onClick={() => onSelect(index)}
            aria-label={`${PILLAR_NAMES[Math.floor(index / 2)]}柱${isGan ? '天干' : '地支'}`}
            className="relative flex h-[46px] w-full items-center justify-center"
        >
            <span
                className={cn(
                    'select-none font-serif text-3xl font-bold leading-none',
                    value ? getElementTextColor(value) : 'text-muted-foreground/25'
                )}
            >
                {value ?? (isGan ? '干' : '支')}
            </span>
            {isActive && (
                <span className="absolute bottom-0 left-1/2 h-[2.5px] w-6 -translate-x-1/2 animate-pen-breathe rounded-full bg-primary" />
            )}
        </button>
    );
}
