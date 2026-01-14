
/**
 * 八字 - 扩展工具函数
 * 用于计算命卦、星座、缺失五行等额外信息
 */

import { Solar } from 'lunar-typescript';
import { TIAN_GAN_WU_XING, DI_ZHI_WU_XING, NA_YIN } from '../maps/baziJichuMap';

/**
 * 解析日期字符串（支持多种格式）
 * 支持: "2026-01-07", "2026年1月7日", "2026年1月7日 09:28"
 */
function parseDateString(dateStr: string): Date | null {
    if (!dateStr || dateStr === '-') return null;

    // 尝试标准格式
    let date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;

    // 尝试中文格式：2026年1月7日 或 2026年1月7日 09:28
    const chineseMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日(?:\s*(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (chineseMatch) {
        const year = parseInt(chineseMatch[1]);
        const month = parseInt(chineseMatch[2]) - 1; // JS月份从0开始
        const day = parseInt(chineseMatch[3]);
        const hour = chineseMatch[4] ? parseInt(chineseMatch[4]) : 0;
        const minute = chineseMatch[5] ? parseInt(chineseMatch[5]) : 0;
        const second = chineseMatch[6] ? parseInt(chineseMatch[6]) : 0;
        date = new Date(year, month, day, hour, minute, second);
        if (!isNaN(date.getTime())) return date;
    }

    return null;
}

// 命卦映射
const GUA_MAP: Record<number, string> = {
    1: '坎卦 (东四命)',
    2: '坤卦 (西四命)',
    3: '震卦 (东四命)',
    4: '巽卦 (东四命)',
    5: '中宫', // 特殊处理
    6: '乾卦 (西四命)',
    7: '兑卦 (西四命)',
    8: '艮卦 (西四命)',
    9: '离卦 (东四命)',
    0: '离卦 (东四命)' // 9%9=0
};



/**
 * 计算命卦
 * @param year 公历年份
 * @param gender 性别 (male/female)
 */
export function getMingGua(year: number, gender: string): string {
    let code = 0;
    // 计算基数：取年份后两位
    const y = year % 100;

    if (gender === 'male' || gender === '男' || gender === '乾造') {
        if (year < 2000) {
            code = (100 - y) % 9;
        } else {
            code = (99 - y) % 9;
        }
        if (code === 0) code = 9;
        // 男命5寄坤(2)
        if (code === 5) code = 2;
    } else {
        if (year < 2000) {
            code = (y - 4) % 9;
        } else {
            code = (y + 6) % 9;
        }
        if (code === 0) code = 9;
        // 女命5寄艮(8)
        if (code === 5) code = 8;
    }

    return GUA_MAP[code] || '未知';
}

/**
 * 获取星座
 * @param month 公历月
 * @param day 公历日
 */
export function getConstellation(month: number, day: number): string {
    const s = "魔羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手魔羯";
    const arr = [20, 19, 21, 21, 21, 22, 23, 23, 23, 23, 22, 22];
    const start = month * 2 - (day < arr[month - 1] ? 2 : 0);
    return s.substring(start, start + 2) + "座";
}

/**
 * 统计五行并找出缺失
 * @param pillars 四柱列表
 */
export function getWuXingStatistics(pillars: { tiangan: string; dizhi: string }[]) {
    const counts: Record<string, number> = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };

    pillars.forEach(p => {
        // 天干五行
        const gWx = TIAN_GAN_WU_XING[p.tiangan];
        if (gWx) counts[gWx] = (counts[gWx] || 0) + 1;

        // 地支五行
        const zWx = DI_ZHI_WU_XING[p.dizhi];
        if (zWx) counts[zWx] = (counts[zWx] || 0) + 1;
    });

    const missing: string[] = [];
    ['金', '木', '水', '火', '土'].forEach(wx => {
        if (counts[wx] === 0) missing.push(wx);
    });

    return {
        counts,
        missing: missing.length > 0 ? missing.join('、') : '五行俱全'
    };
}

/**
 * 获取节气信息（前一节气，后一节气，及时间差）
 * @param solarDateStr 公历日期字符串
 */
export function getSolarTerms(solarDateStr: string) {
    const dateObj = parseDateString(solarDateStr);
    if (!dateObj) return { prev: { name: '-', date: '-', diff: '-' }, next: { name: '-', date: '-', diff: '-' } };
    const solar = Solar.fromDate(dateObj);
    const lunar = solar.getLunar();

    // 获取当日前后节气
    const prevJieQi = lunar.getPrevJieQi(true); // true表示包含当天
    const nextJieQi = lunar.getNextJieQi(true);

    const prevName = prevJieQi.getName();
    const nextName = nextJieQi.getName();

    const prevDate = prevJieQi.getSolar();
    const nextDate = nextJieQi.getSolar();

    // 格式化日期时间
    const formatTime = (s: Solar) => `${s.getYear()}-${String(s.getMonth()).padStart(2, '0')}-${String(s.getDay()).padStart(2, '0')} ${String(s.getHour()).padStart(2, '0')}:${String(s.getMinute()).padStart(2, '0')}:${String(s.getSecond()).padStart(2, '0')}`;

    // 计算时间差
    const calcDiff = (target: Solar, current: Solar) => {
        // 计算时间差 (Lunar-typescript 没有直接的时间戳获取，转为 Date 计算)
        // Lunar-typescript 没有直接的时间戳获取，转为 Date 计算
        const d1 = new Date(target.toYmdHms().replace(/-/g, '/'));
        const d2 = new Date(current.toYmdHms().replace(/-/g, '/'));
        const diffMs = Math.abs(d1.getTime() - d2.getTime());

        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

        return `${days}天${hours}小时${mins}分${secs}秒`;
    }

    return {
        prev: { name: prevName, date: formatTime(prevDate), diff: calcDiff(prevDate, solar) },
        next: { name: nextName, date: formatTime(nextDate), diff: calcDiff(nextDate, solar) }
    };
}

/**
 * 获取月相名称
 */
export function getMoonPhase(solarDateStr: string): string {
    const dateObj = parseDateString(solarDateStr);
    if (!dateObj) return '未知';
    const solar = Solar.fromDate(dateObj);
    const lunar = solar.getLunar();
    return lunar.getYueXiang();
}

/**
 * 获取月将（月将神）
 * 正确算法：根据中气换将
 * 雨水后→亥(登明)、春分后→戌(河魁)、谷雨后→酉(从魁)、小满后→申(传送)
 * 夏至后→未(小吉)、大暑后→午(胜光)、处暑后→巳(太乙)、秋分后→辰(天罡)
 * 霜降后→卯(太冲)、小雪后→寅(功曹)、冬至后→丑(大吉)、大寒后→子(神后)
 */
export function getYueJiang(solarDateStr: string): { jiang: string; shen: string } {
    const dateObj = parseDateString(solarDateStr);
    if (!dateObj) return { jiang: '-', shen: '未知' };
    const solar = Solar.fromDate(dateObj);
    const lunar = solar.getLunar();

    // 中气与月将的对应关系
    const QI_JIANG: Array<{ qi: string; jiang: string }> = [
        { qi: '雨水', jiang: '亥' },
        { qi: '春分', jiang: '戌' },
        { qi: '谷雨', jiang: '酉' },
        { qi: '小满', jiang: '申' },
        { qi: '夏至', jiang: '未' },
        { qi: '大暑', jiang: '午' },
        { qi: '处暑', jiang: '巳' },
        { qi: '秋分', jiang: '辰' },
        { qi: '霜降', jiang: '卯' },
        { qi: '小雪', jiang: '寅' },
        { qi: '冬至', jiang: '丑' },
        { qi: '大寒', jiang: '子' }
    ];

    // 获取当前日期之前最近的中气
    const prevQi = lunar.getPrevQi();
    const prevQiName = prevQi.getName();

    // 根据中气找月将
    let yueJiang = '丑'; // 默认冬至后
    for (const item of QI_JIANG) {
        if (item.qi === prevQiName) {
            yueJiang = item.jiang;
            break;
        }
    }

    // 月将神名称映射
    const shenMap: Record<string, string> = {
        '亥': '登明', '戌': '河魁', '酉': '从魁', '申': '传送', '未': '小吉', '午': '胜光',
        '巳': '太乙', '辰': '天罡', '卯': '太冲', '寅': '功曹', '丑': '大吉', '子': '神后'
    };

    return {
        jiang: yueJiang,
        shen: shenMap[yueJiang] || '未知'
    };
}

/**
 * 简易格局判断（基于月令）
 */
export function getPattern(_monthZhi: string, _dayGan: string): string {
    // 这是一个非常简化的示例，实际格局判断非常复杂
    // 这里仅作为占位符逻辑，基于月支本气和日干的关系
    // 参数以下划线前缀标记为有意未使用
    void _monthZhi; void _dayGan;
    const _zhiMainQi: Record<string, string> = {
        '子': '癸', '丑': '己', '寅': '甲', '卯': '乙', '辰': '戊', '巳': '丙',
        '午': '丁', '未': '己', '申': '庚', '酉': '辛', '戌': '戊', '亥': '壬'
    };
    void _zhiMainQi; // 留备用

    // 十神映射简表 (日干 -> 他干 -> 十神)
    // 需引用完整的十神逻辑，这里简化处理，假设已获取到月支的主气
    // 实际应复用 metaphysics.ts 中的 SHI_SHEN_MAP

    return "杂气正印格"; // 暂时返回固定示例，待接入完整十神系统
}

/**
 * 获取喜用神（需要完整的旺衰和格局分析）
 * 注意：真正的喜用神判断需要考虑日主强弱、格局等，"缺什么补什么"是错误的
 * @param _missing 缺失的五行（暂未使用）
 */
export function getJoyGods(_missing: string): { gods: string; direction: string } {
    // TODO: 实现完整的喜用神判断逻辑
    // 1. 计算日主旺衰
    // 2. 分析格局
    // 3. 确定用神和喜神
    void _missing;
    return { gods: '暂未对接', direction: '暂未对接' };
}

/**
 * 获取星宿信息
 * @param solarDateStr 公历日期字符串
 */
export function getXingXiu(solarDateStr: string): string {
    try {
        const dateObj = parseDateString(solarDateStr);
        if (!dateObj) return '未知';
        const solar = Solar.fromDate(dateObj);
        const lunar = solar.getLunar();
        // lunar-typescript 的 getXiu() 返回星宿名称
        const xiu = lunar.getXiu();
        const xiuLuck = lunar.getXiuLuck(); // 吉/凶
        const animal = lunar.getAnimal(); // 导对应动物
        return `${xiu}${animal ? '(' + animal + ')' : ''}${xiuLuck ? ' ' + xiuLuck : ''}`;
    } catch {
        return '未知';
    }
}

/**
 * 获取人元司令
 * 根据日期在月令中的位置，判断当令之气
 * @param solarDateStr 公历日期字符串
 */
export function getRenYuanSiLing(solarDateStr: string): string {
    try {
        const dateObj = parseDateString(solarDateStr);
        if (!dateObj) return '未知';
        const solar = Solar.fromDate(dateObj);
        const lunar = solar.getLunar();

        // 获取月支
        const monthZhi = lunar.getMonthZhi();

        // 地支藏干及其值令天数（简化版）
        // 实际应根据节气后的天数精确计算
        const ZANG_GAN_LING: Record<string, Array<{ gan: string; days: number }>> = {
            '子': [{ gan: '癸', days: 30 }],
            '丑': [{ gan: '癸', days: 9 }, { gan: '辛', days: 3 }, { gan: '己', days: 18 }],
            '寅': [{ gan: '甲', days: 7 }, { gan: '丙', days: 7 }, { gan: '戊', days: 16 }],
            '卯': [{ gan: '乙', days: 30 }],
            '辰': [{ gan: '乙', days: 9 }, { gan: '癸', days: 3 }, { gan: '戊', days: 18 }],
            '巳': [{ gan: '庚', days: 7 }, { gan: '丙', days: 11 }, { gan: '戊', days: 12 }],
            '午': [{ gan: '丙', days: 10 }, { gan: '己', days: 10 }, { gan: '丁', days: 10 }],
            '未': [{ gan: '丁', days: 9 }, { gan: '乙', days: 3 }, { gan: '己', days: 18 }],
            '申': [{ gan: '戊', days: 7 }, { gan: '壬', days: 7 }, { gan: '庚', days: 16 }],
            '酉': [{ gan: '辛', days: 30 }],
            '戌': [{ gan: '辛', days: 9 }, { gan: '丁', days: 3 }, { gan: '戊', days: 18 }],
            '亥': [{ gan: '甲', days: 7 }, { gan: '壬', days: 23 }]
        };

        // 获取节气后天数
        const prevJieQi = lunar.getPrevJie();
        const prevDate = prevJieQi.getSolar();
        const d1 = new Date(solar.toYmdHms().replace(/-/g, '/'));
        const d2 = new Date(prevDate.toYmdHms().replace(/-/g, '/'));
        const daysPassed = Math.floor((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));

        const lings = ZANG_GAN_LING[monthZhi];
        if (!lings) return '未知';

        let accumulated = 0;
        for (const ling of lings) {
            accumulated += ling.days;
            if (daysPassed < accumulated) {
                const ganWx = TIAN_GAN_WU_XING[ling.gan] || '';
                return `${ling.gan}${ganWx}值令`;
            }
        }

        // 默认返回最后一个
        const lastLing = lings[lings.length - 1];
        const lastWx = TIAN_GAN_WU_XING[lastLing.gan] || '';
        return `${lastLing.gan}${lastWx}值令`;
    } catch {
        return '未知';
    }
}

/**
 * 计算胎息（根据日干支推算）
 * 正确算法：天干取五合，地支取六合
 * 天干五合：甲己合、乙庚合、丙辛合、丁壬合、戊癸合
 * 地支六合：子丑合、寅亥合、卯戌合、辰酉合、巳申合、午未合
 * @param dayGanZhi 日柱干支
 */
export function getTaiXi(dayGanZhi: string): string {
    if (!dayGanZhi || dayGanZhi.length !== 2) return '-';

    // 天干五合映射
    const GAN_HE: Record<string, string> = {
        '甲': '己', '己': '甲',
        '乙': '庚', '庚': '乙',
        '丙': '辛', '辛': '丙',
        '丁': '壬', '壬': '丁',
        '戊': '癸', '癸': '戊'
    };

    // 地支六合映射
    const ZHI_HE: Record<string, string> = {
        '子': '丑', '丑': '子',
        '寅': '亥', '亥': '寅',
        '卯': '戌', '戌': '卯',
        '辰': '酉', '酉': '辰',
        '巳': '申', '申': '巳',
        '午': '未', '未': '午'
    };

    const dayGan = dayGanZhi[0];
    const dayZhi = dayGanZhi[1];

    const taiXiGan = GAN_HE[dayGan];
    const taiXiZhi = ZHI_HE[dayZhi];

    if (!taiXiGan || !taiXiZhi) return '-';

    const taiXiGanZhi = taiXiGan + taiXiZhi;

    // 获取胎息纳音（使用公共常量）
    const taiXiNaYin = NA_YIN[taiXiGanZhi] || '';

    return `${taiXiGanZhi}${taiXiNaYin ? '（' + taiXiNaYin + '）' : ''}`
}

/**
 * 获取详细节气信息（区分"节"和"气"）
 * 节：立春、惊蛰、清明、立夏、芒种、小暑、立秋、白露、寒露、立冬、大雪、小寒
 * 气：雨水、春分、谷雨、小满、夏至、大暑、处暑、秋分、霜降、小雪、冬至、大寒
 */
export function getDetailedSolarTerms(solarDateStr: string): {
    prevJie: { name: string; date: string; diff: string };
    nextJie: { name: string; date: string; diff: string };
    prevQi: { name: string; date: string; diff: string };
    nextQi: { name: string; date: string; diff: string };
} {
    // 默认返回值
    const defaultResult = {
        prevJie: { name: '-', date: '-', diff: '-' },
        nextJie: { name: '-', date: '-', diff: '-' },
        prevQi: { name: '-', date: '-', diff: '-' },
        nextQi: { name: '-', date: '-', diff: '-' }
    };

    // 验证日期字符串
    if (!solarDateStr || solarDateStr === '-') {
        return defaultResult;
    }

    try {
        const dateObj = parseDateString(solarDateStr);
        if (!dateObj) {
            return defaultResult;
        }

        const solar = Solar.fromDate(dateObj);
        const lunar = solar.getLunar();

        const formatTime = (s: { getYear: () => number; getMonth: () => number; getDay: () => number; getHour: () => number; getMinute: () => number; getSecond: () => number }) =>
            `${s.getYear()}-${String(s.getMonth()).padStart(2, '0')}-${String(s.getDay()).padStart(2, '0')} ${String(s.getHour()).padStart(2, '0')}:${String(s.getMinute()).padStart(2, '0')}:${String(s.getSecond()).padStart(2, '0')}`;

        const calcDiff = (target: Solar, current: Solar) => {
            const d1 = new Date(target.toYmdHms().replace(/-/g, '/'));
            const d2 = new Date(current.toYmdHms().replace(/-/g, '/'));
            const diffMs = Math.abs(d1.getTime() - d2.getTime());
            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
            return `${days}天${hours}小时${mins}分${secs}秒`;
        };

        // 获取前后"节"
        const prevJie = lunar.getPrevJie();
        const nextJie = lunar.getNextJie();

        // 获取前后"气"
        const prevQi = lunar.getPrevQi();
        const nextQi = lunar.getNextQi();

        return {
            prevJie: {
                name: prevJie.getName(),
                date: formatTime(prevJie.getSolar()),
                diff: calcDiff(prevJie.getSolar(), solar)
            },
            nextJie: {
                name: nextJie.getName(),
                date: formatTime(nextJie.getSolar()),
                diff: calcDiff(nextJie.getSolar(), solar)
            },
            prevQi: {
                name: prevQi.getName(),
                date: formatTime(prevQi.getSolar()),
                diff: calcDiff(prevQi.getSolar(), solar)
            },
            nextQi: {
                name: nextQi.getName(),
                date: formatTime(nextQi.getSolar()),
                diff: calcDiff(nextQi.getSolar(), solar)
            }
        };
    } catch {
        return defaultResult;
    }
}

