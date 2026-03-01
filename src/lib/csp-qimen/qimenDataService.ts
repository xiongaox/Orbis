/**
 * qimenDataService - 应用底层设施
 *
 * 模块定位：
 * - 所在层级：应用底层设施
 * - 主要目标：封装第三方库或核心底层能力
 *
 * 关键职责：
 * - 提供核心逻辑实现或数据处理能力
 * - 处理数据流转与异常边界
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `ShenDesc`, `XingDesc`, `MenDesc`, `GongDesc`, `BaguaDesc`, `GanDesc`, `GanComboDesc`, `XingTimeDesc`, `ShenMenDesc`, `MenGanDesc`, `MenMenDesc`, `JuPatternData`, `QimenDataService`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `shen.json`、内部模块 `xing.json`、内部模块 `men.json` 等 13 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import shenData from './data/shen.json';
import xingData from './data/xing.json';
import menData from './data/men.json';
import baguaData from './data/bagua.json';
import gongData from './data/gong.json';
import ganData from './data/gan.json';
import ganComboData from './data/gan_combo.json';
import xingTimeData from './data/xing_time.json';
import shenMenData from './data/shen_men.json';
import menGanData from './data/men_gan.json';
import menMenData from './data/men_men.json';
import juPatternData from './data/ju_pattern.json';
import { CHINESE_NUMS } from './constants';

export interface ShenDesc {
    内容: string;
    延伸?: string;
    概念?: string;
    人物?: string;
    形态?: string;
    性情?: string;
    人体?: string;
    感觉?: string;
    动物?: string;
    植物?: string;
    食物?: string;
    静物?: string;
    地理?: string;
    求利?: string;
    求名?: string;
    婚姻?: string;
    出行?: string;
    疾病?: string;
    坟墓?: string;
    家宅?: string;
    天时?: string;
    时序?: string;
    数目?: string;
    方位?: string;
    色彩?: string;
    姓氏?: string;
    五音?: string;
    五味?: string;
    参考?: string;
    [key: string]: unknown;
}

export interface XingDesc {
    原名?: string;
    宫位?: string;
    五行?: string;
    吉凶?: string;
    歌诀?: string;
    内容: string;
    日干临星?: string;
    概念?: string;
    人物?: string;
    形态?: string;
    性情?: string;
    人体?: string;
    动物?: string;
    植物?: string;
    静物?: string;
    地理?: string;
    天时?: string;
    颜色?: string;
    [key: string]: unknown;
}

export interface MenDesc {
    内容: string;
    延伸?: string;
    概念?: string;
    人物?: string;
    形态?: string;
    性情?: string;
    人体?: string;
    动物?: string;
    植物?: string;
    静物?: string;
    地理?: string;
    天时?: string;
    颜色?: string;
    [key: string]: unknown;
}

export interface GongDesc {
    description: string;
    [key: string]: unknown;
}

export interface BaguaDesc {
    内容: string;
    象意?: string;
    性情?: string;
    形态?: string;
    天时?: string;
    地理?: string;
    人物?: string;
    动物?: string;
    静物?: string;
    人体?: string;
    食物?: string;
    疾病?: string;
    时间?: string;
    颜色?: string;
    姓名?: string;
    排行?: string;
    数序?: string;
    [key: string]: unknown;
}

export interface GanDesc {
    内容: string;
    概念?: string;
    人物?: string;
    人事?: string;
    形态?: string;
    性情?: string;
    人体?: string;
    感觉?: string;
    动物?: string;
    植物?: string;
    食物?: string;
    静物?: string;
    地理?: string;
    求利?: string;
    求名?: string;
    婚姻?: string;
    出行?: string;
    疾病?: string;
    坟墓?: string;
    家宅?: string;
    天时?: string;
    时序?: string;
    数目?: string;
    方位?: string;
    色彩?: string;
    姓氏?: string;
    五音?: string;
    五味?: string;
    参考?: string;
    延伸?: string;
    [key: string]: unknown;
}

export interface GanComboDesc {
    格局名称?: string;
    详解?: string;
    象意联想?: string;
    测疾病?: string;
    [key: string]: unknown;
}

export interface XingTimeDesc {
    解读: string;
    原文: string;
    [key: string]: unknown;
}

export interface ShenMenDesc {
    描述: string;
    [key: string]: unknown;
}

export interface MenGanDesc {
    描述: string;
    [key: string]: unknown;
}

export interface MenMenDesc {
    静应: string;
    动应: string;
    [key: string]: unknown;
}

export interface JuPatternData {
    应用?: Record<string, string>;
    临马星含义?: string[];
    描述?: string;
    口诀?: string;
    时上马星?: string;
    日干落空亡?: string;
    时干落空亡?: string;
    真空假空?: string;
    定义概念?: string;
    定义?: string;
    含义?: string;
    辨析?: string;
    注意?: string;
    原文?: string;
    详解?: string | Record<string, string>;
    条件?: string;
    特别注意?: string;
    参考?: string;
    总论?: string;
    [key: string]: string | string[] | Record<string, string> | undefined;
}

const shenMap = shenData as unknown as Record<string, ShenDesc | string>;
const xingMap = xingData as unknown as Record<string, XingDesc | string>;
const menMap = menData as unknown as Record<string, MenDesc | string>;
const baguaMap = baguaData as unknown as Record<string, BaguaDesc | string>;
const gongMap = gongData as unknown as Record<string, GongDesc | string>;
const ganMap = ganData as unknown as Record<string, GanDesc | string>;
const ganComboMap = ganComboData as unknown as Record<string, Record<string, GanComboDesc> | string>;
const xingTimeMap = xingTimeData as unknown as Record<string, Record<string, XingTimeDesc> | string>;
const shenMenMap = shenMenData as unknown as Record<string, Record<string, ShenMenDesc> | string>;
const menGanMap = menGanData as unknown as Record<string, Record<string, MenGanDesc> | string>;
const menMenMap = menMenData as unknown as Record<string, Record<string, MenMenDesc> | string>;
const juPatternMap = juPatternData as unknown as Record<string, JuPatternData | string>;

export const QimenDataService = {
    getShen(name: string): ShenDesc | null {
        const data = shenMap[name];
        return data && typeof data === 'object' ? data : null;
    },
    getXing(name: string): XingDesc | null {
        let data = xingMap[name];
        if (!data && !name.endsWith('星')) {
            data = xingMap[name + '星'];
        }
        return data && typeof data === 'object' ? data : null;
    },
    getMen(name: string): MenDesc | null {
        let data = menMap[name];
        if (!data && !name.endsWith('门')) {
            data = menMap[name + '门'];
        }
        return data && typeof data === 'object' ? data : null;
    },
    getGong(name: string, position: number): GongDesc | null {
        const cleanName = name.split('')[0];
        const suffix = CHINESE_NUMS[position] ? CHINESE_NUMS[position] + '宫' : '宫';
        const key = cleanName + suffix;
        const data = gongMap[key];
        return data && typeof data === 'object' ? data : null;
    },
    getBagua(name: string): BaguaDesc | null {
        const cleanName = name.split('')[0];
        const data = baguaMap[cleanName];
        return data && typeof data === 'object' ? data : null;
    },
    getGan(name: string): GanDesc | null {
        const cleanName = name.split('')[0];
        const data = ganMap[cleanName];
        return data && typeof data === 'object' ? data : null;
    },
    getGanCombo(tian: string, di: string): GanComboDesc | null {
        const top = ganComboMap[tian];
        if (!top || typeof top !== 'object') return null;
        const key = `${tian}+${di}`;
        return top[key] || null;
    },
    getXingTime(star: string, timeBranch: string): XingTimeDesc | null {
        const starFull = star.endsWith('星') ? star : star + '星';
        const top = xingTimeMap[starFull];
        if (!top || typeof top !== 'object') return null;
        const key = `${starFull}+${timeBranch}`;
        return top[key] || null;
    },
    getShenMen(shen: string, men: string): ShenMenDesc | null {
        const top = shenMenMap[shen];
        if (!top || typeof top !== 'object') return null;
        const menFull = men.endsWith('门') ? men : men + '门';
        const key = `${shen}+${menFull}`;
        return top[key] || null;
    },
    getMenGan(men: string, gan: string): MenGanDesc | null {
        const menFull = men.endsWith('门') ? men : men + '门';
        const top = menGanMap[menFull];
        if (!top || typeof top !== 'object') return null;
        const menShort = menFull.replace('门', '');
        const key = `${menShort}+${gan}`;
        return top[key] || null;
    },
    getMenMen(originalMen: string, currentMen: string): MenMenDesc | null {
        const origFull = originalMen.endsWith('门') ? originalMen : originalMen + '门';
        const currFull = currentMen.endsWith('门') ? currentMen : currentMen + '门';
        const top = menMenMap[origFull];
        if (!top || typeof top !== 'object') return null;

        // Key is like "休+生" (OriginalShort + CurrentShort)
        const origShort = origFull.replace('门', '');
        const currShort = currFull.replace('门', '');
        const key = `${origShort}+${currShort}`;
        return top[key] || null;
    },
    getOriginalMen(position: number): string | null {
        const MAP: Record<number, string> = {
            1: '休门',
            8: '生门',
            3: '伤门',
            4: '杜门',
            9: '景门',
            2: '死门',
            7: '惊门',
            6: '开门'
        };
        return MAP[position] || null;
    },
    /**
     * 获取局势格局数据（驿马、空亡等）
     * @param name 格局名称，如 "驿马" 或 "空亡"
     */
    getJuPattern(name: string): JuPatternData | null {
        const data = juPatternMap[name];
        return data && typeof data === 'object' ? data : null;
    }
};
