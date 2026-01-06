
/**
 * 八字 - 扩展工具函数
 * 用于计算命卦、星座、缺失五行等额外信息
 */

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

// 五行映射
const GAN_WX_MAP: Record<string, string> = {
    '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
    '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水'
};
const ZHI_WX_MAP: Record<string, string> = {
    '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土',
    '巳': '火', '午': '火', '未': '土', '申': '金', '酉': '金',
    '戌': '土', '亥': '水'
};

/**
 * 计算命卦
 * @param year 公历年份
 * @param gender 性别 (male/female)
 */

import { Solar } from 'lunar-typescript';

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
        const gWx = GAN_WX_MAP[p.tiangan];
        if (gWx) counts[gWx] = (counts[gWx] || 0) + 1;

        // 地支五行
        const zWx = ZHI_WX_MAP[p.dizhi];
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
    const solar = Solar.fromDate(new Date(solarDateStr));
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
    const solar = Solar.fromDate(new Date(solarDateStr));
    const lunar = solar.getLunar();
    return lunar.getYueXiang();
}

/**
 * 获取月将（月将神）
 */
export function getYueJiang(solarDateStr: string): { jiang: string; shen: string } {
    const solar = Solar.fromDate(new Date(solarDateStr));
    const lunar = solar.getLunar();

    // 手动计算月将
    // 规则：雨水后用亥，春分后用戌... (实际通常以中气换将)
    // 简化版：根据月份判断 (需更精确的节气逻辑，这里先做映射)
    const yue = lunar.getMonth();
    const map: string[] = ['丑', '子', '亥', '戌', '酉', '申', '未', '午', '巳', '辰', '卯', '寅'];
    // 农历1月->亥(2), 2->戌... 偏移量处理
    // 注意：月将比较复杂，涉及中气。暂时用简单月份映射代替
    const _jiangIndex = (12 - (yue - 1) + 11) % 12; // 简易算法（仅留备用）
    void _jiangIndex; // 显式标记为已使用
    const yueJiang = map[(yue - 1) % 12]; // 仅做简单示例防止报错

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
 * 获取喜用神（简易推荐）
 * @param missing 缺失的五行
 */
export function getJoyGods(missing: string): { gods: string; direction: string } {
    // 简单逻辑：缺啥补啥
    if (missing === '五行俱全') return { gods: '需综合判断', direction: '-' };

    const gods = missing.split('、');
    const directions: string[] = [];

    gods.forEach(g => {
        if (g === '木') directions.push('东');
        if (g === '火') directions.push('南');
        if (g === '土') directions.push('中');
        if (g === '金') directions.push('西');
        if (g === '水') directions.push('北');
    });

    return {
        gods: gods.join('、'),
        direction: directions.join('、')
    };
}

