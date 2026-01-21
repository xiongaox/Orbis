import { useState, useMemo } from 'react';
import { Compass, Grid3X3, Search, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { Lunar } from 'lunar-typescript';
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
import type { HiddenStem, BaziApiResponse } from '../../../types/bazi';
import { calculateBazi } from '../../../services/bazi/baziCalculator';

// 模拟数据：分类列表
const CATEGORIES = [
    { id: 'bazi', label: '命理', name: '八字' },
    { id: 'qimen', label: '预测', name: '奇门' },
    { id: 'liuyao', label: '预测', name: '六爻' },
    { id: 'ziwei', label: '命理', name: '紫薇' },
];

// ====== 案例元数据解析 ======
// 从案例头部元数据提取信息
// 格式示例：
// 命主生辰: 1985/07/14 08:00 (GMT+8)
// 性别: 坤造
// 日主: 甲木
// 格局: 身弱
// 令地: 失令 得地

interface CaseMetadata {
    birthDateTime: string | null;  // 1985/07/14 08:00
    gender: '乾造' | '坤造' | null;
    dayMasterElement: string | null;  // 甲木
    pattern: string | null;  // 身弱
    seasonStatus: string | null;  // 失令 得地
}

// 从头部元数据解析案例信息
const parseCaseMetadata = (content: string): CaseMetadata => {
    const birthMatch = content.match(/命主生辰[：:]\s*([^\n]+)/);
    const genderMatch = content.match(/性别[：:]\s*([乾坤]造)/);
    const dayMasterMatch = content.match(/日主[：:]\s*([^\n]+)/);
    const patternMatch = content.match(/格局[：:]\s*([^\n]+)/);
    const seasonMatch = content.match(/令地[：:]\s*([^\n]+)/);

    return {
        birthDateTime: birthMatch ? birthMatch[1].trim() : null,
        gender: genderMatch ? (genderMatch[1] as '乾造' | '坤造') : null,
        dayMasterElement: dayMasterMatch ? dayMasterMatch[1].trim() : null,
        pattern: patternMatch ? patternMatch[1].trim() : null,
        seasonStatus: seasonMatch ? seasonMatch[1].trim() : null,
    };
};

// 从头部元数据解析出生年月日时
const parseBirthFromMetadata = (birthDateTime: string): { year: number; month: number; day: number; hour: number | null } | null => {
    // 格式1: "1985/07/14 08:00 (GMT+8)" 带时间
    const matchWithTime = birthDateTime.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/);
    if (matchWithTime) {
        return {
            year: parseInt(matchWithTime[1], 10),
            month: parseInt(matchWithTime[2], 10),
            day: parseInt(matchWithTime[3], 10),
            hour: parseInt(matchWithTime[4], 10),
        };
    }
    // 格式2: "2001/11/09 (GMT+8)" 只有日期没有时间
    const matchDateOnly = birthDateTime.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
    if (matchDateOnly) {
        return {
            year: parseInt(matchDateOnly[1], 10),
            month: parseInt(matchDateOnly[2], 10),
            day: parseInt(matchDateOnly[3], 10),
            hour: null, // 没有时间
        };
    }
    return null;
};

