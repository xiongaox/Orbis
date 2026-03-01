/**
 * QimenAiPromptModal - 应用源码层
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
 * - `default QimenAiPromptModal`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、内部模块 `qimenService`、内部模块 `QimenChart` 等 5 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { useState, useMemo } from 'react';
import type { QimenHeader } from '../../../lib/csp-qimen/qimenService';
import type { QimenPalace } from './QimenChart';
import type { GlobalPattern } from '../../../lib/csp-qimen/patternDetector';
import BaseAiPromptModal, { type PromptOption } from '../../Common/BaseAiPromptModal';

interface QimenAiPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    header: QimenHeader;
    palaces: QimenPalace[];
    globalPatterns: GlobalPattern[];
    selectedPalace?: number | null;
    methodLabel?: string;
}

// 辅助计算：根据干支计算空亡
function getKongWang(stem: string, branch: string): string {
    const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

    if (!stem || !branch) return '';

    const sIdx = STEMS.indexOf(stem);
    const bIdx = BRANCHES.indexOf(branch);

    if (sIdx === -1 || bIdx === -1) return '';

    const xunShouBranchIdx = (bIdx - sIdx + 12) % 12;
    const kw1 = (xunShouBranchIdx - 2 + 12) % 12;
    const kw2 = (xunShouBranchIdx - 1 + 12) % 12;

    return BRANCHES[kw1] + BRANCHES[kw2];
}

// 辅助计算：根据地支计算马星
function getMaXing(branch: string): string {
    const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const bIdx = BRANCHES.indexOf(branch);
    if (bIdx === -1) return '';

    if ([8, 0, 4].includes(bIdx)) return '寅';
    if ([2, 6, 10].includes(bIdx)) return '申';
    if ([5, 9, 1].includes(bIdx)) return '亥';
    if ([11, 3, 7].includes(bIdx)) return '巳';

    return '';
}

const LUOSHU_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6];

export default function QimenAiPromptModal({
    isOpen,
    onClose,
    header,
    palaces,
    globalPatterns,
    methodLabel = '时家奇门'
}: QimenAiPromptModalProps) {
    const [includeAllPalaces, setIncludeAllPalaces] = useState(true);
    const [includeGlobalPatterns, setIncludeGlobalPatterns] = useState(true);
    const [userQuestion, setUserQuestion] = useState('');

    const promptText = useMemo(() => {
        if (!header) return '';

        let text = `我让玄枢录用“${methodLabel}”起了一个奇门局，局排布信息如下：\n`;
        text += `起局时间：${header.solarDate}(${header.lunarDate})${header.time}。\n`;

        const sz = header.siZhu;
        text += `干支四柱：${sz.year} ${sz.month} ${sz.day} ${sz.hour}。\n`;
        text += `${header.ju}。\n`;
        text += `${header.jieQi}，旬首:${header.xunShou}。\n`;

        const zhiFuPalace = palaces.find(p => p.xing === header.zhiFu);
        const zhiShiPalace = palaces.find(p => {
            if (!p.men || !header.zhiShi) return false;
            return p.men === header.zhiShi || p.men.includes(header.zhiShi) || header.zhiShi.includes(p.men);
        });

        const zhiFuLoc = zhiFuPalace ? zhiFuPalace.gongName : '';
        const zhiShiLoc = zhiShiPalace ? zhiShiPalace.gongName : '';

        text += `值符:${header.zhiFu}落${zhiFuLoc} 值使:${header.zhiShi}落${zhiShiLoc}。\n`;

        const kwYear = getKongWang(sz.year[0], sz.year[1]);
        const kwMonth = getKongWang(sz.month[0], sz.month[1]);
        const kwDay = getKongWang(sz.day[0], sz.day[1]);
        const kwHour = getKongWang(sz.hour[0], sz.hour[1]);
        text += `空亡：年${kwYear} 月${kwMonth} 日${kwDay} 时${kwHour}。\n`;

        const maYear = getMaXing(sz.year[1]);
        const maMonth = getMaXing(sz.month[1]);
        const maDay = getMaXing(sz.day[1]);
        const maHour = getMaXing(sz.hour[1]);
        text += `驿马星：年${maYear} 月${maMonth} 日${maDay} 时${maHour}。\n\n`;

        if (includeAllPalaces) {
            LUOSHU_ORDER.forEach(pos => {
                const p = palaces.find(x => x.position === pos);
                if (!p) return;

                text += `${p.gongName}${pos}宫宫信息开始：`;

                const parts = [];
                if (p.xing) parts.push(`九星：${p.xing}`);
                if (p.shen) parts.push(`八神：${p.shen}`);
                if (p.men) parts.push(`八门：${p.men}`);
                if (p.tianPan) parts.push(`天盘天干：${p.tianPan}`);
                if (p.diPan) parts.push(`地盘天干：${p.diPan}`);
                if (p.jiGongTianPan) parts.push(`天盘寄天干：${p.jiGongTianPan}`);
                if (p.jiGongDiPan) parts.push(`地盘寄天干：${p.jiGongDiPan}`);

                if (p.maKong?.includes('空')) parts.push(`本宫占空亡`);
                if (p.maKong?.includes('马')) parts.push(`本宫有马星`);

                text += parts.join('；');
                text += `；${p.gongName}${pos}宫宫信息结束。\n\n`;
            });
        }

        if (includeGlobalPatterns && globalPatterns && globalPatterns.length > 0) {
            text += `全局格局信息：${globalPatterns.map(p => p.label).join('、')}。\n\n`;
        }

        text += `请记住以上局式信息，后面我问你问题时你要根据这个奇门局式分析。务必做到有根据、有理论支持，分析的详细还要体会我问问题的心理潜在因素，照顾我的心理感受。请问：\n`;

        if (userQuestion.trim()) {
            text += `\n${userQuestion}\n`;
        }

        return text;
    }, [header, palaces, globalPatterns, includeAllPalaces, includeGlobalPatterns, userQuestion, methodLabel]);

    const options: PromptOption[] = [
        { label: '包含全局格局', checked: includeGlobalPatterns, onChange: setIncludeGlobalPatterns },
        { label: '包含全盘宫位', checked: includeAllPalaces, onChange: setIncludeAllPalaces },
    ];

    return (
        <BaseAiPromptModal
            isOpen={isOpen}
            onClose={onClose}
            moduleName="奇门"
            promptText={promptText}
            userQuestion={userQuestion}
            setUserQuestion={setUserQuestion}
            options={options}
            placeholder="在此输入您关心的问题... (例如：此次出行是否顺利？)"
        />
    );
}
