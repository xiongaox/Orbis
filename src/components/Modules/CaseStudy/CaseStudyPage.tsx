import { useState, useMemo } from 'react';
import { Compass, Grid3X3, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
// Bazi calculation imports
import {
    DI_ZHI_CANG_GAN,
    SHI_SHEN,
    NA_YIN,
    SHI_ER_ZHANG_SHENG,
    TIAN_GAN_WU_XING,
    DI_ZHI_WU_XING,
} from '../../../lib/xuan-bazi/maps';
import { getXunKong, getShiShenAbbr } from '../../../lib/xuan-bazi/utils';
import { getElementColor } from '../../../lib/xuan-bazi/maps/baziStyleMap';
import type { HiddenStem } from '../../../types/bazi';

// 模拟数据：分类列表
const CATEGORIES = [
    { id: 'bazi', label: '命理', name: '八字' },
    { id: 'qimen', label: '预测', name: '奇门' },
    { id: 'liuyao', label: '预测', name: '六爻' },
    { id: 'ziwei', label: '命理', name: '紫薇' },
];

// Helper to extract Bazi from content
// Matches patterns like "坤造：乙丑年，癸未月，甲寅日，戊辰时" or table format
// Simplified regex for the "text" line format as seen in the file
const extractBazi = (content: string): string => {
    // Try to find the line starting with 坤造 or 乾造
    // Example: #### 坤造：乙丑年，癸未月，甲寅日，戊辰时
    const match = content.match(/[乾坤]造[：:]\s*([^\n]+)/);
    if (match) {
        // Remove 年 月 日 时 and punctuation to just get characters
        // "乙丑年，癸未月，甲寅日，戊辰时" -> "乙丑 癸未 甲寅 戊辰"
        let bazi = match[1].replace(/[年月日时，,、\s]+/g, ' ').trim();
        // If it looks too long or messy, try to just take the first 4 pairs if possible
        const pillars = bazi.split(/\s+/);
        if (pillars.length >= 4) {
            return pillars.slice(0, 4).join(' ');
        }
        return bazi;
    }
    // Fallback: try to find table row with #xx# format
    // |1985/07/14-08:00|#坤造#|#甲木#|#身弱#|
    // This doesn't contain the pillars directly usually.
    return "未知八字";
};

// Parse full Bazi info including gender and pillars
interface ParsedBaziInfo {
    gender: '乾造' | '坤造' | null;
    pillars: { ganZhi: string; tiangan: string; dizhi: string; label: string }[];
    daYun: string[];
}

const parseBaziInfo = (content: string): ParsedBaziInfo => {
    // Gender
    const genderMatch = content.match(/([乾坤])造/);
    const gender = genderMatch ? (genderMatch[1] === '乾' ? '乾造' : '坤造') : null;

    // Pillars - match "乙丑年，癸未月，甲寅日，戊辰时" or similar
    const pillars: ParsedBaziInfo['pillars'] = [];
    const pillarMatch = content.match(/[乾坤]造[：:]\s*([^\n(（]+)/);
    if (pillarMatch) {
        const parts = pillarMatch[1].match(/([^\s,，年月日时]+)[年月日时]/g);
        if (parts && parts.length >= 4) {
            const labels = ['年柱', '月柱', '日柱', '时柱'];
            parts.slice(0, 4).forEach((part, i) => {
                const ganZhi = part.replace(/[年月日时]/g, '');
                if (ganZhi.length >= 2) {
                    pillars.push({
                        ganZhi,
                        tiangan: ganZhi[0],
                        dizhi: ganZhi[1],
                        label: labels[i]
                    });
                }
            });
        }
    }

    // Da Yun - match "大运：甲申，乙酉，丙戌"
    const daYun: string[] = [];
    const daYunMatch = content.match(/大运[：:]\s*([^\n]+)/);
    if (daYunMatch) {
        const parts = daYunMatch[1].split(/[，,、\s]+/).filter(s => s.length === 2);
        daYun.push(...parts);
    }

    return { gender, pillars, daYun };
};

// 天干地支表
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 根据首个大运和性别推算完整大运列表
function extendDaYun(firstDaYun: string, gender: '乾造' | '坤造' | null, yearGan: string, targetCount: number = 12): string[] {
    if (!firstDaYun || firstDaYun.length < 2) return [];

    const result: string[] = [firstDaYun];

    // 判断大运顺逆：阳年男顺女逆，阴年男逆女顺
    const yangGan = ['甲', '丙', '戊', '庚', '壬'];
    const isYangYear = yangGan.includes(yearGan);
    const isMale = gender === '乾造';
    const forward = (isYangYear && isMale) || (!isYangYear && !isMale);

    let ganIndex = TIAN_GAN.indexOf(firstDaYun[0]);
    let zhiIndex = DI_ZHI.indexOf(firstDaYun[1]);

    for (let i = 1; i < targetCount; i++) {
        if (forward) {
            ganIndex = (ganIndex + 1) % 10;
            zhiIndex = (zhiIndex + 1) % 12;
        } else {
            ganIndex = (ganIndex - 1 + 10) % 10;
            zhiIndex = (zhiIndex - 1 + 12) % 12;
        }
        result.push(TIAN_GAN[ganIndex] + DI_ZHI[zhiIndex]);
    }

    return result;
}

// Compute pillar details (十神、藏干、自坐、纳音、空亡)
function getElement(char: string): string {
    return TIAN_GAN_WU_XING[char] || DI_ZHI_WU_XING[char] || '';
}

function computePillarDetails(ganZhi: string, dayGan: string, abbreviate: boolean = false) {
    if (!ganZhi || ganZhi.length < 2) {
        return { tianganShiShen: '', zanggan: [], diShi: '', ziZuo: '', kongWang: '', naYin: '' };
    }

    const tiangan = ganZhi[0];
    const dizhi = ganZhi[1];

    const fullTianganShiShen = SHI_SHEN[dayGan + tiangan] || '';
    const tianganShiShen = abbreviate ? (getShiShenAbbr(fullTianganShiShen) || '') : fullTianganShiShen;

    const hideGans = DI_ZHI_CANG_GAN[dizhi] || [];
    const zanggan: HiddenStem[] = hideGans.map((gan: string) => {
        const fullShiShen = SHI_SHEN[dayGan + gan] || '';
        return {
            gan,
            shiShen: abbreviate ? (getShiShenAbbr(fullShiShen) || '') : fullShiShen,
            element: getElement(gan)
        };
    });

    const diShi = SHI_ER_ZHANG_SHENG[dayGan + dizhi] || '';
    const ziZuo = SHI_ER_ZHANG_SHENG[tiangan + dizhi] || '';
    const naYin = NA_YIN[ganZhi] || '';
    const kongWang = getXunKong(ganZhi);

    return { tianganShiShen, zanggan, diShi, ziZuo, kongWang, naYin };
}

// Simple Pillar Card for Case Study display
interface SimplePillarCardProps {
    label: string;
    tiangan: string;
    dizhi: string;
    tianganShiShen: string;
    zanggan: HiddenStem[];
    diShi: string;
    ziZuo: string;
    kongWang: string;
    naYin: string;
    isDayMaster?: boolean;
    genderLabel?: string;
}

function SimplePillarCard({
    label, tiangan, dizhi, tianganShiShen, zanggan, diShi, ziZuo, kongWang, naYin, isDayMaster = false, genderLabel
}: SimplePillarCardProps) {
    return (
        <div className={`flex-1 flex flex-col border-r border-border/50 last:border-r-0 ${isDayMaster ? 'bg-primary/5' : ''}`}>
            {/* Label */}
            <div className="h-8 flex items-center justify-center border-b border-border/30 bg-muted/30">
                <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            {/* 十神 */}
            <div className="h-7 flex items-center justify-center border-b border-border/30">
                <span className="text-xs text-foreground/70">{tianganShiShen || genderLabel || ''}</span>
            </div>
            {/* 天干 */}
            <div className="h-12 flex items-center justify-center border-b border-border/30">
                <span className="text-2xl font-display font-semibold" style={{ color: getElementColor(tiangan) }}>
                    {tiangan}
                </span>
            </div>
            {/* 地支 */}
            <div className="h-12 flex items-center justify-center border-b border-border/30">
                <span className="text-2xl font-display font-semibold" style={{ color: getElementColor(dizhi) }}>
                    {dizhi}
                </span>
            </div>
            {/* 藏干 */}
            <div className="h-[75px] p-1.5 border-b border-border/30 flex flex-col justify-start gap-1">
                {zanggan.map((item, index) => (
                    <div key={`${item.gan}-${index}`} className="flex items-center justify-center gap-1 text-xs">
                        <span className="font-medium" style={{ color: getElementColor(item.gan) }}>
                            {item.gan}
                        </span>
                        <span className="text-muted-foreground text-xs">{item.shiShen}</span>
                    </div>
                ))}
            </div>
            {/* 星运 */}
            <div className="h-7 flex items-center justify-center border-b border-border/30">
                <span className="text-xs text-foreground/60">{diShi}</span>
            </div>
            {/* 自坐 */}
            <div className="h-7 flex items-center justify-center border-b border-border/30">
                <span className="text-xs text-foreground/60">{ziZuo}</span>
            </div>
            {/* 空亡 */}
            <div className="h-7 flex items-center justify-center border-b border-border/30">
                <span className="text-xs text-muted-foreground/70">{kongWang}</span>
            </div>
            {/* 纳音 */}
            <div className="h-7 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">{naYin}</span>
            </div>
        </div>
    );
}

// Start loading cases
// This needs to be outside or memoized, but for simple Vite HMR, we can just do it here
const rawCases = import.meta.glob('../../../data/cases/bazi/*.md', { as: 'raw', eager: true });

const ALL_CASES = Object.entries(rawCases).map(([path, content]) => {
    // path is something like "../../../data/cases/bazi/Title.md"
    const filename = path.split('/').pop()?.replace('.md', '') || '无标题';
    const bazi = extractBazi(content as string);
    return {
        id: path, // unique id
        title: filename,
        bazi: bazi,
        content: content as string
    };
});

const ITEMS_PER_PAGE = 13;

export default function CaseStudyPage() {
    const [selectedCategory, setSelectedCategory] = useState<string>('bazi');
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [daYunPage, setDaYunPage] = useState(0); // 大运分页
    const [selectedDaYunIndex, setSelectedDaYunIndex] = useState<number | null>(null); // 选中的大运索引
    const [selectedLiuNianYear, setSelectedLiuNianYear] = useState<number | null>(null); // 选中的流年

    // Filter and Paginate
    const filteredCases = useMemo(() => {
        return ALL_CASES.filter(c =>
            c.title.includes(searchTerm) || c.content.includes(searchTerm)
        );
    }, [searchTerm]);

    const totalPages = Math.ceil(filteredCases.length / ITEMS_PER_PAGE);
    const displayCases = filteredCases.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Get selected case content
    const activeCase = useMemo(() => {
        return ALL_CASES.find(c => c.id === selectedCaseId);
    }, [selectedCaseId]);

    // Reset page on search
    useMemo(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Reset Da Yun/Liu Nian selection when case changes
    useMemo(() => {
        setSelectedDaYunIndex(null);
        setSelectedLiuNianYear(null);
        setDaYunPage(0);
    }, [selectedCaseId]);
    return (
        <div className="flex w-full h-full overflow-hidden bg-background">
            {/* 1. 术数分类 (5%) - 仿Vertical Tab样式 */}
            <div className="w-[5%] min-w-[80px] border-r border-border/40 bg-card/30 flex flex-col">
                <div className="py-4 text-center border-b border-border/40 bg-card/50">
                    <span className="font-serif font-bold text-foreground/80">术数</span>
                </div>
                {CATEGORIES.map(cat => {
                    const isActive = selectedCategory === cat.id;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`
                                relative w-full py-3 px-2 flex flex-col items-center gap-1 transition-all
                                border-b border-border/20
                                ${isActive ? 'bg-primary/5' : 'hover:bg-muted/30'}
                            `}
                        >
                            {/* Active Indicator Line */}
                            {isActive && (
                                <div className="absolute left-0 top-3 bottom-3 w-1 bg-[#d4b185] rounded-r-md" />
                            )}

                            {/* Label */}
                            <span className={`text-[10px] ${isActive ? 'text-[#d4b185]/80' : 'text-muted-foreground/50'}`}>
                                {cat.label}
                            </span>

                            {/* Value */}
                            <span className={`text-sm font-serif ${isActive ? 'text-[#d4b185] font-bold' : 'text-muted-foreground'}`}>
                                {cat.name}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* 2. 案例列表 (15%) - 标题 + 搜索 + 分页 */}
            <div className="w-[15%] border-r border-border bg-card flex flex-col min-w-[200px]">
                <div className="p-3 border-b border-border space-y-2">
                    <h3 className="font-medium text-sm">案例列表</h3>
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-2 top-1.5 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="搜索案例..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-7 pr-2 py-1 text-xs bg-muted/30 border border-border/50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {displayCases.length > 0 ? (
                        displayCases.map((item) => (
                            <div
                                key={item.id}
                                className={`p-2 rounded text-sm cursor-pointer transition-all border ${selectedCaseId === item.id
                                    ? 'bg-primary/10 border-primary/30 text-primary'
                                    : 'border-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                                    }`}
                                onClick={() => setSelectedCaseId(item.id)}
                            >
                                <div className="truncate font-medium text-foreground">{item.title}</div>
                                <div className="text-xs opacity-70 mt-1 truncate font-mono">{item.bazi}</div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-xs text-muted-foreground py-8">
                            无匹配案例
                        </div>
                    )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="p-2 border-t border-border flex items-center justify-center gap-2 bg-card/50">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-muted-foreground font-mono">
                            {currentPage}/{totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* 3. 内容区 (55%) */}
            <div className="w-[55%] flex flex-col bg-background/50 relative overflow-hidden">
                {activeCase ? (
                    <div className="flex-1 overflow-y-auto p-8">
                        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
                            <h1 className="text-2xl font-serif font-bold text-center text-primary/90 pb-4 border-b border-border/40">
                                {activeCase.title}
                            </h1>
                            <div className="prose dark:prose-invert max-w-none text-foreground font-serif leading-relaxed text-[18px]">
                                <ReactMarkdown
                                    rehypePlugins={[rehypeRaw]}
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        // Custom renderer for specific elements if needed
                                        h1: ({ node, ...props }) => (
                                            <div className="mt-8 mb-6">
                                                <h1 className="text-xl font-bold text-primary inline-block" {...props} />
                                                <div className="w-full h-0.5 bg-primary/30 mt-2 rounded-full" />
                                            </div>
                                        ),
                                        h2: ({ node, ...props }) => (
                                            <div className="mt-6 mb-4">
                                                <h2 className="text-lg font-bold text-primary/80 inline-block" {...props} />
                                                <div className="w-full h-0.5 bg-primary/20 mt-1.5 rounded-full" />
                                            </div>
                                        ),
                                        p: ({ node, ...props }) => <p className="mb-4 text-justify text-[18px] leading-8 indent-8 text-foreground/75" {...props} />,
                                        blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-primary/30 pl-8 pr-8 py-4 my-6 bg-primary/15 dark:bg-primary/5 rounded-r text-[16px] font-medium text-foreground/50 leading-7 [&>p:last-child]:mb-0 [&_p]:indent-0" {...props} />,
                                        table: ({ node, ...props }) => <div className="overflow-x-auto my-4"><table className="min-w-full divide-y divide-border" {...props} /></div>,
                                        th: ({ node, ...props }) => <th className="px-3 py-2 bg-muted/50 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider" {...props} />,
                                        td: ({ node, ...props }) => <td className="px-3 py-2 whitespace-nowrap text-sm border-t border-border/50" {...props} />,
                                        // Handle that specific span style from the screenshot if possible, though rehype-raw handles most
                                        span: ({ node, ...props }) => <span {...props} />,
                                        strong: ({ node, ...props }) => <strong className="text-primary" {...props} />,
                                    }}
                                >
                                    {activeCase.content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/40">
                        <Compass className="w-16 h-16 mb-4 opacity-20" />
                        <span className="text-sm font-serif">请选择左侧案例查看详情</span>
                    </div>
                )}
            </div>

            {/* 4. 排盘区 (25%) */}
            <div className="w-[25%] bg-muted/10 flex flex-col overflow-hidden border-l border-border/50">
                <div className="p-2 border-b border-border bg-muted/20">
                    <span className="text-xs font-medium text-muted-foreground">排盘信息</span>
                </div>
                <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-border/40 scrollbar-track-transparent">
                    {selectedCategory === 'bazi' && activeCase ? (
                        (() => {
                            const baziInfo = parseBaziInfo(activeCase.content);
                            const dayGan = baziInfo.pillars[2]?.tiangan || '';
                            const genderLabel = baziInfo.gender === '乾造' ? '元男' : '元女';

                            if (baziInfo.pillars.length < 4) {
                                return (
                                    <div className="text-center text-muted-foreground py-8">
                                        <Compass className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                        <p className="text-sm">无法解析八字信息</p>
                                    </div>
                                );
                            }

                            return (
                                <div className="">
                                    {/* 四柱表格 */}
                                    <div className="bg-card overflow-hidden border-b border-border/50">
                                        <div className="flex">
                                            {/* 行标题 */}
                                            <div className="w-10 flex-shrink-0 border-r border-border/50 flex flex-col bg-muted/20">
                                                <div className="h-8 flex items-center justify-center border-b border-border/30">
                                                    <span className="text-xs text-muted-foreground">柱</span>
                                                </div>
                                                <div className="h-7 flex items-center justify-center border-b border-border/30">
                                                    <span className="text-xs text-muted-foreground">主星</span>
                                                </div>
                                                <div className="h-12 flex items-center justify-center border-b border-border/30">
                                                    <span className="text-xs text-muted-foreground">天干</span>
                                                </div>
                                                <div className="h-12 flex items-center justify-center border-b border-border/30">
                                                    <span className="text-xs text-muted-foreground">地支</span>
                                                </div>
                                                <div className="h-[75px] flex items-center justify-center border-b border-border/30">
                                                    <span className="text-xs text-muted-foreground">藏干</span>
                                                </div>
                                                <div className="h-7 flex items-center justify-center border-b border-border/30">
                                                    <span className="text-xs text-muted-foreground">星运</span>
                                                </div>
                                                <div className="h-7 flex items-center justify-center border-b border-border/30">
                                                    <span className="text-xs text-muted-foreground">自坐</span>
                                                </div>
                                                <div className="h-7 flex items-center justify-center border-b border-border/30">
                                                    <span className="text-xs text-muted-foreground">空亡</span>
                                                </div>
                                                <div className="h-7 flex items-center justify-center">
                                                    <span className="text-xs text-muted-foreground">纳音</span>
                                                </div>
                                            </div>

                                            {/* 选中的流年柱 (最左边) */}
                                            {selectedLiuNianYear !== null && selectedDaYunIndex !== null && (() => {
                                                const yearGan = baziInfo.pillars[0]?.tiangan || '';
                                                const startAge = selectedDaYunIndex * 10 + 1;
                                                const baseYear = new Date().getFullYear() - (new Date().getFullYear() % 60);

                                                // 找到选中的流年干支
                                                for (let j = 0; j < 10; j++) {
                                                    const liuNianAge = startAge + j;
                                                    const ganIndex = (liuNianAge - 1 + TIAN_GAN.indexOf(yearGan)) % 10;
                                                    const zhiIndex = (liuNianAge - 1 + DI_ZHI.indexOf(baziInfo.pillars[0]?.dizhi || '')) % 12;
                                                    const year = baseYear + liuNianAge;
                                                    if (year === selectedLiuNianYear) {
                                                        const ganZhi = TIAN_GAN[ganIndex] + DI_ZHI[zhiIndex];
                                                        const details = computePillarDetails(ganZhi, dayGan, true);
                                                        return (
                                                            <SimplePillarCard
                                                                key="liunian"
                                                                label="流年"
                                                                tiangan={ganZhi[0]}
                                                                dizhi={ganZhi[1]}
                                                                tianganShiShen={details.tianganShiShen}
                                                                zanggan={details.zanggan}
                                                                diShi={details.diShi}
                                                                ziZuo={details.ziZuo}
                                                                kongWang={details.kongWang}
                                                                naYin={details.naYin}
                                                            />
                                                        );
                                                    }
                                                }
                                                return null;
                                            })()}

                                            {/* 选中的大运柱 */}
                                            {selectedDaYunIndex !== null && (() => {
                                                const yearGan = baziInfo.pillars[0]?.tiangan || '';
                                                const fullDaYun = extendDaYun(baziInfo.daYun[0], baziInfo.gender, yearGan, 12);
                                                const selectedDaYunGanZhi = fullDaYun[selectedDaYunIndex];
                                                if (!selectedDaYunGanZhi) return null;
                                                const details = computePillarDetails(selectedDaYunGanZhi, dayGan, true);
                                                return (
                                                    <SimplePillarCard
                                                        key="dayun"
                                                        label="大运"
                                                        tiangan={selectedDaYunGanZhi[0]}
                                                        dizhi={selectedDaYunGanZhi[1]}
                                                        tianganShiShen={details.tianganShiShen}
                                                        zanggan={details.zanggan}
                                                        diShi={details.diShi}
                                                        ziZuo={details.ziZuo}
                                                        kongWang={details.kongWang}
                                                        naYin={details.naYin}
                                                    />
                                                );
                                            })()}

                                            {/* 四柱 */}
                                            {baziInfo.pillars.map((pillar, index) => {
                                                const details = computePillarDetails(pillar.ganZhi, dayGan, false);
                                                return (
                                                    <SimplePillarCard
                                                        key={pillar.label}
                                                        label={pillar.label}
                                                        tiangan={pillar.tiangan}
                                                        dizhi={pillar.dizhi}
                                                        tianganShiShen={details.tianganShiShen}
                                                        zanggan={details.zanggan}
                                                        diShi={details.diShi}
                                                        ziZuo={details.ziZuo}
                                                        kongWang={details.kongWang}
                                                        naYin={details.naYin}
                                                        isDayMaster={index === 2}
                                                        genderLabel={index === 2 ? genderLabel : undefined}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 大运列表 - 带分页的彩色显示 */}
                                    {baziInfo.daYun.length > 0 && (() => {
                                        const ITEMS_PER_VIEW = 8;
                                        const yearGan = baziInfo.pillars[0]?.tiangan || '';
                                        const fullDaYun = extendDaYun(baziInfo.daYun[0], baziInfo.gender, yearGan, 16);
                                        const totalDaYunPages = Math.ceil(fullDaYun.length / ITEMS_PER_VIEW);
                                        const visibleDaYun = fullDaYun.slice(daYunPage * ITEMS_PER_VIEW, (daYunPage + 1) * ITEMS_PER_VIEW);

                                        return (
                                            <div className="bg-card overflow-hidden border-b border-border/50">
                                                {/* Header with pagination */}
                                                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-muted/20">
                                                    <span className="text-xs font-medium text-muted-foreground">大运</span>
                                                    {totalDaYunPages > 1 && (
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => setDaYunPage(Math.max(0, daYunPage - 1))}
                                                                disabled={daYunPage === 0}
                                                                className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                                                            >
                                                                <ChevronLeft className="w-3 h-3" />
                                                            </button>
                                                            <span className="text-[10px] text-muted-foreground">{daYunPage + 1}/{totalDaYunPages}</span>
                                                            <button
                                                                onClick={() => setDaYunPage(Math.min(totalDaYunPages - 1, daYunPage + 1))}
                                                                disabled={daYunPage === totalDaYunPages - 1}
                                                                className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                                                            >
                                                                <ChevronRight className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Da Yun Items */}
                                                <div className="flex">
                                                    {visibleDaYun.map((dy, i) => {
                                                        const tiangan = dy[0];
                                                        const dizhi = dy[1];
                                                        const details = computePillarDetails(dy, dayGan, true);
                                                        // 计算地支的十神 (藏干主气)
                                                        const dizhiShiShen = details.zanggan[0]?.shiShen || '';
                                                        const globalDaYunIndex = daYunPage * ITEMS_PER_VIEW + i;
                                                        const startAge = globalDaYunIndex * 10 + 1;
                                                        const isSelected = selectedDaYunIndex === globalDaYunIndex;
                                                        return (
                                                            <div
                                                                key={i}
                                                                className={`flex-1 border-r border-border/30 last:border-r-0 text-center py-2 cursor-pointer transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-muted/30'
                                                                    }`}
                                                                onClick={() => {
                                                                    if (isSelected) {
                                                                        setSelectedDaYunIndex(null);
                                                                        setSelectedLiuNianYear(null);
                                                                    } else {
                                                                        setSelectedDaYunIndex(globalDaYunIndex);
                                                                        setSelectedLiuNianYear(null);
                                                                    }
                                                                }}
                                                            >
                                                                <div className="text-xs text-muted-foreground mb-1">{startAge}岁</div>
                                                                <div className="flex flex-col items-center gap-1">
                                                                    {/* 天干 + 十神 */}
                                                                    <div className="flex items-baseline justify-center gap-0.5">
                                                                        <span
                                                                            className="text-lg font-display font-semibold"
                                                                            style={{ color: getElementColor(tiangan) }}
                                                                        >
                                                                            {tiangan}
                                                                        </span>
                                                                        <span className="text-xs text-muted-foreground">{details.tianganShiShen}</span>
                                                                    </div>
                                                                    {/* 地支 + 十神 */}
                                                                    <div className="flex items-baseline justify-center gap-0.5">
                                                                        <span
                                                                            className="text-lg font-display font-semibold"
                                                                            style={{ color: getElementColor(dizhi) }}
                                                                        >
                                                                            {dizhi}
                                                                        </span>
                                                                        <span className="text-xs text-muted-foreground">{dizhiShiShen}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* 流年列表 - 当选中大运时显示 */}
                                    {selectedDaYunIndex !== null && baziInfo.pillars.length >= 4 && (() => {
                                        const yearGan = baziInfo.pillars[0]?.tiangan || '';
                                        const fullDaYun = extendDaYun(baziInfo.daYun[0], baziInfo.gender, yearGan, 16);
                                        const selectedDaYunGanZhi = fullDaYun[selectedDaYunIndex];
                                        if (!selectedDaYunGanZhi) return null;

                                        // 计算该大运对应的10年流年
                                        const startAge = selectedDaYunIndex * 10 + 1;
                                        // 假设起始年份（可以根据实际生日计算，这里简化处理）
                                        const currentYear = new Date().getFullYear();
                                        const liuNianList: { year: number; ganZhi: string }[] = [];

                                        // 根据当前年份和索引推算流年
                                        const baseYear = currentYear - (currentYear % 60); // 60年周期基准
                                        for (let j = 0; j < 10; j++) {
                                            const liuNianAge = startAge + j;
                                            // 简化：使用年龄对应的干支（实际应基于出生年）
                                            const ganIndex = (liuNianAge - 1 + TIAN_GAN.indexOf(yearGan)) % 10;
                                            const zhiIndex = (liuNianAge - 1 + DI_ZHI.indexOf(baziInfo.pillars[0]?.dizhi || '')) % 12;
                                            liuNianList.push({
                                                year: baseYear + liuNianAge,
                                                ganZhi: TIAN_GAN[ganIndex] + DI_ZHI[zhiIndex]
                                            });
                                        }

                                        return (
                                            <div className="bg-card overflow-hidden border-b border-border/50">
                                                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-muted/20">
                                                    <span className="text-xs font-medium text-muted-foreground">
                                                        流年（{selectedDaYunGanZhi}运）
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-10 gap-0">
                                                    {liuNianList.map((ln, i) => {
                                                        const tiangan = ln.ganZhi[0];
                                                        const dizhi = ln.ganZhi[1];
                                                        const details = computePillarDetails(ln.ganZhi, dayGan, true);
                                                        const dizhiShiShen = details.zanggan[0]?.shiShen || '';
                                                        const isSelected = selectedLiuNianYear === ln.year;
                                                        return (
                                                            <div
                                                                key={i}
                                                                className={`border-r border-b border-border/30 text-center py-1.5 cursor-pointer transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-muted/30'
                                                                    }`}
                                                                onClick={() => setSelectedLiuNianYear(isSelected ? null : ln.year)}
                                                            >
                                                                <div className="text-xs text-muted-foreground">{ln.year}</div>
                                                                <div className="flex items-baseline justify-center gap-0.5">
                                                                    <span
                                                                        className="text-base font-display font-semibold"
                                                                        style={{ color: getElementColor(tiangan) }}
                                                                    >
                                                                        {tiangan}
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground">{details.tianganShiShen}</span>
                                                                </div>
                                                                <div className="flex items-baseline justify-center gap-0.5">
                                                                    <span
                                                                        className="text-base font-display font-semibold"
                                                                        style={{ color: getElementColor(dizhi) }}
                                                                    >
                                                                        {dizhi}
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground">{dizhiShiShen}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            );
                        })()
                    ) : selectedCategory === 'bazi' ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                            <Compass className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">选择案例查看排盘</p>
                        </div>
                    ) : selectedCategory === 'qimen' ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                            <Grid3X3 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">奇门排盘区域</p>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                            <Compass className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">排盘区域</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
