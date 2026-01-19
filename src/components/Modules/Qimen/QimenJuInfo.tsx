import { useMemo, useState } from 'react';
import { Solar } from 'lunar-typescript';
import { Eye, EyeOff, FileText } from 'lucide-react';
import { type QimenHeader } from '../../../lib/csp-qimen/qimenService';
import { type QimenCase } from '../../../services/qimenCaseService';
import { getEightCharFromDate } from '../../../utils/lunarUtil';

interface QimenJuInfoProps {
    date: Date;
    header: QimenHeader;
    caseData: QimenCase | null;
}

// 马星查找表
const MA_XING_MAP: Record<string, string> = {
    '申': '寅', '子': '寅', '辰': '寅',
    '寅': '申', '午': '申', '戌': '申',
    '巳': '亥', '酉': '亥', '丑': '亥',
    '亥': '巳', '卯': '巳', '未': '巳',
};



// 旬空计算
const getXunKong = (ganZhi: string) => {
    if (!ganZhi) return '';
    const gan = ganZhi.substring(0, 1);
    const zhi = ganZhi.substring(1, 2);
    const ganMap: Record<string, number> = { '甲': 1, '乙': 2, '丙': 3, '丁': 4, '戊': 5, '己': 6, '庚': 7, '辛': 8, '壬': 9, '癸': 10 };
    const zhiMap: Record<string, number> = { '子': 1, '丑': 2, '寅': 3, '卯': 4, '辰': 5, '巳': 6, '午': 7, '未': 8, '申': 9, '酉': 10, '戌': 11, '亥': 12 };

    const g = ganMap[gan] || 0;
    const z = zhiMap[zhi] || 0;
    const diff = (z - g + 12) % 12;
    // 0->XuHai, 2->ZiChou, 4->YinMao, 6->ChenSi, 8->WuWei, 10->ShenYou (Corrected)
    const kongMap: Record<number, string> = {
        0: '戌亥', 2: '子丑', 4: '寅卯', 6: '辰巳', 8: '午未', 10: '申酉'
    };
    return kongMap[diff] || '';
};

// 旬首隐藏干映射
const getXunShouSuffix = (xun: string) => {
    if (!xun) return '';
    const map: Record<string, string> = {
        '甲子': '戊',
        '甲戌': '己',
        '甲申': '庚',
        '甲午': '辛',
        '甲辰': '壬',
        '甲寅': '癸'
    };
    return map[xun] || '';
};

// 统一时间格式化
const formatSolarTime = (s: Solar) => {
    const y = s.getYear();
    const m = String(s.getMonth()).padStart(2, '0');
    const d = String(s.getDay()).padStart(2, '0');
    const h = String(s.getHour()).padStart(2, '0');
    const min = String(s.getMinute()).padStart(2, '0');
    return `${y}.${m}.${d} ${h}:${min}`;
};

