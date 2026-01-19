/**
 * CSP WASM 奇门遁甲服务
 * 封装 WASM 调用和数据转换逻辑
 * 核心原则：完全信赖 CSP WASM 输出，不做前端二次计算
 */

import type { QimenPalace } from '../../components/Modules/Qimen/QimenChart';
import { getEightCharFromDate, getSolarToLunarInfo } from '../../utils/lunarUtil';
import { LunarUtil } from 'lunar-typescript';

// ============ 类型定义 ============

export interface QimenTime {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
}

export interface QimenHeader {
    solarDate: string;       // 公历日期
    lunarDate: string;       // 农历日期 (暂空，除非做额外转换)
    time: string;            // 时间 HH:MM
    ju: string;              // 局数（如 "阳遁五局"）
    jieQi: string;           // 节气 (如 "小寒下元")
    xunShou: string;         // 旬首 (从值符推导或暂空)
    zhiFu: string;           // 值符
    zhiShi: string;          // 值使
    maXing: string;          // 马星 (WASM已内置在宫位中，此处仅作 Header 显示参考)
    kongWang: string;        // 空亡
    siZhu: {
        year: string;
        month: string;
        day: string;
        hour: string;
    };
}

export interface QimenResult {
    header: QimenHeader;
    palaces: QimenPalace[];
}

// CSP 原始宫位数据结构
interface CspPalace {
    shen: string;       // 八神
    xing: string;       // 九星
    men: string;        // 八门
    tianPan: string;    // 天盘干 (主)
    tianPanJi: string;  // 天盘干 (寄)
    diPan: string;      // 地盘干 (主)
    diPanJi: string;    // 地盘干 (寄)
    isKong: boolean;    // 是否空亡
    isMa: boolean;      // 是否驿马
}

interface CspParsedData {
    ju: string;           // 局数
    jieQi: string;        // 节气
    sanYuan: string;      // 三元
    zhiFu: string;        // 值符
    zhiShi: string;       // 值使
    xunShou?: string;     // 旬首 (WASM 文本暂未解析，可为空)
    siZhu: string;        // 四柱 (解析 WASM 输出)
    kongWang: string;     // 空亡 (解析 WASM 输出)
    palaces: CspPalace[]; // 9个宫位（按洛书顺序：4,9,2,3,5,7,8,1,6）
}

// ============ WASM 模块管理 ============

let wasmModule: any = null;
let isWasmLoading = false;
let wasmLoadPromise: Promise<boolean> | null = null;

/**
 * 初始化 CSP WASM 模块
 */
export async function initCspWasm(): Promise<boolean> {
    if (wasmModule) return true;
    if (wasmLoadPromise) return wasmLoadPromise;

    wasmLoadPromise = new Promise(async (resolve) => {
        if (isWasmLoading) {
            resolve(false);
            return;
        }

        isWasmLoading = true;
        console.log('🔄 Initializing CSP WASM...');

        try {
            const script = document.createElement('script');
            script.src = '/wasm/csp_qimen.js';
            script.async = true;

            const loadPromise = new Promise<void>((res, rej) => {
                script.onload = () => res();
                script.onerror = rej;
            });

            document.body.appendChild(script);
            await loadPromise;

            if ((window as any).createCspModule) {
                wasmModule = await (window as any).createCspModule({
                    locateFile: (path: string) => `/wasm/${path}`
                });
                console.log('🔥 CSP WASM Loaded Successfully!');
                resolve(true);
            } else {
                console.error('createCspModule not found');
                resolve(false);
            }
        } catch (e) {
            console.error('Failed to load CSP WASM:', e);
            resolve(false);
        } finally {
            isWasmLoading = false;
        }
    });

    return wasmLoadPromise;
}

/**
 * 调用 CSP WASM 进行排盘
 */