// 过滤掉头部元数据，只保留正文内容用于显示
const filterContentForDisplay = (content: string): string => {
    // 移除头部元数据行（命主生辰、性别、日主、格局、令地）
    const metadataPattern = /^(命主生辰|性别|日主|格局|令地)[：:][^\n]*\n?/gm;
    let filtered = content.replace(metadataPattern, '');
    // 移除第一个一级标题（# 标题），因为已在代码中渲染
    filtered = filtered.replace(/^#\s+[^\n]+\n?/, '');
    // 移除开头的多余空行
    return filtered.replace(/^\n+/, '');
};

// Helper to extract Bazi summary for list display
const extractBazi = (content: string): string => {
    // 优先从头部元数据获取日主信息
    const metadata = parseCaseMetadata(content);
    if (metadata.birthDateTime && metadata.dayMasterElement) {
        const birth = parseBirthFromMetadata(metadata.birthDateTime);
        if (birth) {
            return `${birth.year}/${birth.month}/${birth.day} ${metadata.dayMasterElement}`;
        }
    }

    // 回退：从正文中查找 "乾造：" 或 "坤造：" 格式
    const match = content.match(/[乾坤]造[：:]\s*([^\n(（]+)/);
    if (match) {
        let bazi = match[1].replace(/[年月日时，,、\s]+/g, ' ').trim();
        const pillars = bazi.split(/\s+/);
        if (pillars.length >= 4) {
            return pillars.slice(0, 4).join(' ');
        }
        return bazi;
    }
    return "未知八字";
};

// Parse full Bazi info including gender and pillars
interface ParsedBaziInfo {
    gender: '乾造' | '坤造' | null;
    pillars: { ganZhi: string; tiangan: string; dizhi: string; label: string }[];
    daYun: string[];
    birthYear: number | null;
    birthMonth: number | null;
    birthDay: number | null;
    birthHour: number | null;
    isLunar: boolean; // 是否为农历
    baziData: BaziApiResponse | null; // 计算得到的完整八字数据
}

// 农历月份映射
const LUNAR_MONTH_MAP: Record<string, number> = {
    '正': 1, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6,
    '七': 7, '八': 8, '九': 9, '十': 10, '十一': 11, '冬': 11, '十二': 12, '腊': 12
};

// 农历日期映射
const LUNAR_DAY_MAP: Record<string, number> = {
    '初一': 1, '初二': 2, '初三': 3, '初四': 4, '初五': 5, '初六': 6, '初七': 7, '初八': 8, '初九': 9, '初十': 10,
    '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15, '十六': 16, '十七': 17, '十八': 18, '十九': 19, '二十': 20,
    '廿一': 21, '廿二': 22, '廿三': 23, '廿四': 24, '廿五': 25, '廿六': 26, '廿七': 27, '廿八': 28, '廿九': 29, '三十': 30,
    '三十一': 31
};

// 时辰映射
const HOUR_MAP: Record<string, number> = {
    '子': 0, '丑': 2, '寅': 4, '卯': 6, '辰': 8, '巳': 10,
    '午': 12, '未': 14, '申': 16, '酉': 18, '戌': 20, '亥': 22
};

const parseBaziInfo = (content: string): ParsedBaziInfo => {
    // 优先从头部元数据解析
    const metadata = parseCaseMetadata(content);

    // Gender - 优先使用元数据
    const gender = metadata.gender || (() => {
        const genderMatch = content.match(/([乾坤])造/);
        return genderMatch ? (genderMatch[1] === '乾' ? '乾造' : '坤造') as '乾造' | '坤造' : null;
    })();

    // 解析出生日期 - 优先使用头部元数据（公历格式）
    let birthYear: number | null = null;
    let birthMonth: number | null = null;
    let birthDay: number | null = null;
    let birthHour: number | null = null;
    let isLunar = false;

    // 优先：从头部元数据获取公历日期（格式: "1985/07/14 08:00 (GMT+8)"）
    if (metadata.birthDateTime) {
        const birth = parseBirthFromMetadata(metadata.birthDateTime);
        if (birth) {
            birthYear = birth.year;
            birthMonth = birth.month;
            birthDay = birth.day;
            birthHour = birth.hour;
            isLunar = false; // 元数据中的日期是公历
        }
    }

    // 回退格式1: "农历1987年四月初八中午8点" 或 "农历1981年12月17日下午4：30"
    if (!birthYear) {
        const lunarMatch1 = content.match(/农历\s*(\d{4})年\s*(正|一|二|三|四|五|六|七|八|九|十|十一|冬|十二|腊)月\s*(初一|初二|初三|初四|初五|初六|初七|初八|初九|初十|十一|十二|十三|十四|十五|十六|十七|十八|十九|二十|廿一|廿二|廿三|廿五|廿六|廿七|廿八|廿九|三十|三十一)\s*(?:(上午|下午|中午|晚上|午夜|凌晨|早上)?\s*(\d{1,2}))?/i);
        if (lunarMatch1) {
            isLunar = true;
            birthYear = parseInt(lunarMatch1[1], 10);
            birthMonth = LUNAR_MONTH_MAP[lunarMatch1[2]] || null;
            birthDay = LUNAR_DAY_MAP[lunarMatch1[3]] || null;
            if (lunarMatch1[5]) {
                let hour = parseInt(lunarMatch1[5], 10);
                const period = lunarMatch1[4];
                if (period === '下午' && hour < 12) hour += 12;
                if (period === '上午' && hour === 12) hour = 0;
                if (period === '中午') hour = 12;
                birthHour = hour;
            }
        }
    }

    // 回退格式2: "农历1981年12月17日" + "下午4:30"
    if (!birthYear) {
        const lunarMatch2 = content.match(/农历\s*(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
        if (lunarMatch2) {
            isLunar = true;
            birthYear = parseInt(lunarMatch2[1], 10);
            birthMonth = parseInt(lunarMatch2[2], 10);
            birthDay = parseInt(lunarMatch2[3], 10);
        }
    }

    // 解析时辰 - "下午4:30" 或 "中午12点" 或时柱中的地支
    if (!birthHour) {
        const hourMatch = content.match(/(上午|下午|中午|晚上|午夜|凌晨|早上)?\s*(\d{1,2})\s*[点时:]/i);
        if (hourMatch) {
            let hour = parseInt(hourMatch[2], 10);
            const period = hourMatch[1];
            if (period === '下午' && hour !== 12) hour += 12;
            if (period === '上午' && hour === 12) hour = 0;
            if (period === '中午') hour = 12;
            birthHour = hour;
        }
    }

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

    // 从时柱提取时辰（如果还没有）
    if (!birthHour && pillars.length >= 4) {
        const timeZhi = pillars[3].dizhi;
        if (timeZhi && HOUR_MAP[timeZhi] !== undefined) {
            birthHour = HOUR_MAP[timeZhi];
        }
    }

    // Da Yun - match "大运：甲申，乙酉，丙戌"
    const daYun: string[] = [];
    const daYunMatch = content.match(/大运[：:]\s*([^\n]+)/);
    if (daYunMatch) {
        const parts = daYunMatch[1].split(/[，,、\s]+/).filter(s => s.length === 2);
        daYun.push(...parts);
    }

    // 尝试计算完整的八字数据
    let baziData: BaziApiResponse | null = null;
    if (birthYear && birthMonth && birthDay && birthHour !== null) {
        try {
            let solarYear = birthYear;
            let solarMonth = birthMonth;
            let solarDay = birthDay;

            // 如果是农历，转换为公历
            if (isLunar) {
                const lunar = Lunar.fromYmd(birthYear, birthMonth, birthDay);
                const solar = lunar.getSolar();
                solarYear = solar.getYear();
                solarMonth = solar.getMonth();
                solarDay = solar.getDay();
            }

            baziData = calculateBazi({
                year: solarYear,
                month: solarMonth,
                day: solarDay,
                hour: birthHour,
                minute: 0,
                gender: gender === '乾造' ? 'male' : 'female'
            });
        } catch (e) {
            console.warn('计算八字失败:', e);
        }
    }

    // 如果正则提取失败（例如缺"时"字），且已成功计算八字，则使用计算结果填充
    if (baziData && baziData.pillars && pillars.length < 4) {
        const labels = ['年柱', '月柱', '日柱', '时柱'];
        const newPillars = [];
        for (let i = 0; i < 4; i++) {
            const p = baziData.pillars[i];
            if (p && p.ganZhi) {
                newPillars.push({
                    ganZhi: p.ganZhi,
                    tiangan: p.ganZhi[0],
                    dizhi: p.ganZhi[1],
                    label: labels[i]
                });
            }
        }
        if (newPillars.length === 4) {
            pillars.length = 0; // 清空旧数据
            pillars.push(...newPillars);
        }
    }

    return { gender, pillars, daYun, birthYear, birthMonth, birthDay, birthHour, isLunar, baziData };
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
const rawCasesLishuanglin = import.meta.glob('../../../data/cases/lishuanglin/**/*.md', { query: '?raw', import: 'default', eager: true });
const rawCasesNanxuanzi = import.meta.glob('../../../data/cases/nanxuanzi/**/*.md', { query: '?raw', import: 'default', eager: true });

// 作者映射
const AUTHOR_MAP: Record<string, string> = {
    'lishuanglin': '李双林',
    'nanxuanzi': '南玄子',
};

// 加载作者介绍文件
const authorIntroFiles = import.meta.glob('../../../data/cases/*/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

// 合并所有案例
const rawCases = { ...rawCasesLishuanglin, ...rawCasesNanxuanzi };

// 日主分类列表（从目录结构提取）
const DAY_MASTER_CATEGORIES = [
    { id: 'all', label: '全部' },
    { id: '甲日命造', label: '甲日' },
    { id: '乙日命造', label: '乙日' },
    { id: '丙日命造', label: '丙日' },
    { id: '丁日命造', label: '丁日' },
    { id: '戊日命造', label: '戊日' },
    { id: '己日命造', label: '己日' },
    { id: '庚日命造', label: '庚日' },
    { id: '辛日命造', label: '辛日' },
    { id: '壬日命造', label: '壬日' },
    { id: '癸日命造', label: '癸日' },
    { id: '特殊格局', label: '特殊格局' },
];

const ALL_CASES = Object.entries(rawCases)
    .filter(([path, content]) => {
        // 过滤掉空文件和非案例文件（如 李双林.md）
        const c = content as string;
        return c.trim().length > 0 && path.includes('/');
    })
    .map(([path, content]) => {
        // path 类似 "../../../data/cases/lishuanglin/甲日命造/案例标题.md"
        const pathParts = path.split('/');
        const filename = pathParts.pop()?.replace('.md', '') || '无标题';
        // 提取日主分类（倒数第二个目录）
        const dayMasterCategory = pathParts[pathParts.length - 1] || '未分类';
        // 提取作者（从路径中判断）
        const authorKey = path.includes('lishuanglin') ? 'lishuanglin' : path.includes('nanxuanzi') ? 'nanxuanzi' : '';
        const author = AUTHOR_MAP[authorKey] || '未知';
        const bazi = extractBazi(content as string);
        return {
            id: path, // unique id
            title: filename,
            bazi: bazi,
            content: content as string,
            dayMaster: dayMasterCategory, // 日主分类
            author: author // 作者
        };
    });



const ITEMS_PER_PAGE = 13;

export default function CaseStudyPage() {
    const [selectedCategory, setSelectedCategory] = useState<string>('bazi');
    const [selectedDayMaster, setSelectedDayMaster] = useState<string>('all'); // 日主筛选
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [daYunPage, setDaYunPage] = useState(0); // 大运分页
    const [selectedDaYunIndex, setSelectedDaYunIndex] = useState<number | null>(null); // 选中的大运索引
    const [selectedLiuNianYear, setSelectedLiuNianYear] = useState<number | null>(null); // 选中的流年
    const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null); // 选中的作者（显示介绍）
    const [isDropdownOpen, setIsDropdownOpen] = useState(false); // 下拉菜单开关

    // 获取作者介绍内容
    const authorIntroContent = useMemo(() => {
        if (!selectedAuthor) return null;
        // 查找作者介绍文件
        const introPath = Object.keys(authorIntroFiles).find(path =>
            path.includes(`/${selectedAuthor}.md`) && !path.includes('/')
        ) || Object.keys(authorIntroFiles).find(path =>
            path.endsWith(`${selectedAuthor}.md`)
        );
        if (introPath && authorIntroFiles[introPath]) {
            return authorIntroFiles[introPath];
        }
        return null;
    }, [selectedAuthor]);

    // Filter and Paginate
    const filteredCases = useMemo(() => {
        return ALL_CASES.filter(c => {
            // 日主分类筛选
            const matchDayMaster = selectedDayMaster === 'all' || c.dayMaster === selectedDayMaster;
            // 搜索筛选
            const matchSearch = searchTerm === '' || c.title.includes(searchTerm) || c.content.includes(searchTerm);
            return matchDayMaster && matchSearch;
        });
    }, [searchTerm, selectedDayMaster]);

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
        <div className="flex w-full h-full overflow-hidden bg-background relative">

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
                    {/* 日主分类选择器 */}
                    {/* 自定义日主分类下拉菜单 */}
                    <div className="relative group">
                        {/* 遮罩层，用于点击外部关闭 */}
                        {isDropdownOpen && (
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setIsDropdownOpen(false)}
                            />
                        )}

                        {/* 触发按钮 */}
                        <div
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full px-3 py-2 text-sm bg-muted/40 border border-border/60 rounded-lg cursor-pointer hover:bg-muted/60 flex items-center justify-between transition-all"
                        >
                            <span className="truncate flex items-center gap-2">
                                <span className={selectedDayMaster === 'all' ? 'font-medium' : ''}>
                                    {DAY_MASTER_CATEGORIES.find(c => c.id === selectedDayMaster)?.label || '全部'}
                                </span>
                                <span className="text-muted-foreground/60 text-xs">
                                    {selectedDayMaster === 'all'
                                        ? ALL_CASES.length
                                        : ALL_CASES.filter(c => c.dayMaster === selectedDayMaster).length}
                                </span>
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/70 transition-transform duration-200 group-hover:text-foreground ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {/* 下拉列表 */}
                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border shadow-md rounded-lg z-20 max-h-[300px] overflow-y-auto py-1 animate-in fade-in zoom-in-95 duration-100">
                                {DAY_MASTER_CATEGORIES.map(cat => {
                                    const count = cat.id === 'all'
                                        ? ALL_CASES.length
                                        : ALL_CASES.filter(c => c.dayMaster === cat.id).length;
                                    const isSelected = selectedDayMaster === cat.id;

                                    return (
                                        <div
                                            key={cat.id}
                                            onClick={() => {
                                                setSelectedDayMaster(cat.id);
                                                setCurrentPage(1);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`
                                                px-3 py-2 text-sm cursor-pointer flex items-center justify-between transition-colors
                                                ${isSelected ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}
                                            `}
                                        >
                                            <span>{cat.label}</span>
                                            <span className={`text-xs ${isSelected ? 'text-foreground/80' : 'text-muted-foreground/50'}`}>
                                                {count}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="搜索案例..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm bg-muted/40 border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all hover:bg-muted/60"
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
                                onClick={() => {
                                    setSelectedCaseId(item.id);
                                    setSelectedAuthor(null); // 清除作者选择
                                }}
                            >
                                <div className="truncate font-medium text-foreground">{item.title}</div>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-xs opacity-70 truncate font-mono">{item.bazi}</span>
                                    <span
                                        className="text-xs text-muted-foreground/70 hover:text-primary flex-shrink-0 ml-2 cursor-pointer hover:underline transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation(); // 阻止触发卡片的点击事件
                                            setSelectedAuthor(item.author);
                                            setSelectedCaseId(null); // 清除选中的案例
                                        }}
                                    >
                                        作者：{item.author}
                                    </span>
                                </div>
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
                                    {filterContentForDisplay(activeCase.content)}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ) : selectedAuthor && authorIntroContent ? (
                    // 显示作者介绍
                    <div className="flex-1 overflow-y-auto p-8">
                        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
                            <h1 className="text-2xl font-serif font-bold text-center text-primary/90 pb-4 border-b border-border/40">
                                {selectedAuthor}
                            </h1>
                            <div className="prose dark:prose-invert max-w-none text-foreground font-serif leading-relaxed text-[18px]">
                                <ReactMarkdown
                                    rehypePlugins={[rehypeRaw]}
                                    remarkPlugins={[remarkGfm]}
                                    components={{
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
                                        ol: ({ node, ...props }) => <ol className="list-decimal space-y-4 mb-6 pl-6" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc space-y-3 mb-4 pl-6" {...props} />,
                                        li: ({ node, ...props }) => <li className="text-[17px] leading-7 text-foreground/70 pb-3 border-b border-border/20 marker:text-primary marker:font-bold" {...props} />,
                                        strong: ({ node, ...props }) => <strong className="text-primary" {...props} />,
                                    }}
                                >
                                    {filterContentForDisplay(authorIntroContent)}
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
                                                // 根据选中的流年年份计算干支
                                                const ganIndex = (selectedLiuNianYear - 4) % 10;
                                                const zhiIndex = (selectedLiuNianYear - 4) % 12;
                                                const ganZhi = TIAN_GAN[ganIndex >= 0 ? ganIndex : ganIndex + 10] + DI_ZHI[zhiIndex >= 0 ? zhiIndex : zhiIndex + 12];
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

                                    {/* 大运列表 - 使用 baziData 或回退到旧逻辑 */}
                                    {(() => {
                                        // 优先使用 baziData 中的大运数据
                                        const daYunList = baziInfo.baziData?.daYun || [];

                                        if (daYunList.length > 0) {
                                            // 使用计算得到的正确大运数据
                                            const ITEMS_PER_VIEW = 8;
                                            // 过滤掉索引为 0 或 -1 的"小运"项
                                            const realDaYun = daYunList.filter(dy => dy.index > 0);
                                            const totalDaYunPages = Math.ceil(realDaYun.length / ITEMS_PER_VIEW);
                                            const visibleDaYun = realDaYun.slice(daYunPage * ITEMS_PER_VIEW, (daYunPage + 1) * ITEMS_PER_VIEW);

                                            return (
                                                <div className="bg-card overflow-hidden border-b border-border/50">
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
                                                    <div className="flex">
                                                        {visibleDaYun.map((dy) => {
                                                            const tiangan = dy.tiangan || '';
                                                            const dizhi = dy.dizhi || '';
                                                            const details = computePillarDetails(dy.ganZhi || '', dayGan, true);
                                                            const dizhiShiShen = details.zanggan[0]?.shiShen || '';
                                                            const isSelected = selectedDaYunIndex === dy.index;
                                                            return (
                                                                <div
                                                                    key={dy.index}
                                                                    className={`flex-1 border-r border-border/30 last:border-r-0 text-center py-2 cursor-pointer transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-muted/30'}`}
                                                                    onClick={() => {
                                                                        if (isSelected) {
                                                                            setSelectedDaYunIndex(null);
                                                                            setSelectedLiuNianYear(null);
                                                                        } else {
                                                                            setSelectedDaYunIndex(dy.index);
                                                                            setSelectedLiuNianYear(null);
                                                                        }
                                                                    }}
                                                                >
                                                                    <div className="text-xs text-muted-foreground mb-1">{dy.startAge}岁</div>
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        <div className="flex items-baseline justify-center gap-0.5">
                                                                            <span className="text-lg font-display font-semibold" style={{ color: getElementColor(tiangan) }}>
                                                                                {tiangan}
                                                                            </span>
                                                                            <span className="text-xs text-muted-foreground">{details.tianganShiShen}</span>
                                                                        </div>
                                                                        <div className="flex items-baseline justify-center gap-0.5">
                                                                            <span className="text-lg font-display font-semibold" style={{ color: getElementColor(dizhi) }}>
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
                                        } else if (baziInfo.daYun.length > 0) {
                                            // 回退到旧逻辑
                                            const ITEMS_PER_VIEW = 8;
                                            const yearGan = baziInfo.pillars[0]?.tiangan || '';
                                            const fullDaYun = extendDaYun(baziInfo.daYun[0], baziInfo.gender, yearGan, 16);
                                            const totalDaYunPages = Math.ceil(fullDaYun.length / ITEMS_PER_VIEW);
                                            const visibleDaYun = fullDaYun.slice(daYunPage * ITEMS_PER_VIEW, (daYunPage + 1) * ITEMS_PER_VIEW);

                                            return (
                                                <div className="bg-card overflow-hidden border-b border-border/50">
                                                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-muted/20">
                                                        <span className="text-xs font-medium text-muted-foreground">大运</span>
                                                        {totalDaYunPages > 1 && (
                                                            <div className="flex items-center gap-1">
                                                                <button onClick={() => setDaYunPage(Math.max(0, daYunPage - 1))} disabled={daYunPage === 0} className="p-0.5 rounded hover:bg-muted disabled:opacity-30">
                                                                    <ChevronLeft className="w-3 h-3" />
                                                                </button>
                                                                <span className="text-[10px] text-muted-foreground">{daYunPage + 1}/{totalDaYunPages}</span>
                                                                <button onClick={() => setDaYunPage(Math.min(totalDaYunPages - 1, daYunPage + 1))} disabled={daYunPage === totalDaYunPages - 1} className="p-0.5 rounded hover:bg-muted disabled:opacity-30">
                                                                    <ChevronRight className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex">
                                                        {visibleDaYun.map((dy, i) => {
                                                            const tiangan = dy[0];
                                                            const dizhi = dy[1];
                                                            const details = computePillarDetails(dy, dayGan, true);
                                                            const dizhiShiShen = details.zanggan[0]?.shiShen || '';
                                                            const globalDaYunIndex = daYunPage * ITEMS_PER_VIEW + i + 1;
                                                            const startAge = globalDaYunIndex * 10 + 1;
                                                            const isSelected = selectedDaYunIndex === globalDaYunIndex;
                                                            return (
                                                                <div key={i} className={`flex-1 border-r border-border/30 last:border-r-0 text-center py-2 cursor-pointer transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-muted/30'}`}
                                                                    onClick={() => {
                                                                        if (isSelected) { setSelectedDaYunIndex(null); setSelectedLiuNianYear(null); }
                                                                        else { setSelectedDaYunIndex(globalDaYunIndex); setSelectedLiuNianYear(null); }
                                                                    }}
                                                                >
                                                                    <div className="text-xs text-muted-foreground mb-1">{startAge}岁</div>
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        <div className="flex items-baseline justify-center gap-0.5">
                                                                            <span className="text-lg font-display font-semibold" style={{ color: getElementColor(tiangan) }}>{tiangan}</span>
                                                                            <span className="text-xs text-muted-foreground">{details.tianganShiShen}</span>
                                                                        </div>
                                                                        <div className="flex items-baseline justify-center gap-0.5">
                                                                            <span className="text-lg font-display font-semibold" style={{ color: getElementColor(dizhi) }}>{dizhi}</span>
                                                                            <span className="text-xs text-muted-foreground">{dizhiShiShen}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}

                                    {/* 流年列表 - 使用 baziData 或回退到旧逻辑 */}
                                    {selectedDaYunIndex !== null && baziInfo.pillars.length >= 4 && (() => {
                                        // 优先使用 baziData 中的流年数据
                                        const liuNianData = baziInfo.baziData?.liuNian || [];
                                        const daYunData = baziInfo.baziData?.daYun || [];

                                        if (liuNianData.length > 0) {
                                            // 找到该大运对应的流年
                                            const liuNianList = liuNianData.filter(ln => ln.dayunIndex === selectedDaYunIndex);
                                            if (liuNianList.length === 0) return null;

                                            // 获取选中的大运名称
                                            const selectedDaYun = daYunData.find(dy => dy.index === selectedDaYunIndex);
                                            const selectedDaYunGanZhi = selectedDaYun?.ganZhi || '';

                                            return (
                                                <div className="bg-card overflow-hidden border-b border-border/50">
                                                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-muted/20">
                                                        <span className="text-xs font-medium text-muted-foreground">
                                                            流年（{selectedDaYunGanZhi}运）
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-10 gap-0">
                                                        {liuNianList.map((ln) => {
                                                            const tiangan = ln.tiangan || '';
                                                            const dizhi = ln.dizhi || '';
                                                            const details = computePillarDetails(ln.ganZhi || '', dayGan, true);
                                                            const dizhiShiShen = details.zanggan[0]?.shiShen || '';
                                                            const isSelected = selectedLiuNianYear === ln.year;
                                                            return (
                                                                <div
                                                                    key={ln.year}
                                                                    className={`border-r border-b border-border/30 text-center py-1.5 cursor-pointer transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-muted/30'}`}
                                                                    onClick={() => setSelectedLiuNianYear(isSelected ? null : ln.year)}
                                                                >
                                                                    <div className="text-xs text-muted-foreground">{ln.year}</div>
                                                                    <div className="flex items-baseline justify-center gap-0.5">
                                                                        <span className="text-base font-display font-semibold" style={{ color: getElementColor(tiangan) }}>
                                                                            {tiangan}
                                                                        </span>
                                                                        <span className="text-xs text-muted-foreground">{details.tianganShiShen}</span>
                                                                    </div>
                                                                    <div className="flex items-baseline justify-center gap-0.5">
                                                                        <span className="text-base font-display font-semibold" style={{ color: getElementColor(dizhi) }}>
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
                                        } else {
                                            // 回退到旧逻辑
                                            const yearGan = baziInfo.pillars[0]?.tiangan || '';
                                            const yearZhi = baziInfo.pillars[0]?.dizhi || '';
                                            const fullDaYun = extendDaYun(baziInfo.daYun[0], baziInfo.gender, yearGan, 16);
                                            const selectedDaYunGanZhi = fullDaYun[selectedDaYunIndex - 1];
                                            if (!selectedDaYunGanZhi) return null;

                                            // 使用出生年份计算
                                            let birthYear = baziInfo.birthYear;
                                            if (!birthYear) {
                                                const currentYear = new Date().getFullYear();
                                                const yearGanIndex = TIAN_GAN.indexOf(yearGan);
                                                const yearZhiIndex = DI_ZHI.indexOf(yearZhi);
                                                for (let y = currentYear; y > currentYear - 120; y--) {
                                                    if ((y - 4) % 10 === yearGanIndex && (y - 4) % 12 === yearZhiIndex) {
                                                        birthYear = y;
                                                        break;
                                                    }
                                                }
                                            }
                                            if (!birthYear) birthYear = new Date().getFullYear() - 30;

                                            const startAge = selectedDaYunIndex * 10 + 1;
                                            const liuNianList: { year: number; ganZhi: string }[] = [];
                                            for (let j = 0; j < 10; j++) {
                                                const liuNianAge = startAge + j;
                                                const liuNianYear = birthYear + liuNianAge - 1;
                                                const ganIndex = (liuNianYear - 4) % 10;
                                                const zhiIndex = (liuNianYear - 4) % 12;
                                                liuNianList.push({
                                                    year: liuNianYear,
                                                    ganZhi: TIAN_GAN[ganIndex >= 0 ? ganIndex : ganIndex + 10] + DI_ZHI[zhiIndex >= 0 ? zhiIndex : zhiIndex + 12]
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
                                                                <div key={i} className={`border-r border-b border-border/30 text-center py-1.5 cursor-pointer transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-muted/30'}`}
                                                                    onClick={() => setSelectedLiuNianYear(isSelected ? null : ln.year)}
                                                                >
                                                                    <div className="text-xs text-muted-foreground">{ln.year}</div>
                                                                    <div className="flex items-baseline justify-center gap-0.5">
                                                                        <span className="text-base font-display font-semibold" style={{ color: getElementColor(tiangan) }}>{tiangan}</span>
                                                                        <span className="text-xs text-muted-foreground">{details.tianganShiShen}</span>
                                                                    </div>
                                                                    <div className="flex items-baseline justify-center gap-0.5">
                                                                        <span className="text-base font-display font-semibold" style={{ color: getElementColor(dizhi) }}>{dizhi}</span>
                                                                        <span className="text-xs text-muted-foreground">{dizhiShiShen}</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        }
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
