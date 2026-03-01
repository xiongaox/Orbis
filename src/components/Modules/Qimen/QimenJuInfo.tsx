/**
 * QimenJuInfo - 应用源码层
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
 * - `default QimenJuInfo`, `PillarKey`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、外部依赖 `lunar-typescript`、内部模块 `qimenService` 等 8 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { useMemo } from 'react';
import { Solar } from 'lunar-typescript';
import { type QimenHeader } from '../../../lib/csp-qimen/qimenService';
import { type QimenCase } from '../../../services/qimenCaseService';
import { getEightCharFromDate } from '../../../utils/lunarUtil';

// 导入提取的工具函数和组件
import { MA_XING_MAP, getXunKong, formatSolarTime } from './utils/qimenInfoUtils';
import JuInfoCard from './components/JuInfoCard';
import CaseInfoCard from './components/CaseInfoCard';

export type PillarKey = 'year' | 'month' | 'day' | 'hour';

interface QimenJuInfoProps {
    date: Date;
    header: QimenHeader;
    caseData: QimenCase | null;
    onCaseUpdated?: (updatedCase: QimenCase) => void;
    selectedKongWangKey: PillarKey;
    selectedMaXingKey: PillarKey;
    onKongWangKeyChange: (key: PillarKey) => void;
    onMaXingKeyChange: (key: PillarKey) => void;
    compact?: boolean;
}

export default function QimenJuInfo({
    date, header, caseData, onCaseUpdated,
    selectedKongWangKey, selectedMaXingKey, onKongWangKeyChange, onMaXingKeyChange, compact = false
}: QimenJuInfoProps) {
    // 局基本信息计算
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

    return (
        <div className="h-full flex flex-col bg-card/30 text-card-foreground overflow-y-auto custom-scrollbar">
            {/* 局信息卡片 */}
            <JuInfoCard
                header={header}
                info={info}
                selectedKongWangKey={selectedKongWangKey}
                selectedMaXingKey={selectedMaXingKey}
                onKongWangKeyChange={onKongWangKeyChange}
                onMaXingKeyChange={onMaXingKeyChange}
                compact={compact}
            />

            <div className="h-2 bg-muted/20 border-t border-b border-border/10 flex-shrink-0" />

            {/* 案例信息区 */}
            <CaseInfoCard caseData={caseData} onCaseUpdated={onCaseUpdated} />
        </div>
    );
}