function callCspWasm(time: QimenTime, type: number): string {
    if (!wasmModule) return '';

    try {
        const param = new wasmModule.CmdParam();
        param.year = Math.floor(time.year);
        // WASM requires 1-12 for month in manual mode (tyme library convention)
        param.mon = Math.floor(time.month);
        param.day = Math.floor(time.day);

        // 还原为 24小时制 (0-23)
        param.hour = Math.floor(time.hour);
        param.min = Math.floor(time.minute);

        // Initialize fields
        param.sec = 0;
        // Set zone to 0.0 because the input time (str_dt/hour/min) is already Local Time (Beijing Time).
        // If we set zone=8.0, the WASM engine treats input as UTC and adds 8 hours, causing incorrect ShiChen.
        param.zone = 0.0;
        const pad = (n: number) => n.toString().padStart(2, '0');
        // Format YYYY-MM-DD HH:mm:ss
        param.str_dt = `${time.year}-${pad(time.month)}-${pad(time.day)} ${pad(time.hour)}:${pad(time.minute)}:00`;

        // Manual Mode
        param.is_auto = false;

        // Native Calculation for ALL types (ZhiRun, YinPan, ChaiBu, MaoShan)
        // By passing ju=0, we trigger WASM's internal cal_ju() logic
        param.ju = 0;
        param.type = type;

        console.log('[QimenDebug] Native WASM Call:', {
            inputTime: time,
            paramJu: param.ju,
            paramType: param.type,
            paramMonth: param.mon,
            paramStrDt: param.str_dt,
            paramZone: param.zone
        });

        const qm = new wasmModule.CQimenUse();
        const output = qm.run_captured(param);

        param.delete();
        qm.delete();

        return output;
    } catch (e: any) {
        console.error('WASM Execution Error:', e);
        return '';
    }
}

// ============ 解析函数 ============

/**
 * 解析 CSP 输出为结构化数据
 */
function parseCspOutput(output: string): CspParsedData | null {
    if (!output || output.length < 50) return null;

    // 移除 ANSI 颜色码
    const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');
    const lines = cleanOutput.split('\n');

    const result: CspParsedData = {
        ju: '', jieQi: '', sanYuan: '', zhiFu: '', zhiShi: '',
        siZhu: '', kongWang: '',
        palaces: []
    };

    // 解析值符、值使、节气、局数
    for (const line of lines) {
        // 值符：天任  值使：生门    [小寒下元][阳遁五局]
        if (line.includes('值符：') && line.includes('值使：')) {
            const match = line.match(/值符：(\S+)\s+值使：(\S+)\s+\[(\S+)\]\[(\S+)\]/);
            if (match) {
                result.zhiFu = match[1];
                result.zhiShi = match[2];
                result.jieQi = match[3].replace('上元', '').replace('中元', '').replace('下元', '');
                result.sanYuan = match[3].includes('上元') ? '上' : match[3].includes('中元') ? '中' : '下';
                result.ju = match[4];
            }
        }
        // 干支行：干支：乙巳 己丑 癸巳 癸丑 <...法>
        if (line.includes('干支：')) {
            const match = line.match(/干支：(.+?)(?:\s+<|$)/);
            if (match) {
                result.siZhu = match[1].trim().replace(/\s+/g, ' ');
            }
        }
        // 旬空行：旬空：寅卯 午未 午未 寅卯
        if (line.includes('旬空：')) {
            const match = line.match(/旬空：(.+)/);
            if (match) {
                result.kongWang = match[1].trim();
            }
        }
    }

    // 解析九宫格
    const palaceData: CspPalace[] = Array(9).fill(null).map(() => ({
        shen: '', xing: '', men: '',
        tianPan: '', tianPanJi: '',
        diPan: '', diPanJi: '',
        isKong: false, isMa: false
    }));

    // 找到九宫格开始的位置
    let gridStartIdx = -1;
    for (let i = 0; i < lines.length - 2; i++) {
        const line = lines[i].trim();
        if (line.startsWith('|') && lines[i + 1].includes('|') && lines[i + 2].includes('|')) {
            if (/[\u4e00-\u9fa5]/.test(line)) {
                gridStartIdx = i;
                break;
            }
        }
    }

    if (gridStartIdx === -1) {
        return result;
    }

    // 解析三行（每行3个宫）
    const rowMappings = [[4, 9, 2], [3, 5, 7], [8, 1, 6]];

    for (let rowIdx = 0; rowIdx < 3; rowIdx++) {
        const positions = rowMappings[rowIdx];
        const startLine = gridStartIdx + rowIdx * 4;

        if (startLine + 2 >= lines.length) break;

        const shenLine = lines[startLine] || '';
        const xingLine = lines[startLine + 1] || '';
        const menLine = lines[startLine + 2] || '';

        const shenCells = shenLine.split('|');
        const xingCells = xingLine.split('|');
        const menCells = menLine.split('|');

        if (shenCells[0].trim() === '') shenCells.shift();
        if (xingCells[0].trim() === '') xingCells.shift();
        if (menCells[0].trim() === '') menCells.shift();

        for (let colIdx = 0; colIdx < 3; colIdx++) {
            const pos = positions[colIdx];
            const idx = pos === 5 ? 4 : (pos < 5 ? pos - 1 : pos - 2);

            const shenCell = shenCells[colIdx] || '';
            const xingCell = xingCells[colIdx] || '';
            const menCell = menCells[colIdx] || '';

            // 解析八神
            const shenMatch = shenCell.match(/^\s*(\S+)\s*(?:\(([空马])\))?/);
            if (shenMatch) {
                palaceData[idx].shen = shenMatch[1];
                if (shenMatch[2] === '空') palaceData[idx].isKong = true;
                if (shenMatch[2] === '马') palaceData[idx].isMa = true;
            }

            // 解析九星和天盘干
            const xingMatch = xingCell.match(/^\s*(\S+)\s+(\S+)/);
            if (xingMatch) {
                palaceData[idx].xing = xingMatch[1];
                // 天盘干可能包含两个字（主干+寄宫干），需要拆分
                const tianPanStr = xingMatch[2] || '';
                if (tianPanStr.length === 2) {
                    palaceData[idx].tianPan = tianPanStr[0];
                    palaceData[idx].tianPanJi = tianPanStr[1];
                } else {
                    palaceData[idx].tianPan = tianPanStr;
                }
            }

            // 解析八门和地盘干
            const menMatch = menCell.match(/^\s*(\S+)\s+(\S+)/);
            if (menMatch) {
                palaceData[idx].men = menMatch[1].replace('门', '');
                // 地盘干可能包含两个字（主干+寄宫干），需要拆分
                const diPanStr = menMatch[2] || '';
                if (diPanStr.length === 2) {
                    palaceData[idx].diPan = diPanStr[0];
                    palaceData[idx].diPanJi = diPanStr[1];
                } else {
                    palaceData[idx].diPan = diPanStr;
                }
            }
        }
    }

    result.palaces = palaceData;
    return result;
}

