/**
 * 八字 AI 提示词生成模态框
 * 代理 BaseAiPromptModal 组件处理数据拼接逻辑
 */
import { useState, useMemo } from 'react';
import type { BaziApiResponse } from '../../../types/bazi';
import BaseAiPromptModal, { type PromptOption } from '../../Common/BaseAiPromptModal';

interface AiPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: BaziApiResponse | null;
    selectedLiuNianYear?: number | null;
    selectedDaYunIndex?: number | null;
}

export default function AiPromptModal({ isOpen, onClose, data, selectedLiuNianYear, selectedDaYunIndex }: AiPromptModalProps) {
    const [includeDaYun, setIncludeDaYun] = useState(false);
    const [includeLiuNian, setIncludeLiuNian] = useState(false);
    const [userQuestion, setUserQuestion] = useState('');

    const promptText = useMemo(() => {
        if (!data) return '';

        const pillars = data.pillars || [];
        const gender = data.gender;
        const solarDate = data.solarDate;
        const lunarDate = data.lunarDate;

        let text = `我让玄枢录排出了我的八字，详细信息如下：\n`;
        text += `性别：${gender}\n`;
        text += `公历生日：${solarDate}\n`;
        text += `农历生日：${lunarDate}\n`;
        text += `八字四柱：${pillars.map(p => p.ganZhi).join(' ')} （${pillars.map(p => p.label).join(' ')}）\n`;

        if (data.yunInfo) {
            text += `大运起于：出生后${data.yunInfo.startYear}年${data.yunInfo.startMonth}月${data.yunInfo.startDay}天\n`;
        }

        if (includeDaYun && data.daYun && data.daYun.length > 0) {
            const validDaYun = data.daYun.filter(d => d.startAge <= 100);
            text += `大运排布：${validDaYun.map(d => `${d.ganZhi}(${d.startAge}岁)`).join(' → ')}\n`;

            if (selectedDaYunIndex !== undefined && selectedDaYunIndex !== null) {
                const targetDaYun = data.daYun.find(dy => dy.index === selectedDaYunIndex);
                if (targetDaYun) {
                    text += `当前分析大运：${targetDaYun.ganZhi} (${targetDaYun.startAge}岁 - ${targetDaYun.endAge}岁)\n`;
                }
            }
        }

        if (includeLiuNian && data.liuNian) {
            if (selectedLiuNianYear !== undefined && selectedLiuNianYear !== null) {
                const targetLiuNian = data.liuNian.find(ln => ln.year === selectedLiuNianYear);
                if (targetLiuNian) {
                    text += `当前分析流年：${targetLiuNian.year}年 (${targetLiuNian.ganZhi}) ${targetLiuNian.age}岁\n`;
                }
            } else if (data.liuNian.length > 0) {
                const currentYear = new Date().getFullYear();
                const nearbyLiuNian = data.liuNian.filter(ln => ln.year >= currentYear - 5 && ln.year <= currentYear + 15);
                const liuNianStr = nearbyLiuNian.map(ln => `${ln.year}(${ln.ganZhi})`).join(' ');
                text += `近期流年参考：${liuNianStr} ...\n`;
            }
        }

        text += `\n请根据以上信息，严格依据传统子平八字理论进行分析。务必做到有理有据，逻辑清晰。\n`;
        text += `\n请先分析命局强弱与喜用神，然后简要点评婚姻、事业与财运。`;

        const focusParts = [];
        if (includeDaYun && selectedDaYunIndex !== undefined && selectedDaYunIndex !== null) {
            const targetDaYun = data.daYun?.find(dy => dy.index === selectedDaYunIndex);
            if (targetDaYun) focusParts.push(`${targetDaYun.ganZhi}大运`);
        }
        if (includeLiuNian && selectedLiuNianYear) {
            focusParts.push(`${selectedLiuNianYear}流年`);
        }
        if (focusParts.length > 0) {
            text += ` 特别是针对 ${focusParts.join('、')} 的运势分析。`;
        }

        if (userQuestion.trim()) {
            text += `\n\n我的问题是：${userQuestion}`;
        }

        return text;
    }, [data, includeDaYun, includeLiuNian, userQuestion, selectedLiuNianYear, selectedDaYunIndex]);

    const options: PromptOption[] = [
        { label: '包含大运排盘', checked: includeDaYun, onChange: setIncludeDaYun },
        { label: '包含流年排盘', checked: includeLiuNian, onChange: setIncludeLiuNian },
    ];

    return (
        <BaseAiPromptModal
            isOpen={isOpen}
            onClose={onClose}
            moduleName="八字"
            promptText={promptText}
            userQuestion={userQuestion}
            setUserQuestion={setUserQuestion}
            options={options}
        />
    );
}
