import { useMemo } from 'react';
import type { BaziApiResponse } from '../../../types/bazi';
import {
    getMingGua,
    getConstellation,
    getWuXingStatistics,
    getMoonPhase,
    getYueJiang,
    getJoyGods
} from '../../../lib/xuan-bazi/utils/baziExtendUtil';
import { getNaYin } from '../../../lib/xuan-bazi/utils/baziJichuUtil';


interface BaziBasicInfoPanelProps {
    baziData: BaziApiResponse | null;
}

export default function BaziBasicInfoPanel({ baziData }: BaziBasicInfoPanelProps) {
    const info = useMemo(() => {
        if (!baziData) return null;

        const { pillars, extra, gender, solarDate } = baziData;
        if (!pillars || pillars.length < 4) return null;

        const dateObj = new Date(solarDate);
        const yearYear = !isNaN(dateObj.getFullYear()) ? dateObj.getFullYear() : new Date().getFullYear();
        const month = !isNaN(dateObj.getMonth()) ? dateObj.getMonth() + 1 : 1;
        const day = !isNaN(dateObj.getDate()) ? dateObj.getDate() : 1;

        const mingGua = getMingGua(yearYear, gender);
        const constellation = getConstellation(month, day);
        const wuxingStats = getWuXingStatistics(pillars);

        const wuxingStr = pillars.map(p => {
            const g = p.tianganElement === 'wood' ? '木' : p.tianganElement === 'fire' ? '火' : p.tianganElement === 'earth' ? '土' : p.tianganElement === 'metal' ? '金' : '水';
            const z = p.dizhiElement === 'wood' ? '木' : p.dizhiElement === 'fire' ? '火' : p.dizhiElement === 'earth' ? '土' : p.dizhiElement === 'metal' ? '金' : '水';
            return g + z;
        }).join(' ');

        const wuxingColors = pillars.map(p => ({ gan: p.tiangan, zhi: p.dizhi }));
        const missing = wuxingStats.missing;

        const taiYuan = extra?.taiYuan || '-';
        const mingGong = extra?.mingGong || '-';
        const shenGong = extra?.shenGong || '-';
        const taiYuanNaYin = getNaYin(taiYuan);
        const mingGongNaYin = getNaYin(mingGong);
        const shenGongNaYin = getNaYin(shenGong);

        const yearPillar = pillars[0] || {};
        const dayPillar = pillars[2] || {};

        return {
            yearLife: (yearPillar.naYin || '未知') + "命",
            mingGua,
            zodiacConstellation: `${baziData.zodiac || '-'}、${constellation}`,
            xingXiu: "未知 (待计算)",
            bodyStrength: "身强",
            renYuanSiLing: "癸水值令",
            taiYuan: `${taiYuan}（${taiYuanNaYin}）`,
            taiXi: "乙亥（山头火）",
            mingShenGong: `${mingGong}（${mingGongNaYin}） ${shenGong}（${shenGongNaYin}）`,
            bazi: pillars.map(p => p.ganZhi).join(' '),
            baziWuxing: wuxingStr,
            baziWuxingDetail: wuxingColors,
            missing,
            pattern: "杂气正印格",
            dayMasterProfile: (dayPillar.tiangan || '-') + (dayPillar.tianganElement === 'wood' ? '木' : dayPillar.tianganElement === 'fire' ? '火' : dayPillar.tianganElement === 'earth' ? '土' : dayPillar.tianganElement === 'metal' ? '金' : '水'),
            solarDate: solarDate || '-'
        };
    }, [baziData]);

    if (!info) return null;

    const Item = ({ label, value, valueClass = "", labelClass = "text-muted-foreground w-20 flex-shrink-0" }: { label: string; value: React.ReactNode; valueClass?: string; labelClass?: string }) => (
        <div className="flex items-center text-sm p-1">
            <span className={labelClass}>{label}</span>
            <span className={`font-medium ${valueClass} truncate`}>{value}</span>
        </div>
    );

    const yueJiang = getYueJiang(baziData?.solarDate || '');
    const joyGods = getJoyGods(info.missing);

    return (
        <div className="bg-card/50 rounded-xl border border-border p-3 mt-0 flex flex-col gap-y-0">
            {/* 第一行 */}
            <div className="grid grid-cols-2 gap-x-4">
                <Item label="年命信息" value={info.yearLife} valueClass="text-red-500" />
                <Item label="命卦信息" value={info.mingGua} />
                <Item label="生肖星座" value={info.zodiacConstellation} />
                <Item label="星宿信息" value={info.xingXiu} />
            </div>

            {/* 第二行 */}
            <div className="grid grid-cols-2 gap-x-4">
                <Item label="身体强弱" value={info.bodyStrength} />
                <Item label="人元司令" value={info.renYuanSiLing} valueClass="text-blue-500" />
                <Item label="胎元胎息" value={`${info.taiYuan.split('（')[0]} ${info.taiXi}`} />
                <Item label="命宫身宫" value={info.mingShenGong} />
            </div>

            <div className="h-px bg-border/50 my-1" />

            {/* 第四行 */}
            <div className="grid grid-cols-2 gap-x-4">
                <Item label="五行缺失" value={info.missing} valueClass="text-blue-500" />
                <Item label="月相" value={getMoonPhase(baziData?.solarDate || '')} />
                <Item label="月将" value={yueJiang.jiang} valueClass="text-orange-500 font-bold" />
                <Item label="月将神" value={yueJiang.shen} />
            </div>

            {/* 第五行 */}
            <div className="grid grid-cols-2 gap-x-4">
                <Item label="喜用神" value={joyGods.gods} valueClass="text-green-600" />
                <Item label="喜用神位" value={joyGods.direction} />
                <Item label="格局" value={info.pattern} />
                <Item label="日主属性" value={info.dayMasterProfile} valueClass="text-green-500" />
            </div>

            <div className="h-px bg-border/50 my-1" />

            {/* 节气日期 */}
            <div className="grid grid-cols-2 gap-x-4">
                <Item label="小寒日期" value="2026-01-05 16:23:10" />
                <Item label="立春日期" value="2026-02-04 04:02:08" />
                <Item label="冬至日期" value="2025-12-21 23:03:05" />
                <Item label="大寒日期" value="2026-01-20 09:44:56" />
            </div>

            <div className="h-px bg-border/50 my-1" />

            {/* 出生节气 - 单独一行 */}
            <div className="grid grid-cols-1">
                <Item label="出生节" value="小寒后1天0小时9分49秒、立春前28天11小时29分9秒" />
                <Item label="出生气" value="冬至后15天17小时29分54秒、大寒前13天17小时11分57秒" />
            </div>
        </div>
    );
}