// ============ 数据转换 ============

// 宫位名称映射
const GONG_NAMES = ['', '坎', '坤', '震', '巽', '中', '乾', '兑', '艮', '离'];

// 地支与宫位映射 (用于手动计算马星和空亡位置)
// 1:子, 8:丑寅, 3:卯, 4:辰巳, 9:午, 2:未申, 7:酉, 6:戌亥
const ZHI_PALACE_MAP: Record<string, number> = {
    '子': 1,
    '丑': 8, '寅': 8,
    '卯': 3,
    '辰': 4, '巳': 4,
    '午': 9,
    '未': 2, '申': 2,
    '酉': 7,
    '戌': 6, '亥': 6
};

// 驿马查找表 (时支 -> 马星)
const MA_XING_MAP: Record<string, string> = {
    '申': '寅', '子': '寅', '辰': '寅',
    '寅': '申', '午': '申', '戌': '申',
    '巳': '亥', '酉': '亥', '丑': '亥',
    '亥': '巳', '卯': '巳', '未': '巳',
};

// 地盘干顺序：戊己庚辛壬癸丁丙乙
// 用来补全中宫地盘干（虽然 Demo 逻辑中直接置空，但保留此逻辑可防止 UI 数据缺失）
const DI_PAN_GAN_SHUN = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];

// 实际上中宫通常视为寄宫，WASM 并未直接输出中宫独立内容
// Demo 做法：中宫天盘显示 戊 (或根据局数? Demo里写死戊，但实际上应该跟局数有关?)
// 咱们这里跟随 Demo 处理：中宫尽量简化，或者沿用之前逻辑计算中宫地盘

/**
 * 根据局数计算中宫地盘干
 * 阳遁X局：从X宫起甲（戊），顺飞到中宫(5宫)
 * 阴遁X局：从X宫起甲（戊），逆飞到中宫(5宫)
 * 
 * 奇门地盘干排布规则：
 * - 阳遁：戊己庚辛壬癸丁丙乙 按 1→2→3→4→5→6→7→8→9 顺排
 * - 阴遁：戊己庚辛壬癸丁丙乙 按 9→8→7→6→5→4→3→2→1 逆排
 * 
 * 例如阳遁五局（从5宫起戊）：5戊→6己→7庚→8辛→9壬→1癸→2丁→3丙→4乙
 * 所以中宫(5宫)地盘干 = 戊
 * 
 * 例如阳遁一局（从1宫起戊）：1戊→2己→3庚→4辛→5壬→6癸→7丁→8丙→9乙
 * 所以中宫(5宫)地盘干 = 壬
 */
