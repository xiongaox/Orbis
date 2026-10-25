import { useEffect, useMemo, useState } from 'react';
import { calculateBazi, calculateBaziFromPillars } from '../../../../services/bazi/baziCalculator';
import { calculateQimen, type PaiPanMethod, type QimenResult } from '../../../../lib/csp-qimen/qimenService';
import type { BaziApiResponse } from '../../../../types/bazi';
import type { TikuVolume } from '../../../../lib/caseStudy/tikuParser';

/** 右侧排盘可切换的盘式 */
export type TikuChartKind = 'bazi' | 'qimen';

/**
 * 命例卷的排盘数据。
 * 八字：有公历出生时间按时间即时排盘（不依赖原稿八字，原稿只作校对展示）；
 *       无公历但四柱齐全的卷（如铁口箓趣味局）走四柱直排，大运/流年不可推、置空。
 * 奇门：必须用具体时间起局，缺公历的卷不可用。
 */
export function useTikuChart(volume: TikuVolume | null, kind: TikuChartKind, qimenMethod: PaiPanMethod) {
    const [qimenResult, setQimenResult] = useState<QimenResult | null>(null);
    const [qimenLoading, setQimenLoading] = useState(false);

    const baziData = useMemo<BaziApiResponse | null>(() => {
        if (!volume) return null;
        const gender = volume.gender === '女命' ? 'female' : 'male';
        try {
            if (volume.birthTime) {
                const { year, month, day, hour, minute } = volume.birthTime;
                return calculateBazi({ year, month, day, hour, minute, gender });
            }
            // 无公历：四柱齐全时走干支直排
            const ganZhi = volume.bazi.split(/\s+/).filter(Boolean);
            if (ganZhi.length === 4) return calculateBaziFromPillars(ganZhi, gender);
            return null;
        } catch {
            return null;
        }
    }, [volume]);

    // 奇门结果按「命例 + 局法」缓存：切到八字不重新起局，切回来也直接命中
    const qimenKey = kind === 'qimen' && volume?.birthTime
        ? `${volume.id}|${qimenMethod}`
        : null;

    useEffect(() => {
        if (!qimenKey) return;
        let cancelled = false;
        const { year, month, day, hour, minute } = volume!.birthTime!;
        // setState 一律放在异步回调里，避免 effect 内同步更新引发级联渲染
        void Promise.resolve()
            .then(() => calculateQimen({ year, month, day, hour, minute }, qimenMethod))
            .then((result) => {
                if (!cancelled) setQimenResult(result);
            })
            .catch(() => {
                if (!cancelled) setQimenResult(null);
            })
            .finally(() => {
                if (!cancelled) setQimenLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [qimenKey, volume, qimenMethod]);

    // 未请求奇门时对外呈现的就是「没有奇门结果、也不在计算中」
    const effectiveQimen = qimenKey ? qimenResult : null;
    const effectiveLoading = qimenKey ? qimenLoading : false;

    return { baziData, qimenResult: effectiveQimen, qimenLoading: effectiveLoading };
}
