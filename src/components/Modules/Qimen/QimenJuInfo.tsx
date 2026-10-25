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
    /** 隐私模式由案例区持有：正文弹窗与摘要卡要同步同一状态 */
    isCasePrivacyMode?: boolean;
    onToggleCasePrivacy?: () => void;
    /** 打开案例正文弹窗（弹窗实例由布局层持有） */
    /** intent=edit 时弹窗打开后直接聚焦输入框 */
    onOpenCaseDialog?: (intent?: 'read' | 'edit') => void;
    selectedKongWangKey: PillarKey;
    selectedMaXingKey: PillarKey;
    onKongWangKeyChange: (key: PillarKey) => void;
    onMaXingKeyChange: (key: PillarKey) => void;
    showChangSheng?: boolean;
    showShiShen?: boolean;
    showPalaceMeta?: boolean;
    onToggleChangSheng?: () => void;
    onToggleShiShen?: () => void;
    onTogglePalaceMeta?: () => void;
    compact?: boolean;
    /** 打开盘面元素说明弹窗（弹窗实例由布局层持有，可携带实时宫位数据） */
    onOpenGuide?: () => void;
    /** 终身局「保存」：非空时在「说明」旁显示保存按钮 */
    onSaveLifePan?: () => void;
}

export default function QimenJuInfo({
    date, header, caseData, isCasePrivacyMode = false, onToggleCasePrivacy, onOpenCaseDialog,
    selectedKongWangKey, selectedMaXingKey, onKongWangKeyChange, onMaXingKeyChange,
    showChangSheng, showShiShen, showPalaceMeta,
    onToggleChangSheng, onToggleShiShen, onTogglePalaceMeta, compact = false, onOpenGuide, onSaveLifePan
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
                showChangSheng={showChangSheng}
                showShiShen={showShiShen}
                showPalaceMeta={showPalaceMeta}
                onToggleChangSheng={onToggleChangSheng}
                onToggleShiShen={onToggleShiShen}
                onTogglePalaceMeta={onTogglePalaceMeta}
                compact={compact}
                onOpenGuide={onOpenGuide}
                onSaveLifePan={onSaveLifePan}
            />

            <div className="h-2 bg-muted/20 border-t border-b border-border/10 flex-shrink-0" />

            {/* 案例信息区：摘要卡入口，正文在 CaseDialogModal 中查改 */}
            <CaseInfoCard
                caseData={caseData}
                isPrivacyMode={isCasePrivacyMode}
                onTogglePrivacy={() => onToggleCasePrivacy?.()}
                onOpenDialog={(intent) => onOpenCaseDialog?.(intent)}
            />
        </div>
    );
}