function getZhongGongDiPan(juStr: string): string {
    // 解析局数，如 "阳遁五局" -> { isYang: true, juNum: 5 }
    const match = juStr.match(/(阳|阴)遁([一二三四五六七八九])局/);
    if (!match) return '';

    const isYang = match[1] === '阳';
    const juNumMap: Record<string, number> = {
        '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
        '六': 6, '七': 7, '八': 8, '九': 9
    };
    const juNum = juNumMap[match[2]] || 0;
    if (juNum === 0) return '';

    // 经典置闰/拆补：中宫地盘干恒为“戊”？不，随局数飞。
    // 阳遁五局：5入中，所以中宫是戊。
    // 阳遁一局：1入中（戊），5是壬。
    // 计算逻辑保留之前的即可，这属于 "Post-Processing" 逻辑，WASM 没直接给出的，我们补全。

    // (逻辑同前，未变)
    let steps: number;
    if (isYang) {
        // 阳遁顺排：从X宫起戊(0)，推到5宫。
        // 比如 阳1局: 1=戊(0), 5=壬(4). 5-1 = 4. 
        steps = (5 - juNum + 9) % 9;
    } else {
        // 阴遁逆排：从X宫起戊(0)，推到5宫。
        // 比如 阴9局: 9=戊(0), 5=壬(4). 9-5 = 4.
        steps = (juNum - 5 + 9) % 9;
    }

    return DI_PAN_GAN_SHUN[steps] || '';
}

/**
 * 将 CSP 解析数据转换为 QimenResult
 */
