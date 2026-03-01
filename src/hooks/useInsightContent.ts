/**
 * useInsightContent Hook
 * 计算智能咨询参考内容（穷通宝鉴/滴天髓/三命通会）
 * 从 App.tsx 提取的业务逻辑
 */
import { useMemo } from 'react';
import type { InsightContent } from '../components/Modules/Bazi/InsightPanel';
import type { BaziApiResponse, PillarData } from '../types/bazi';
import { getQiongtongEntry } from '../lib/xuan-bazi/utils/qiongtongUtil';
import { getDiZhiCangGan } from '../lib/xuan-bazi/utils/baziJichuUtil';
import { getDiTianSuiEntry, getDiTianSuiMonthlyEntry } from '../lib/xuan-bazi/utils/ditiansuiUtil';
import { buildSanMingContent } from '../lib/xuan-bazi/utils/sanmingUtil';

// 地支转月份映射
const ZHI_TO_MONTH: Record<string, number> = {
    '寅': 1, '卯': 2, '辰': 3, '巳': 4, '午': 5, '未': 6,
    '申': 7, '酉': 8, '戌': 9, '亥': 10, '子': 11, '丑': 12,
};

// 十天干列表
const TIAN_GAN_LIST = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

interface UseInsightContentParams {
    baziData: BaziApiResponse | null;
    activeBookId: string;
}

/**
 * 计算透藏分析
 */
function calculateTouCangHint(pillars: PillarData[], tiaohou: string | undefined): string {
    if (!tiaohou) return '';

    const touGans = new Set(pillars.map(p => p.tiangan));
    const allCangGans = new Set<string>();
    pillars.forEach(p => {
        const cangGans = getDiZhiCangGan(p.dizhi);
        cangGans.forEach(g => allCangGans.add(g));
    });

    const tiaohouGans = [...new Set(
        tiaohou.split('').filter(c => TIAN_GAN_LIST.includes(c))
    )];

    const touList: string[] = [];
    const cangList: string[] = [];

    tiaohouGans.forEach(gan => {
        if (touGans.has(gan)) {
            touList.push(gan);
        } else if (allCangGans.has(gan)) {
            cangList.push(gan);
        }
    });

    const parts: string[] = [];
    if (touList.length > 0) {
        parts.push(`透${touList.join('')}`);
    }
    if (cangList.length > 0) {
        parts.push(`藏${cangList.join('')}`);
    }
    return parts.length > 0 ? parts.join(' ') : '无';
}

/**
 * 构建滴天髓内容
 */
function buildDiTianSuiContent(pillars: PillarData[]): InsightContent | undefined {
    const riZhu = pillars[2]?.tiangan;
    if (!riZhu) return undefined;

    const yueZhi = pillars[1]?.dizhi;
    const basicEntry = getDiTianSuiEntry(riZhu);

    // 尝试获取按月令的逻辑解析版数据
    if (yueZhi) {
        const monthlyEntry = getDiTianSuiMonthlyEntry(riZhu, yueZhi);
        if (monthlyEntry) {
            return {
                hint: undefined,
                subHint: undefined,
                summary: monthlyEntry.poem,
                summaryTitle: `${monthlyEntry.meta.stem} · ${monthlyEntry.meta.month}`,
                keyPoints: monthlyEntry.analysis.map(a =>
                    `**${a.segment}**\n【${a.tags.join('、')}】\n${a.logic.reasoning}\n💡 ${a.modern_meaning}`
                ),
                keyPointsTitle: '逻辑解析',
                ditiansuiBasic: basicEntry,
            };
        }
    }

    // 回退：没有结构化数据时，只显示原文标签内容
    if (!basicEntry) {
        return {
            hint: undefined,
            subHint: undefined,
            summary: `暂无 ${riZhu}日主 的滴天髓数据`,
            summaryTitle: `${riZhu}干`,
            keyPoints: [],
            keyPointsTitle: '逻辑解析',
            ditiansuiBasic: undefined,
        };
    }

    return {
        hint: undefined,
        subHint: undefined,
        summary: basicEntry.poem,
        summaryTitle: `${riZhu}干`,
        keyPoints: [],
        keyPointsTitle: '逻辑解析',
        ditiansuiBasic: basicEntry,
    };
}

/**
 * 构建三命通会内容
 */
function buildSanMingInsightContent(pillars: PillarData[]): InsightContent | undefined {
    const dayGanZhi = pillars[2]?.ganZhi;
    if (!dayGanZhi) {
        return {
            summary: '请先选择案例',
            keyPoints: [],
        };
    }

    const sanmingContent = buildSanMingContent(dayGanZhi);
    if (!sanmingContent.found) {
        return {
            summary: sanmingContent.summary,
            keyPoints: [],
        };
    }

    return {
        hint: undefined,
        subHint: undefined,
        summary: sanmingContent.summary,
        summaryTitle: sanmingContent.nayinLabel,
        keyPoints: sanmingContent.keyPoints,
        keyPointsTitle: '现代AI解析',
    };
}

/**
 * 构建穷通宝鉴内容
 */
function buildQiongtongContent(pillars: PillarData[]): InsightContent | undefined {
    const riZhu = pillars[2]?.tiangan;
    const yueZhi = pillars[1]?.dizhi;

    if (!riZhu || !yueZhi) {
        return undefined;
    }

    const month = ZHI_TO_MONTH[yueZhi];
    if (!month) {
        return undefined;
    }

    const entry = getQiongtongEntry(riZhu, month);
    const touCangHint = calculateTouCangHint(pillars, entry?.tiaohou);

    if (!entry) {
        return {
            hint: `调候用神提示：${riZhu}日主，${month}月`,
            subHint: touCangHint ? `本八字：${touCangHint}` : '暂无穷通宝鉴数据',
            summary: `当前日主 ${riZhu} 的调候用神数据正在整理中...`,
            keyPoints: ['目前仅支持甲木十二月数据', '其他日主数据将陆续补充'],
        };
    }

    return {
        hint: `调候用神提示：${entry.tiaohou}`,
        subHint: `本八字：${touCangHint}`,
        summary: entry.summary,
        summaryTitle: entry.title,
        keyPoints: entry.keyPoints,
        keyPointsTitle: '要点解析',
    };
}

/**
 * 智能咨询参考内容 Hook
 */
export function useInsightContent({
    baziData,
    activeBookId,
}: UseInsightContentParams): InsightContent | undefined {
    return useMemo<InsightContent | undefined>(() => {
        if (!baziData?.pillars || baziData.pillars.length < 4) {
            return undefined;
        }

        const pillars = baziData.pillars;

        // 根据选中的书籍构建不同内容
        switch (activeBookId) {
            case 'ditiansui':
                return buildDiTianSuiContent(pillars);
            case 'sanming':
                return buildSanMingInsightContent(pillars);
            case 'qiongtong':
            default:
                return buildQiongtongContent(pillars);
        }
    }, [baziData, activeBookId]);
}