export default function QimenJuInfo({ date, header, caseData }: QimenJuInfoProps) {
    const [isPrivacyMode, setIsPrivacyMode] = useState(false);

    const info = useMemo(() => {
        const solar = Solar.fromDate(date);
        const lunar = solar.getLunar();
        const eightChar = getEightCharFromDate(date);

        // 节气计算 (上一/当前/下一)
        const currentJieQiObj = lunar.getPrevJieQi(true);
        const nextJieQiObj = lunar.getNextJieQi(false);

        let prevJieQiObj = null;
        if (currentJieQiObj) {
            // 回溯15天找上一个
            const d = currentJieQiObj.getSolar().next(-15);
            prevJieQiObj = d.getLunar().getPrevJieQi(true);
        }

        // 四柱空亡 & 马星
        const pillars = eightChar ? [
            { ganZhi: eightChar.yearGan + eightChar.yearZhi, zhi: eightChar.yearZhi },
            { ganZhi: eightChar.monthGan + eightChar.monthZhi, zhi: eightChar.monthZhi },
            { ganZhi: eightChar.dayGan + eightChar.dayZhi, zhi: eightChar.dayZhi },
            { ganZhi: eightChar.timeGan + eightChar.timeZhi, zhi: eightChar.timeZhi },
        ] : [];

        const kongWangList = pillars.map(p => getXunKong(p.ganZhi));
        const maXingList = pillars.map(p => MA_XING_MAP[p.zhi] || '');

        return {
            prevJieQi: prevJieQiObj ? { name: prevJieQiObj.getName(), time: formatSolarTime(prevJieQiObj.getSolar()) } : { name: '-', time: '-' },
            currentJieQi: currentJieQiObj ? { name: currentJieQiObj.getName(), time: formatSolarTime(currentJieQiObj.getSolar()) } : { name: '-', time: '-' },
            nextJieQi: nextJieQiObj ? { name: nextJieQiObj.getName(), time: formatSolarTime(nextJieQiObj.getSolar()) } : { name: '-', time: '-' },
            kongWang: {
                year: kongWangList[0],
                month: kongWangList[1],
                day: kongWangList[2],
                hour: kongWangList[3],
            },
            maXing: {
                year: maXingList[0],
                month: maXingList[1],
                day: maXingList[2],
                hour: maXingList[3],
            },
        };

    }, [date]);

    // 值符值使提取
    // header.zhiFu: "天任" -> "天任"
    // We need "天任落X宫".
    // The current header.zhiFu is just the name. `qimenService` doesn't output the palace right now in header directly,
    // but we can find it from the `palaces` array or maybe parsing header string if it was there.
    // Actually `QimenHeader` in service has `zhiFu: string`.
    // The screenshot shows: "值符:天蓬落兑7宫".
    // We need to find which palace has `zhiFu` (the star) and `zhiShi` (the door).
    // EXCEPT `QimenHeader` doesn't have the palace info.
    // However, `QimenPage` has `palaces` state.
    // We should pass `palaces` to `QimenJuInfo` if we want to display "落X宫".
    // But `QimenJuInfo` props defined above only has `date` and `header`.
    // I should add `palaces` to props.

    return (
        <div className="h-full flex flex-col bg-card/30 text-card-foreground overflow-y-auto custom-scrollbar">
            {/* 局信息卡片 */}
            <div className="p-6 space-y-5">
                {/* 顶部标题 */}
                <div className="space-y-1">
                    <div className="flex items-baseline gap-3">
                        <span className="text-xl font-bold font-display tracking-wide">
                            {header.jieQi} {header.ju} <span className="text-primary font-mono ml-1">{header.xunShou}{getXunShouSuffix(header.xunShou)}</span>
                        </span>
                    </div>
                </div>

                {/* 节气时间表 - 大气版 */}
                <div className="bg-muted/20 rounded-xl p-5 border border-border/40 shadow-sm space-y-4">
                    {/* 上一节气 */}
                    <div className="flex items-center justify-between text-muted-foreground/80">
                        <div className="flex items-center gap-3">
                            <span className="text-xs bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground">上</span>
                            <span className="font-medium text-base">{info.prevJieQi.name}</span>
                        </div>
                        <span className="font-mono text-sm tracking-wider opacity-80">{info.prevJieQi.time}</span>
                    </div>

                    {/* 现在节气 (Highlight) */}
                    <div className="flex items-center justify-between text-primary relative">
                        {/* 左侧装饰条 */}
                        <div className="absolute -left-5 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full opacity-80" />

                        <div className="flex items-center gap-3">
                            <span className="text-xs bg-primary/10 px-1.5 py-0.5 rounded font-bold">今</span>
                            <span className="font-bold text-lg tracking-wide">{info.currentJieQi.name}</span>
                        </div>
                        <span className="font-mono text-base font-bold tracking-wider">{info.currentJieQi.time}</span>
                    </div>

                    {/* 下一节气 */}
                    <div className="flex items-center justify-between text-muted-foreground/80">
                        <div className="flex items-center gap-3">
                            <span className="text-xs bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground">下</span>
                            <span className="font-medium text-base">{info.nextJieQi.name}</span>
                        </div>
                        <span className="font-mono text-sm tracking-wider opacity-80">{info.nextJieQi.time}</span>
                    </div>
                </div>

                <div className="h-px bg-border/50" />

                {/* 神煞信息 - 表格式对齐 */}
                <div className="space-y-3 text-sm">
                    {/* 空亡 */}
                    <div className="grid grid-cols-[50px_1fr] gap-2 items-center">
                        <span className="text-muted-foreground text-xs">空亡</span>
                        <div className="flex gap-2">
                            {['year', 'month', 'day', 'hour'].map((key) => {
                                const k = key as keyof typeof info.kongWang;
                                const val = info.kongWang[k];
                                const labelMap: Record<string, string> = { year: '年', month: '月', day: '日', hour: '时' };
                                const label = labelMap[key];
                                return (
                                    <div key={key} className="flex items-baseline gap-1 bg-muted/30 border border-border/40 px-2 py-1 rounded">
                                        <span className="text-xs text-muted-foreground/70">{label}</span>
                                        <span className={`font-mono ${key === 'hour' ? 'text-primary font-bold' : 'text-foreground/90'}`}>
                                            {val || '-'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 驿马 */}
                    <div className="grid grid-cols-[50px_1fr] gap-2 items-center">
                        <span className="text-muted-foreground text-xs">驿马</span>
                        <div className="flex gap-2">
                            {['year', 'month', 'day', 'hour'].map((key) => {
                                const k = key as keyof typeof info.maXing;
                                const val = info.maXing[k];
                                const labelMap: Record<string, string> = { year: '年', month: '月', day: '日', hour: '时' };
                                const label = labelMap[key];
                                return (
                                    <div key={key} className="flex items-baseline gap-1 bg-muted/30 border border-border/40 px-2 py-1 rounded">
                                        <span className="text-xs text-muted-foreground/70">{label}</span>
                                        <span className={`font-mono ${key === 'hour' ? 'text-primary font-bold' : 'text-foreground/90'}`}>
                                            {val || '-'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="h-2 bg-muted/20 border-t border-b border-border/10 flex-shrink-0" />

            {/* 案例信息区 */}
            {caseData ? (
                <div className="p-5 space-y-4">
                    {/* 区域标题栏 */}
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-serif font-bold flex items-center gap-2 text-foreground">
                            <FileText className="w-5 h-5" />
                            案例详情
                        </h3>
                        <button
                            onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/50"
                            title={isPrivacyMode ? "显示明文" : "隐藏信息"}
                        >
                            {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>

                    <div className={isPrivacyMode ? "blur-sm opacity-60 select-none transition-all duration-300" : "transition-all duration-300"}>
                        {/* 事情描述 */}
                        <div className="space-y-2 mb-4">
                            <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-primary/80 rounded-full" />
                                事情描述
                            </h4>
                            <div className="text-sm leading-relaxed p-3.5 bg-muted/30 border border-border/30 rounded-lg min-h-[60px] whitespace-pre-wrap text-foreground/90 shadow-sm">
                                {isPrivacyMode
                                    ? '•'.repeat(Math.min((caseData.description?.length || 0), 100)) + ((caseData.description?.length || 0) > 100 ? '...' : '')
                                    : (caseData.description || '无描述')}
                            </div>
                        </div>

                        {/* 事件反馈 */}
                        <div className="space-y-2 mb-4">
                            <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-emerald-500/80 rounded-full" />
                                事件反馈
                            </h4>
                            <div className="text-sm leading-relaxed p-3.5 bg-muted/30 border border-border/30 rounded-lg min-h-[60px] whitespace-pre-wrap text-foreground/90 shadow-sm">
                                {isPrivacyMode
                                    ? '•'.repeat(Math.min((caseData.feedback?.length || 0), 60))
                                    : (caseData.feedback || '暂无反馈')}
                            </div>
                        </div>

                        {/* 案例断法 */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-indigo-500/80 rounded-full" />
                                案例断法
                            </h4>
                            <div className="text-sm leading-relaxed p-3.5 bg-muted/30 border border-border/30 rounded-lg min-h-[80px] whitespace-pre-wrap text-foreground/90 shadow-sm">
                                {isPrivacyMode
                                    ? '•'.repeat(Math.min((caseData.analysis?.length || 0), 80))
                                    : (caseData.analysis || '暂无断语')}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-8 text-center flex flex-col items-center justify-center h-40 text-muted-foreground/60 gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <line x1="10" y1="9" x2="8" y2="9" />
                    </svg>
                    <span className="text-sm">暂无关联案例信息</span>
                </div>
            )}
        </div>
    );
}
