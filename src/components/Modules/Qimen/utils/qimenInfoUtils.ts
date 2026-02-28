/**
 * 奇门局信息辅助函数
 * 从 QimenJuInfo.tsx 提取
 */
import { Solar } from 'lunar-typescript';

// 马星查找表
export const MA_XING_MAP: Record<string, string> = {
    '申': '寅', '子': '寅', '辰': '寅',
    '寅': '申', '午': '申', '戌': '申',
    '巳': '亥', '酉': '亥', '丑': '亥',
    '亥': '巳', '卯': '巳', '未': '巳',
};

// 地支到宫位映射
export const ZHI_PALACE_MAP: Record<string, number> = {
    '子': 1, '丑': 8, '寅': 8, '卯': 3, '辰': 4, '巳': 4,
    '午': 9, '未': 2, '申': 2, '酉': 7, '戌': 6, '亥': 6,
};

// 旬空计算
export const getXunKong = (ganZhi: string) => {
    if (!ganZhi) return '';
    const gan = ganZhi.substring(0, 1);
    const zhi = ganZhi.substring(1, 2);
    const ganMap: Record<string, number> = { '甲': 1, '乙': 2, '丙': 3, '丁': 4, '戊': 5, '己': 6, '庚': 7, '辛': 8, '壬': 9, '癸': 10 };
    const zhiMap: Record<string, number> = { '子': 1, '丑': 2, '寅': 3, '卯': 4, '辰': 5, '巳': 6, '午': 7, '未': 8, '申': 9, '酉': 10, '戌': 11, '亥': 12 };

    const g = ganMap[gan] || 0;
    const z = zhiMap[zhi] || 0;
    const diff = (z - g + 12) % 12;
    // 0->XuHai, 2->ZiChou, 4->YinMao, 6->ChenSi, 8->WuWei, 10->ShenYou
    const kongMap: Record<number, string> = {
        0: '戌亥', 2: '子丑', 4: '寅卯', 6: '辰巳', 8: '午未', 10: '申酉'
    };
    return kongMap[diff] || '';
};

// 旬首隐藏干映射
export const getXunShouSuffix = (xun: string) => {
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
export const formatSolarTime = (s: Solar) => {
    const y = s.getYear();
    const m = String(s.getMonth()).padStart(2, '0');
    const d = String(s.getDay()).padStart(2, '0');
    const h = String(s.getHour()).padStart(2, '0');
    const min = String(s.getMinute()).padStart(2, '0');
    return `${y}.${m}.${d} ${h}:${min}`;
};
