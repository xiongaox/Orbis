/**
 * 奇门排盘方式选项（UI 层共享）。
 * 独立成文件：组件文件只允许导出组件（react-refresh/only-export-components），
 * 混着导出常量会破坏 Fast Refresh。
 */
import type { PaiPanMethod } from '../../../lib/csp-qimen/qimenService';

// 茅山法上游内核存在定元 bug（恒输出下元局），修复合入前暂时下架，
// 回加条件与验收见 docs/qimen-panmethod-fix-plan.md P4/P5
export const PAI_PAN_METHOD_OPTIONS: { value: PaiPanMethod; label: string }[] = [
    { value: 'zhirun', label: '时家转盘置润' },
    { value: 'yinpan', label: '时家转盘阴盘' },
    { value: 'chaibu', label: '时家转盘拆补' },
];

// 当前盘式名称用全量映射：历史锁盘快照可能仍是 maoshan，需正常显示名称
export const PAI_PAN_METHOD_LABELS: Record<PaiPanMethod, string> = {
    zhirun: '时家转盘置润',
    yinpan: '时家转盘阴盘',
    chaibu: '时家转盘拆补',
    maoshan: '时家茅山',
};
