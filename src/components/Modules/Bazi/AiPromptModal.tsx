/**
 * AiPromptModal - 应用源码层
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
 * - `default AiPromptModal`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、内部模块 `bazi`、内部模块 `BaseAiPromptModal`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import { useState, useMemo } from 'react';
import type { Case } from '../../../types';
import type { BaziApiResponse, PillarData } from '../../../types/bazi';
import BaseAiPromptModal, { type PromptOption } from '../../Common/BaseAiPromptModal';
import { calculateWangShuaiIndicators } from '../../../lib/xuan-bazi/skills/yueyuanWangShuaiSkill';

interface AiPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: BaziApiResponse | null;
    selectedLiuNianYear?: number | null;
    selectedDaYunIndex?: number | null;
    caseData?: Case | null;
}

export default function AiPromptModal({
    isOpen,
    onClose,
    data,
    selectedLiuNianYear,
    selectedDaYunIndex,
    caseData,
}: AiPromptModalProps) {
    const [includeWangShuai, setIncludeWangShuai] = useState(true);
    const [includeDaYun, setIncludeDaYun] = useState(false);
    const [includeLiuNian, setIncludeLiuNian] = useState(false);
    const [userQuestion, setUserQuestion] = useState('');

    const promptText = useMemo(() => {
        if (!data) return '';

        const pillars = data.pillars || [];
        const gender = data.gender;
        const solarDate = data.solarDate;
        const lunarDate = data.lunarDate;

        let text = `请根据正统子平命理学与跃渊学术体系，对以下命盘进行全息深度推导分析：\n\n`;

        // ⚠️ 真值锚定区必须置于最前（基础信息之上）：它是对「排盘事实」的法定锚定，
        // 属于客观前提；基础信息中的日主/提纲等属于由此派生的解读项。
        // 先锚定再解读，模型才不会在读到派生结论后反向"脑补"排盘。
        // 该块不挂任何复选开关——它是所有推演阶段共同的事实底座。
        try {
            const indicators = calculateWangShuaiIndicators(data);
            const yearP = pillars[0] || ({} as PillarData);
            const monthP = pillars[1] || ({} as PillarData);
            const dayP = pillars[2] || ({} as PillarData);
            const hourP = pillars[3] || ({} as PillarData);

            const tianGans = [
                { label: '年干', gan: yearP.tiangan || '未知', shiShen: yearP.tianganShiShen || '未知' },
                { label: '月干', gan: monthP.tiangan || '未知', shiShen: monthP.tianganShiShen || '未知' },
                { label: '日干', gan: dayP.tiangan || indicators.riGan, shiShen: '日主' },
                { label: '时干', gan: hourP.tiangan || '未知', shiShen: hourP.tianganShiShen || '未知' },
            ];

            const helpGans = tianGans
                .filter((g, idx) => idx !== 2 && (
                    ['比肩', '劫财'].some((b) => g.shiShen.includes(b)) ||
                    ['正印', '偏印', '印'].some((y) => g.shiShen.includes(y))
                ))
                .map((g) => `${g.label}【${g.gan}·${g.shiShen}】`);

            const drainGans = tianGans
                .filter((g, idx) => idx !== 2 && !(
                    ['比肩', '劫财'].some((b) => g.shiShen.includes(b)) ||
                    ['正印', '偏印', '印'].some((y) => g.shiShen.includes(y))
                ))
                .map((g) => `${g.label}【${g.gan}·${g.shiShen}】`);

            const formatZg = (p: PillarData) => {
                return (p.zanggan || []).map((zg) => `${zg.gan}(${zg.shiShen})`).join('、') || '无';
            };

            const structureNote = indicators.specialStructures.length > 0
                ? indicators.specialStructures.map((s) => `  - ${s}`).join('\n')
                : '  - 无明显三合三会全局，按四柱邻支生克常态论';

            text += `============================================================\n`;
            text += `【排盘真值绝对锁定区（系统法定锚定，所有分析必须严格以此为准）】\n`;
            text += `============================================================\n`;
            text += `一、真实天干透出（严格仅此 4 字，绝对无其他天干透出）：\n`;
            text += `1. 年干：【${yearP.tiangan}】（十神：${yearP.tianganShiShen || '未知'}）\n`;
            text += `2. 月干：【${monthP.tiangan}】（十神：${monthP.tianganShiShen || '未知'}）\n`;
            text += `3. 日干：【${dayP.tiangan}】（日主自身）\n`;
            text += `4. 时干：【${hourP.tiangan}】（十神：${hourP.tianganShiShen || '未知'}）\n`;
            text += `- 天干透出帮扶日主之字（比劫/印星）：${helpGans.length > 0 ? helpGans.join('，') : '无（原局天干全无印比透出帮扶）'}\n`;
            text += `- 天干透出克泄耗日主之字（食伤/财星/官杀）：${drainGans.length > 0 ? drainGans.join('，') : '无'}\n`;
            text += `【铁律】：严禁将地支藏干当作天干透出！天干帮扶仅以此处的字为准，切勿捏造“两透或三透”！\n\n`;

            text += `二、真实地支四位（严格仅此 4 支，必须完整核算，切勿遗漏时支）：\n`;
            text += `1. 年支：【${yearP.dizhi}】（星运：${yearP.diShi || '-'}）\n`;
            text += `2. 月支：【${monthP.dizhi}】（月令提纲真神）\n`;
            text += `3. 日支：【${dayP.dizhi}】（日主坐支/夫妻宫）\n`;
            text += `4. 时支：【${hourP.dizhi}】（时柱门户，切勿遗漏！）\n`;
            text += `- 四柱地支序列：[年支${yearP.dizhi}，月支${monthP.dizhi}，日支${dayP.dizhi}，时支${hourP.dizhi}]\n`;
            text += `- 地支客观合会冲刑结构：\n${structureNote}\n\n`;

            text += `三、地支藏干归属（仅为通根与地支暗藏之气，绝非天干透出）：\n`;
            text += `- 年支【${yearP.dizhi}】藏干：${formatZg(yearP)}\n`;
            text += `- 月支【${monthP.dizhi}】藏干：${formatZg(monthP)}\n`;
            text += `- 日支【${dayP.dizhi}】藏干：${formatZg(dayP)}\n`;
            text += `- 时支【${hourP.dizhi}】藏干：${formatZg(hourP)}\n`;
            text += `============================================================\n\n`;

            text += `【子平学术条件变量客观参考】\n`;
            text += `- 得令天时：${indicators.deLing ? '得令（月令同气或生扶）' : '失令（月令休囚）'}\n`;
            text += `- 得地通根：${indicators.deDi ? `得地（${indicators.rootsSummary.join('；')}）` : '不得地（地支无根）'}\n`;
            text += `- 得生得助：${indicators.deSheng ? '得生（印星有源）' : '无印生扶'}；${indicators.deZhu ? '得助（比劫通气）' : '无助'}\n\n`;
        } catch (err) {
            console.warn('子平真值锚定提取跳过:', err);
        }

        text += `【命盘基础信息】\n`;
        text += `- 性别：${gender || '未知'}\n`;
        text += `- 公历生日：${solarDate || '未知'}\n`;
        text += `- 农历生日：${lunarDate || '未知'}\n`;
        text += `- 八字四柱：${pillars.map(p => p.ganZhi).join(' ')} （${pillars.map(p => p.label).join(' ')}）\n`;

        if (data.yunInfo) {
            text += `- 大运起于：出生后${data.yunInfo.startYear}年${data.yunInfo.startMonth}月${data.yunInfo.startDay}天\n`;
        }

        if (includeDaYun && data.daYun && data.daYun.length > 0) {
            const validDaYun = data.daYun.filter(d => d.startAge <= 100);
            text += `- 大运排布：${validDaYun.map(d => `${d.ganZhi}(${d.startAge}岁)`).join('  ')}\n`;

            if (selectedDaYunIndex !== undefined && selectedDaYunIndex !== null) {
                const targetDaYun = data.daYun.find(dy => dy.index === selectedDaYunIndex);
                if (targetDaYun) {
                    text += `- 当前分析大运：${targetDaYun.ganZhi} (${targetDaYun.startAge}岁 - ${targetDaYun.endAge}岁)\n`;
                }
            }
        }

        if (includeLiuNian && data.liuNian) {
            if (selectedLiuNianYear !== undefined && selectedLiuNianYear !== null) {
                const targetLiuNian = data.liuNian.find(ln => ln.year === selectedLiuNianYear);
                if (targetLiuNian) {
                    text += `- 当前分析流年：${targetLiuNian.year}年 (${targetLiuNian.ganZhi}) ${targetLiuNian.age}岁\n`;
                }
            } else if (data.liuNian.length > 0) {
                const currentYear = new Date().getFullYear();
                const nearbyLiuNian = data.liuNian.filter(ln => ln.year >= currentYear - 5 && ln.year <= currentYear + 15);
                const liuNianStr = nearbyLiuNian.map(ln => `${ln.year}(${ln.ganZhi})`).join(' ');
                text += `- 近期流年参考：${liuNianStr} ...\n`;
            }
        }


        // 推演任务段：真值锚定区已恒常输出，此开关只控制「是否附加妻财子禄寿全息推演任务」。
        if (includeWangShuai) {
            text += `\n【跃渊子平学术深度推导与妻财子禄寿全息研判任务】\n`;
            text += `请基于上方【排盘真值绝对锁定区】的客观事实，展开系统严谨的子平学术独立推导，拒绝机械打分与生硬粗筛：\n\n`;
            text += `第一阶段：【命局旺衰格局与用神喜忌学术论证】\n`;
            text += `1. 辩证核验得令、得地、得生、得助与干支克泄耗之实，深入审视提纲令星气量与地支合局损益（如单禄能否胜重财官、是否形成官印相生流通转化）；\n`;
            text += `2. 科学判定命局旺衰倾向与格局定调（身强/身弱/中和偏强/中和偏弱/从格等）；\n`;
            text += `3. 明确推演精准互斥的喜用五行与忌仇五行，说明取用神与去忌神的生克制化理由。\n\n`;
            text += `第二阶段：【深入推演具体的「妻财子禄寿」】\n`;
            text += `在上述学术旺衰与喜忌定调的前提下，条分缕析推导命主的人事吉凶：\n`;
            text += `- 【妻（婚姻情感）】：配偶星喜忌得失清浊、夫妻宫坐支感应与合冲刑穿、正缘应期与婚恋相处特征；\n`;
            text += `- 【财（财富体量）】：财星引通与财库开闭、求财赛道（正财/偏财/食伤生财）、破耗防范与关键发财大运流年；\n`;
            text += `- 【子（子息后代）】：子女星得位情况、子息缘分厚薄与后代发展造化；\n`;
            text += `- 【禄（官杀功名）】：格局高低成败、现代职业赛道匹配（体制公职/企管高阶/自主创业/专业技能立身）及关键贵人运与升迁机缘；\n`;
            text += `- 【寿（元神健康）】：五行偏枯受克关窍、原局身心调候平衡，防范岁运交战冲克之年份。\n`;
        }

        const focusParts = [];
        if (includeDaYun && selectedDaYunIndex !== undefined && selectedDaYunIndex !== null) {
            const targetDaYun = data.daYun?.find(dy => dy.index === selectedDaYunIndex);
            if (targetDaYun) focusParts.push(`${targetDaYun.ganZhi}大运`);
        }
        if (includeLiuNian && selectedLiuNianYear) {
            focusParts.push(`${selectedLiuNianYear}流年`);
        }
        if (focusParts.length > 0) {
            text += `\n特别针对 ${focusParts.join('、')} 的吉凶运势展开精准推演。`;
        }

        if (userQuestion.trim()) {
            text += `\n\n我的具体提问是：${userQuestion}`;
        }

        return text;
    }, [data, includeWangShuai, includeDaYun, includeLiuNian, userQuestion, selectedLiuNianYear, selectedDaYunIndex]);

    const options: PromptOption[] = [
        { label: '妻财子禄寿推演', checked: includeWangShuai, onChange: setIncludeWangShuai },
        { label: '包含大运排盘', checked: includeDaYun, onChange: setIncludeDaYun },
        { label: '包含流年排盘', checked: includeLiuNian, onChange: setIncludeLiuNian },
    ];

    const sessionId = useMemo(() => {
        if (caseData?.id) {
            return `bazi_case_${caseData.id}`;
        }
        if (data?.solarDate) {
            const pillarsKey = data.pillars?.map(p => p.ganZhi).join('_') || '';
            return `bazi_free_${data.solarDate.replace(/\s+/g, '_')}_${pillarsKey}`;
        }
        return 'bazi_default';
    }, [caseData, data]);

    const caseName = useMemo(() => {
        if (caseData?.name) return caseData.name;
        if (data?.solarDate) return `${data.gender || '八字'} · ${data.solarDate}`;
        return '八字排盘';
    }, [caseData, data]);

    const meta = useMemo(() => {
        if (!data) return undefined;
        return {
            solarDate: data.solarDate,
            lunarDate: data.lunarDate,
            gender: data.gender,
            ganZhi: data.pillars?.map(p => p.ganZhi).join(' '),
        };
    }, [data]);

    return (
        <BaseAiPromptModal
            isOpen={isOpen}
            onClose={onClose}
            moduleName="八字"
            promptText={promptText}
            userQuestion={userQuestion}
            setUserQuestion={setUserQuestion}
            options={options}
            sessionId={sessionId}
            caseId={caseData?.id}
            caseName={caseName}
            divinationType="bazi"
            meta={meta}
        />
    );
}