function convertToQimenResult(parsed: CspParsedData, time: QimenTime): QimenResult {
    // 使用 lunarUtil 计算完整的四柱和农历信息
    // 虽然 WASM 输出了部分信息，但为了 UI 显示的完整性（特别是农历和完整的干支），
    // 这里使用 lunar-typescript 进行辅助计算。
    // 前提：输入时间必须是准确的。
    const date = new Date(time.year, time.month - 1, time.day, time.hour, time.minute);
    const eightChar = getEightCharFromDate(date);
    const lunarInfo = getSolarToLunarInfo(date);

    // 解析 WASM 可能只输出了天干，或者我们希望 Header 显示更标准的四柱
    // WASM 的 siZhu 字符串 "乙巳 己丑 癸巳 癸丑"
    const parsedSiZhuParts = parsed.siZhu.split(/\s+/);
    const parsedSiZhu = {
        year: parsedSiZhuParts[0] || '',
        month: parsedSiZhuParts[1] || '',
        day: parsedSiZhuParts[2] || '',
        hour: parsedSiZhuParts[3] || ''
    };

    const siZhu = eightChar ? {
        year: eightChar.yearGan + eightChar.yearZhi,
        month: eightChar.monthGan + eightChar.monthZhi,
        day: eightChar.dayGan + eightChar.dayZhi,
        hour: eightChar.timeGan + eightChar.timeZhi,
    } : {
        year: parsedSiZhu.year || '',
        month: parsedSiZhu.month || '',
        day: parsedSiZhu.day || '',
        hour: parsedSiZhu.hour || ''
    };

    console.log('[QimenDebug] convertToQimenResult:', {
        inputTime: time,
        parsedSiZhu: siZhu,
        cspJu: parsed.ju,
        cspZhiFu: parsed.zhiFu,
        cspZhiShi: parsed.zhiShi
    });

    const hourGanZhi = siZhu.hour;
    const xunShou = hourGanZhi ? LunarUtil.getXun(hourGanZhi) : '';

    // 马星: 时家奇门使用时支计算 (之前误用了日支)
    // 申子辰马在寅, 寅午戌马在申, 巳酉丑马在亥, 亥卯未马在巳
    const hourZhi = siZhu.hour.slice(1);
    const maXingChar = MA_XING_MAP[hourZhi] || '';

    // 空亡：只显示时柱空亡 (用户需求)
    const kongWang = hourGanZhi ? LunarUtil.getXunKong(hourGanZhi) : '';

    // 计算马星和空亡所在的宫位 (覆盖 WASM 输出)
    const maPalacePos = ZHI_PALACE_MAP[maXingChar] || 0;
    const kongObjs = kongWang.split('').map(k => ({ zhi: k, pos: ZHI_PALACE_MAP[k] || 0 }));



    // 构建 header
    const header: QimenHeader = {
        solarDate: `${time.year}年${time.month}月${time.day}日`,
        // 恢复农历显示 (用户要求移除干支年，只保留日期，如 "腊月初一")
        lunarDate: lunarInfo ? `${lunarInfo.monthInChinese}月${lunarInfo.dayInChinese}` : '',
        time: `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`,
        ju: parsed.ju,
        jieQi: parsed.jieQi + parsed.sanYuan + '元', // Combine for display: "小寒下元"
        xunShou: xunShou || parsed.xunShou || '',
        zhiFu: parsed.zhiFu,
        zhiShi: parsed.zhiShi,
        maXing: maXingChar,
        kongWang: kongWang, // 只显示时柱空亡
        siZhu,
    };

    // 构建 palaces
    const palaces: QimenPalace[] = [];

    for (let pos = 1; pos <= 9; pos++) {
        const idx = pos === 5 ? 4 : (pos < 5 ? pos - 1 : pos - 2);
        const cspPalace = parsed.palaces[idx];

        const palace: QimenPalace = {
            position: pos,
            gongName: GONG_NAMES[pos],
            // 中宫（天禽寄坤宫）：只保留地盘干，其他数据清空
            tianPan: pos === 5 ? '' : (cspPalace?.tianPan || ''),
            diPan: pos === 5 ? getZhongGongDiPan(parsed.ju) : (cspPalace?.diPan || ''),
            men: pos === 5 ? '' : (cspPalace?.men ? `${cspPalace.men}门` : ''),
            xing: pos === 5 ? '' : (cspPalace?.xing || ''),
            shen: pos === 5 ? '' : (cspPalace?.shen || ''),
            anGan: '', // CSP 不输出暗干，留空
            // 寄宫干支
            jiGongTianPan: pos === 5 ? '' : (cspPalace?.tianPanJi || ''),
            jiGongDiPan: pos === 5 ? '' : (cspPalace?.diPanJi || ''),
            // 驿马/空亡
            // 手动计算 isKong 和 isMa
            maKong: pos === 5 ? '' : (
                (() => {
                    const isMa = pos === maPalacePos;
                    const isKong = kongObjs.some(k => k.pos === pos);

                    if (isMa && isKong) return '〇/马';
                    if (isKong) return '〇';
                    if (isMa) return '马';
                    return '';
                })()
            ),
            // 旺相休囚（CSP 不输出，留空）
            shenWang: '',
            xingWang: '',
            menWang: '',
            // 十二长生（CSP 不输出，留空）
            jiGongTianPanCS: '',
            jiGongDiPanCS: '',
            anGanShiErCS: '',
            tianPanShiErCS: '',
            diPanShiErCS: '',
        };

        palaces.push(palace);
    }

    return { header, palaces };
}

// ============ 公开 API ============

export type PaiPanMethod = 'zhirun' | 'yinpan' | 'chaibu' | 'maoshan';

const METHOD_TO_TYPE: Record<PaiPanMethod, number> = {
    zhirun: 1,
    yinpan: 2,
    chaibu: 3,
    maoshan: 4,
};

/**
 * 计算奇门遁甲盘
 */
export async function calculateQimen(
    time: QimenTime,
    method: PaiPanMethod = 'zhirun'
): Promise<QimenResult | null> {
    // 确保 WASM 已加载
    const loaded = await initCspWasm();
    if (!loaded) {
        console.error('WASM not loaded');
        return null;
    }

    // 调用 WASM
    const type = METHOD_TO_TYPE[method];
    const output = callCspWasm(time, type);

    if (!output) {
        console.error('WASM returned empty output');
        return null;
    }

    // 解析输出
    const parsed = parseCspOutput(output);
    if (!parsed) {
        console.error('Failed to parse WASM output');
        return null;
    }

    // 转换数据
    return convertToQimenResult(parsed, time);
}

/**
 * 计算当前时间的奇门遁甲盘
 */
export async function calculateQimenNow(method: PaiPanMethod = 'zhirun'): Promise<QimenResult | null> {
    const now = new Date();
    return calculateQimen({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
        hour: now.getHours(),
        minute: now.getMinutes(),
    }, method);
}
