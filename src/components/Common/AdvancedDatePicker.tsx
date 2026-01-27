import { useState, useEffect, useRef } from 'react';
import { getLunarToSolarDate, getSolarToLunarInfo } from '../../utils/lunarUtil';
import BaziDatePicker from '../Modules/Bazi/BaziDatePicker';

interface AdvancedDatePickerProps {
    value?: string | Date; // Can be ISO string or Date object
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (date: Date) => void;
    hideBazi?: boolean;
}

type PickerMode = 'solar' | 'lunar' | 'bazi';

// Generate ranges
const YEARS = Array.from({ length: 200 }, (_, i) => 1900 + i); // 1900-2099
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const LUNAR_MONTHS = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
const LUNAR_DAYS = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

// Common styles
const PICKER_HEIGHT = 200;
const ITEM_HEIGHT = 40;

export default function AdvancedDatePicker({ value, isOpen, onClose, onConfirm, hideBazi = false }: AdvancedDatePickerProps) {
    const [mode, setMode] = useState<PickerMode>('solar');
    const [displayDate, setDisplayDate] = useState<string>('');

    // Internal State
    const [year, setYear] = useState(1990);
    const [month, setMonth] = useState(1);
    const [day, setDay] = useState(1);
    const [hour, setHour] = useState(0);
    const [minute, setMinute] = useState(0);

    // Lunar specific
    const [isLeap, setIsLeap] = useState(false);



    // Initialize from props
    useEffect(() => {
        if (isOpen) {
            const date = value ? new Date(value) : new Date();
            if (isNaN(date.getTime())) return;

            setYear(date.getFullYear());
            setMonth(date.getMonth() + 1);
            setDay(date.getDate());
            setHour(date.getHours());
            setMinute(date.getMinutes());
            setMode('solar');
            setIsLeap(false);
        }
    }, [isOpen, value]);

    // Update display text
    useEffect(() => {
        if (mode === 'solar') {
            setDisplayDate(`${year}年${month}月${day}日 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
        } else if (mode === 'lunar') {
            const monthStr = LUNAR_MONTHS[month - 1] || `${month}月`;
            const dayStr = LUNAR_DAYS[day - 1] || `${day}日`;
            setDisplayDate(`农历 ${year}年 ${isLeap ? '闰' : ''}${monthStr} ${dayStr} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
        } else if (mode === 'bazi') {
            // For Bazi, we might want to show the selected pillars or a prompt
            setDisplayDate('');
        }
    }, [year, month, day, hour, minute, mode, isLeap]);

    // Manual Input State
    const [manualInput, setManualInput] = useState('');

    const handleManualSubmit = () => {
        // Regex for YYYYMMDDHHmm
        const regex = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})$/;
        const match = manualInput.trim().match(regex);

        if (match) {
            const [_, y, m, d, h, min] = match;
            const newYear = parseInt(y, 10);
            const newMonth = parseInt(m, 10);
            const newDay = parseInt(d, 10);
            const newHour = parseInt(h, 10);
            const newMinute = parseInt(min, 10);

            // Simple validation
            // Check year range
            if (newYear < 1900 || newYear > 2099) {
                alert('年份超出范围 (1900-2099)');
                return;
            }
            // Check month
            if (newMonth < 1 || newMonth > 12) {
                alert('月份格式错误');
                return;
            }
            // Check day (rough check, rely on Date autocorrector or check max days)
            const maxDays = getDaysInMonth(newYear, newMonth);
            if (newDay < 1 || newDay > maxDays) {
                alert(`日期格式错误，${newMonth}月只有${maxDays}天`);
                return;
            }
            // Check time
            if (newHour < 0 || newHour > 23 || newMinute < 0 || newMinute > 59) {
                alert('时间格式错误');
                return;
            }

            setYear(newYear);
            setMonth(newMonth);
            setDay(newDay);
            setHour(newHour);
            setMinute(newMinute);
            setManualInput(''); // Clear on success
        } else {
            alert('格式不正确，请输入12位数字 (如: 199303270255)');
        }
    };

    // Mode Switch Logic
    const handleModeChange = (newMode: PickerMode) => {
        if (newMode === mode) return;

        // 1. Get current Solar Date object
        let solarDate: Date;
        try {
            if (mode === 'solar') {
                solarDate = new Date(year, month - 1, day, hour, minute);
            } else if (mode === 'lunar') {
                // 使用 lunarUtil 封装的函数
                const baseDate = getLunarToSolarDate(year, isLeap ? -month : month, day);
                solarDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hour, minute);
            } else {
                solarDate = new Date();
            }
        } catch (e) {
            console.error("Date conversion failed", e);
            solarDate = new Date();
        }

        // 2. Convert Solar Date to new Mode components
        try {
            if (newMode === 'solar') {
                setYear(solarDate.getFullYear());
                setMonth(solarDate.getMonth() + 1);
                setDay(solarDate.getDate());
            } else if (newMode === 'lunar') {
                // 使用 lunarUtil 封装的函数
                const lunarInfo = getSolarToLunarInfo(solarDate);
                setYear(lunarInfo.year);
                setMonth(Math.abs(lunarInfo.month));
                setDay(lunarInfo.day);
                setIsLeap(lunarInfo.isLeapMonth);
            }
        } catch (e) {
            console.error("Mode conversion failed", e);
        }

        setMode(newMode);
    };

    const handleConfirm = () => {
        try {
            if (mode === 'bazi') {
                alert("请先进行反查，并选择一个匹配的日期");
                return;
            }

            let finalDate: Date;
            if (mode === 'solar') {
                finalDate = new Date(year, month - 1, day, hour, minute);
            } else if (mode === 'lunar') {
                // 使用 lunarUtil 封装的函数
                const baseDate = getLunarToSolarDate(year, isLeap ? -month : month, day);
                finalDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hour, minute);
            } else {
                finalDate = new Date();
            }

            if (isNaN(finalDate.getTime())) throw new Error("Invalid date");
            onConfirm(finalDate);
        } catch (e) {
            console.error(e);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full max-w-md bg-popover rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200 border border-border" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-popover">
                    <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors text-sm px-2 py-1">取消</button>
                    <div className="flex gap-1 bg-muted p-1 rounded-lg">
                        <TabButton active={mode === 'solar'} onClick={() => handleModeChange('solar')}>公历</TabButton>
                        <TabButton active={mode === 'lunar'} onClick={() => handleModeChange('lunar')}>农历</TabButton>
                        {!hideBazi && <TabButton active={mode === 'bazi'} onClick={() => handleModeChange('bazi')}>四柱</TabButton>}
                    </div>
                    <button type="button" onClick={handleConfirm} className="text-primary hover:text-primary/80 font-medium transition-colors text-sm px-2 py-1">确定</button>
                </div>

                {/* Date Display & Manual Input */}
                {mode !== 'bazi' && (
                    <div className="py-4 px-6 bg-popover flex flex-col gap-4 relative z-20">
                        <div className="text-xl font-semibold text-foreground tracking-wide text-center font-mono">
                            {displayDate}
                        </div>

                        {mode === 'solar' && (
                            <div className="relative group">
                                <input
                                    className="w-full bg-transparent border border-white/10 rounded-xl px-4 py-2.5 text-sm text-center text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-white/20 focus:bg-white/5 transition-all font-mono tracking-wider"
                                    placeholder="输入如 199303271030"
                                    value={manualInput}
                                    onChange={e => {
                                        const val = e.target.value.replace(/\D/g, ''); // Only numbers
                                        if (val.length <= 12) setManualInput(val);
                                    }}
                                    onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
                                />
                                <div className={`absolute right-1.5 top-1.5 bottom-1.5 transition-opacity duration-200 ${manualInput.length === 12 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                    <button
                                        type="button"
                                        onClick={handleManualSubmit}
                                        className="h-full px-3 bg-primary/20 hover:bg-primary/30 text-primary text-xs font-medium rounded-lg transition-colors flex items-center"
                                    >
                                        确认
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Bazi Picker Area */}
                {mode === 'bazi' ? (
                    <div className="h-[430px] bg-popover border-t border-border">
                        <BaziDatePicker
                            onSelectDate={(date) => {
                                // Sync local state and switch to solar mode for review
                                setYear(date.getFullYear());
                                setMonth(date.getMonth() + 1);
                                setDay(date.getDate());
                                setHour(date.getHours());
                                setMinute(date.getMinutes());

                                // Switch to solar mode for review instead of auto-confirming
                                setMode('solar');
                            }}
                        />
                    </div>
                ) : (
                    /* Solar/Lunar Picker Area */
                    <div className="relative bg-popover" style={{ height: PICKER_HEIGHT }}>
                        {/* Highlight Bar */}
                        <div className="absolute top-1/2 left-0 right-0 -mt-[20px] h-[40px] bg-primary/20 pointer-events-none z-10 border-y border-primary/30" />

                        {/* Gradient Masks */}
                        <div className="absolute top-0 left-0 right-0 h-[80px] bg-gradient-to-b from-popover to-transparent pointer-events-none z-10" />
                        <div className="absolute bottom-0 left-0 right-0 h-[80px] bg-gradient-to-t from-popover to-transparent pointer-events-none z-10" />

                        <div className="flex h-full justify-center px-4">
                            {/* Year */}
                            <PickerColumn
                                items={YEARS}
                                value={year}
                                onChange={setYear}
                                label="年"
                                formatItem={v => `${v}`}
                            />

                            {/* Month */}
                            <PickerColumn
                                items={Array.from({ length: 12 }, (_, i) => i + 1)}
                                value={month}
                                onChange={setMonth}
                                label={mode === 'solar' ? "月" : ""}
                                formatItem={v => mode === 'solar' ? String(v) : (LUNAR_MONTHS[v - 1] || String(v))}
                                width="w-20"
                            />

                            {/* Day */}
                            <PickerColumn
                                items={mode === 'solar'
                                    ? Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1)
                                    : Array.from({ length: 30 }, (_, i) => i + 1)
                                }
                                value={day}
                                onChange={setDay}
                                label={mode === 'solar' ? "日" : ""}
                                formatItem={v => mode === 'solar' ? String(v) : (LUNAR_DAYS[v - 1] || String(v))}
                                width="w-20"
                            />

                            {/* Hour */}
                            <PickerColumn
                                items={HOURS}
                                value={hour}
                                onChange={setHour}
                                label="时"
                                formatItem={v => String(v).padStart(2, '0')}
                            />

                            {/* Minute */}
                            <PickerColumn
                                items={MINUTES}
                                value={minute}
                                onChange={setMinute}
                                label="分"
                                formatItem={v => String(v).padStart(2, '0')}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function TabButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${active ? 'bg-popover text-popover-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
        >
            {children}
        </button>
    );
}

interface PickerColumnProps {
    items: number[];
    value: number;
    onChange: (v: number) => void;
    label?: string;
    formatItem: (v: number) => string;
    width?: string;
}

function PickerColumn({ items, value, onChange, label, formatItem, width = "flex-1" }: PickerColumnProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const isScrolling = useRef(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Initial scroll
    useEffect(() => {
        if (scrollRef.current) {
            const index = items.indexOf(value);
            if (index !== -1) {
                scrollRef.current.scrollTop = index * ITEM_HEIGHT;
            }
        }
    }, []);

    // Sync external value change
    useEffect(() => {
        if (!isScrolling.current && scrollRef.current) {
            const index = items.indexOf(value);
            if (index !== -1 && Math.abs(scrollRef.current.scrollTop - index * ITEM_HEIGHT) > 5) {
                scrollRef.current.scrollTop = index * ITEM_HEIGHT;
            }
        }
    }, [value, items]);

    const handleScroll = () => {
        isScrolling.current = true;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            isScrolling.current = false;
            if (!scrollRef.current) return;

            const scrollTop = scrollRef.current.scrollTop;
            const index = Math.round(scrollTop / ITEM_HEIGHT);
            const clampedIndex = Math.max(0, Math.min(index, items.length - 1));

            scrollRef.current.scrollTo({
                top: clampedIndex * ITEM_HEIGHT,
                behavior: 'smooth'
            });

            if (items[clampedIndex] !== value) {
                onChange(items[clampedIndex]);
            }
        }, 150);
    };

    return (
        <div className={`h-full relative group ${width}`}>
            <div
                ref={scrollRef}
                className="h-full overflow-y-scroll no-scrollbar py-[80px]"
                onScroll={handleScroll}
                style={{ scrollSnapType: 'y mandatory', scrollBehavior: 'smooth' }}
            >
                {items.map(item => (
                    <div
                        key={item}
                        className={`h-[40px] flex items-center justify-center snap-center text-sm transition-all duration-200 cursor-pointer select-none ${item === value ? 'text-foreground font-medium scale-110 opacity-100' : 'text-muted-foreground scale-95 opacity-50'
                            }`}
                        onClick={() => {
                            if (scrollRef.current) {
                                scrollRef.current.scrollTo({
                                    top: items.indexOf(item) * ITEM_HEIGHT,
                                    behavior: 'smooth'
                                });
                                onChange(item);
                            }
                        }}
                    >
                        {formatItem(item)}{label}
                    </div>
                ))}
            </div>
        </div>
    );
}

function getDaysInMonth(year: number, month: number) {
    if (!year || !month) return 31;
    return new Date(year, month, 0).getDate();
}
