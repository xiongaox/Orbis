/**
 * BaziBasicInfoPanel - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：承载具体业务模块的前端功能
 *
 * 关键职责：
 * - 渲染 UI 视图并处理交互逻辑
 * - 处理用户输入与展示边界行为
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `default BaziBasicInfoPanel`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、内部模块 `bazi`、内部模块 `baziJichuUtil` 等 5 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { useMemo, useState, type ReactNode } from 'react';
import type { BaziApiResponse } from '../../../types/bazi';
import {
    getMingGua,
    getConstellation,
    getWuXingStatistics,
    getMoonPhase,
    getYueJiang,

    getXingXiu,
    getRenYuanSiLing,
    getTaiXi,
    getDetailedSolarTerms
} from '../../../lib/xuan-bazi/utils/baziExtendUtil';
import { getNaYin } from '../../../lib/xuan-bazi/utils/baziJichuUtil';
import { calculateWangShuai } from '../../../lib/xuan-bazi/utils/wangShuaiUtil';
import PhysicsLogModal from './PhysicsLogModal';


interface BaziBasicInfoPanelProps {
    baziData: BaziApiResponse | null;
    isMobileLayout?: boolean;
}

const TIANGAN_WUXING: Record<string, string> = {
    '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
    '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水'
};

const DIZHI_WUXING: Record<string, string> = {
    '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
    '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水'
};

const getWuxingColor = (wx: string): string => {
    if (wx.includes('水')) return 'text-blue-500';
    if (wx.includes('金')) return 'text-amber-500';
    if (wx.includes('木')) return 'text-green-500';
    if (wx.includes('火')) return 'text-red-500';
    if (wx.includes('土')) return 'text-yellow-600';
    return '';
};

const renderWuxingText = (text: string): ReactNode => {
    if (!text || text === '五行俱全' || text === '需综合判断') {
        return <span>{text}</span>;
    }

    const elements = text.split('、');
    return (
        <>
            {elements.map((el, idx) => (
                <span key={`${el}-${idx}`}>
                    <span className={getWuxingColor(el)}>{el}</span>
                    {idx < elements.length - 1 && <span className="text-muted-foreground">、</span>}
                </span>
            ))}
        </>
    );
};

interface InfoItemProps {
    label: string;
    value: ReactNode;
    isMobileLayout: boolean;
    valueClass?: string;
    onClick?: () => void;
}

function InfoItem({ label, value, isMobileLayout, valueClass = '', onClick }: InfoItemProps) {
    const labelClass = isMobileLayout
        ? 'text-muted-foreground w-14 flex-shrink-0 text-right pr-1 text-xs'
        : 'text-muted-foreground w-20 flex-shrink-0 text-right pr-2';

    return (
        <div
            className={`flex items-center ${isMobileLayout ? 'text-xs p-0.5' : 'text-sm p-1'} ${onClick ? 'cursor-pointer hover:bg-muted/50 rounded transition-colors group' : ''}`}
            onClick={onClick}
        >
            <span className={labelClass}>{label}</span>
            <span className={`font-medium ${valueClass} ${isMobileLayout ? 'break-all' : 'truncate'} ${onClick ? 'underline decoration-dotted underline-offset-4 decoration-border group-hover:decoration-foreground/30' : ''}`}>
                {value}
            </span>
        </div>
    );
}

export default function BaziBasicInfoPanel({ baziData, isMobileLayout = false }: BaziBasicInfoPanelProps) {
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);

    const info = useMemo(() => {
        if (!baziData) return null;

        const { pillars, extra, gender, solarDate } = baziData;
        if (!pillars || pillars.length < 4) return null;

        // 解析中文日期格式
        let yearYear = new Date().getFullYear();
        let month = 1;
        let day = 1;
        const chineseMatch = solarDate?.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
        if (chineseMatch) {
            yearYear = parseInt(chineseMatch[1]);
            month = parseInt(chineseMatch[2]);
            day = parseInt(chineseMatch[3]);
        } else {
            const dateObj = new Date(solarDate);
            if (!isNaN(dateObj.getTime())) {
                yearYear = dateObj.getFullYear();
                month = dateObj.getMonth() + 1;
                day = dateObj.getDate();
            }
        }

        const mingGua = getMingGua(yearYear, gender);
        const constellation = getConstellation(month, day);
        const wuxingStats = getWuXingStatistics(pillars);
        const missing = wuxingStats.missing;

        const taiYuan = extra?.taiYuan || '-';
        const mingGong = extra?.mingGong || '-';
        const shenGong = extra?.shenGong || '-';
        const taiYuanNaYin = getNaYin(taiYuan);
        const mingGongNaYin = getNaYin(mingGong);
        const shenGongNaYin = getNaYin(shenGong);

        const yearPillar = pillars[0] || {};
        const dayPillar = pillars[2] || {};

        // 真实数据计算
        const xingXiu = getXingXiu(solarDate);
        const renYuanSiLing = getRenYuanSiLing(solarDate);
        const dayGanZhi = dayPillar.ganZhi || (dayPillar.tiangan + dayPillar.dizhi);
        const taiXi = getTaiXi(dayGanZhi);
        const solarTerms = getDetailedSolarTerms(solarDate);

        // === ⚡️ 旺衰核心算法调用 ===
        // 适配 Pillars 数据结构
        const wangShuaiInput = pillars.map(p => ({
            tiangan: p.tiangan,
            dizhi: p.dizhi
        }));
        const wangShuaiResult = calculateWangShuai(wangShuaiInput);

        const dayGan = dayPillar.tiangan || '-';
        const dayGanWx = TIANGAN_WUXING[dayGan] || '';

        return {
            yearLife: (yearPillar.naYin || '未知') + "命",
            mingGua,
            zodiacConstellation: `${baziData.zodiac || '-'}、${constellation}`,
            xingXiu,
            // 使用新的 bodyStrength 字段（身强/身弱/从格/专旺）
            bodyStrength: wangShuaiResult.bodyStrength,
            renYuanSiLing,
            taiYuan: `${taiYuan}（${taiYuanNaYin}）`,
            taiXi,
            mingShenGong: `${mingGong}（${mingGongNaYin}） ${shenGong}（${shenGongNaYin}）`,
            missing,
            // 传统格局（正官格、建禄格等）
            pattern: wangShuaiResult.formalPattern,
            joyGods: wangShuaiResult.joyGods.join('、'), // 使用算法计算的喜用
            joyDirection: wangShuaiResult.luckyDirections.join('、'), // 吉利方位
            dayMasterProfile: dayGan + dayGanWx,
            dayMasterWuxing: dayGanWx, // 用于颜色判断
            solarTerms,
            // 附加深度调试日志到对象，方便Tooltip或其他组件使用
            physicsLog: wangShuaiResult.physicsLog
        };
    }, [baziData]);

    if (!info) return null;

    const yueJiang = getYueJiang(baziData?.solarDate || '');


    // 月将的五行颜色
    const yueJiangWx = DIZHI_WUXING[yueJiang.jiang] || '';

    return (
        <div className={`bg-card/50 rounded-xl border border-border ${isMobileLayout ? 'p-2' : 'p-3'} mt-0 flex flex-col gap-y-0`}>
            {/* 第一行 */}
            <div className={`grid grid-cols-2 ${isMobileLayout ? 'gap-x-1' : 'gap-x-4'}`}>
                <InfoItem label="年命信息" value={info.yearLife} valueClass={getWuxingColor(info.yearLife)} isMobileLayout={isMobileLayout} />
                <InfoItem label="命卦信息" value={info.mingGua} isMobileLayout={isMobileLayout} />
                <InfoItem label="生肖星座" value={info.zodiacConstellation} isMobileLayout={isMobileLayout} />
                <InfoItem label="星宿信息" value={info.xingXiu} isMobileLayout={isMobileLayout} />
            </div>

            {/* 第二行 */}
            <div className={`grid grid-cols-2 ${isMobileLayout ? 'gap-x-1' : 'gap-x-4'}`}>
                <InfoItem
                    label="身体强弱"
                    value={info.bodyStrength}
                    valueClass="text-primary font-bold"
                    onClick={() => setIsLogModalOpen(true)}
                    isMobileLayout={isMobileLayout}
                />
                <InfoItem label="人元司令" value={info.renYuanSiLing} valueClass={getWuxingColor(info.renYuanSiLing)} isMobileLayout={isMobileLayout} />
                <InfoItem label="胎元胎息" value={`${info.taiYuan.split('（')[0]} ${info.taiXi}`} isMobileLayout={isMobileLayout} />
                <InfoItem label="命宫身宫" value={info.mingShenGong} isMobileLayout={isMobileLayout} />
            </div>

            <div className="h-px bg-border/50 my-1" />

            {/* 第四行 */}
            <div className={`grid grid-cols-2 ${isMobileLayout ? 'gap-x-1' : 'gap-x-4'}`}>
                <InfoItem label="五行缺失" value={renderWuxingText(info.missing)} isMobileLayout={isMobileLayout} />
                <InfoItem label="月相" value={getMoonPhase(baziData?.solarDate || '')} isMobileLayout={isMobileLayout} />
                <InfoItem label="月将" value={yueJiang.jiang} valueClass={`${getWuxingColor(yueJiangWx)} font-bold`} isMobileLayout={isMobileLayout} />
                <InfoItem label="月将神" value={yueJiang.shen} isMobileLayout={isMobileLayout} />
            </div>

            {/* 第五行 */}
            <div className={`grid grid-cols-2 ${isMobileLayout ? 'gap-x-1' : 'gap-x-4'}`}>
                <InfoItem label="喜用神" value={renderWuxingText(info.joyGods)} isMobileLayout={isMobileLayout} />
                <InfoItem label="喜用神位" value={info.joyDirection} isMobileLayout={isMobileLayout} />
                <InfoItem label="格局" value={info.pattern} isMobileLayout={isMobileLayout} />
                <InfoItem
                    label="日主属性"
                    value={info.dayMasterProfile}
                    valueClass={
                        info.dayMasterWuxing === '木' ? 'text-green-500' :
                            info.dayMasterWuxing === '火' ? 'text-red-500' :
                                info.dayMasterWuxing === '土' ? 'text-yellow-600' :
                                    info.dayMasterWuxing === '金' ? 'text-amber-500' :
                                        info.dayMasterWuxing === '水' ? 'text-blue-500' : ''
                    }
                    isMobileLayout={isMobileLayout}
                />
            </div>

            <div className="h-px bg-border/50 my-1" />

            {/* 节气日期 - 真实数据 */}
            <div className={`grid grid-cols-2 ${isMobileLayout ? 'gap-x-1' : 'gap-x-4'}`}>
                <InfoItem label={`${info.solarTerms.prevJie.name}日期`} value={info.solarTerms.prevJie.date} isMobileLayout={isMobileLayout} />
                <InfoItem label={`${info.solarTerms.nextJie.name}日期`} value={info.solarTerms.nextJie.date} isMobileLayout={isMobileLayout} />
                <InfoItem label={`${info.solarTerms.prevQi.name}日期`} value={info.solarTerms.prevQi.date} isMobileLayout={isMobileLayout} />
                <InfoItem label={`${info.solarTerms.nextQi.name}日期`} value={info.solarTerms.nextQi.date} isMobileLayout={isMobileLayout} />
            </div>

            <div className="h-px bg-border/50 my-1" />

            {/* 出生节气 - 单独一行 */}
            <div className="grid grid-cols-1">
                <InfoItem label="出生节" value={`${info.solarTerms.prevJie.name}后${info.solarTerms.prevJie.diff}、${info.solarTerms.nextJie.name}前${info.solarTerms.nextJie.diff}`} isMobileLayout={isMobileLayout} />
                <InfoItem label="出生气" value={`${info.solarTerms.prevQi.name}后${info.solarTerms.prevQi.diff}、${info.solarTerms.nextQi.name}前${info.solarTerms.nextQi.diff}`} isMobileLayout={isMobileLayout} />
            </div>
            {/* 物理逻辑日志弹窗 */}
            <PhysicsLogModal
                isOpen={isLogModalOpen}
                onClose={() => setIsLogModalOpen(false)}
                logs={info.physicsLog}
                title="旺衰物理逻辑日志"
                description={info.bodyStrength}
                highlightColor="text-primary"
            />
        </div>
    );
}
