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
    [key: string]: any;
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
    [key: string]: any;
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
    [key: string]: any;
}

export interface GongDesc {
    description: string;
    [key: string]: any;
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
    [key: string]: any;
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
    [key: string]: any;
}

export interface GanComboDesc {
    格局名称?: string;
    详解?: string;
    象意联想?: string;
    测疾病?: string;
    [key: string]: any;
}

export interface XingTimeDesc {
    解读: string;
    原文: string;
    [key: string]: any;
}

export interface ShenMenDesc {
    描述: string;
    [key: string]: any;
}

export interface MenGanDesc {
    描述: string;
    [key: string]: any;
}

export interface MenMenDesc {
    静应: string;
    动应: string;
    [key: string]: any;
}

const CHINESE_NUMS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

export const QimenDataService = {
    getShen(name: string): ShenDesc | null {
        return (shenData as any)[name] || null;
    },
    getXing(name: string): XingDesc | null {
        let data = (xingData as any)[name];
        if (!data && !name.endsWith('星')) {
            data = (xingData as any)[name + '星'];
        }
        return data || null;
    },
    getMen(name: string): MenDesc | null {
        let data = (menData as any)[name];
        if (!data && !name.endsWith('门')) {
            data = (menData as any)[name + '门'];
        }
        return data || null;
    },
    getGong(name: string, position: number): GongDesc | null {
        const cleanName = name.split('')[0];
        const suffix = CHINESE_NUMS[position] ? CHINESE_NUMS[position] + '宫' : '宫';
        const key = cleanName + suffix;
        return (gongData as any)[key] || null;
    },
    getBagua(name: string): BaguaDesc | null {
        const cleanName = name.split('')[0];
        return (baguaData as any)[cleanName] || null;
    },
    getGan(name: string): GanDesc | null {
        const cleanName = name.split('')[0];
        return (ganData as any)[cleanName] || null;
    },
    getGanCombo(tian: string, di: string): GanComboDesc | null {
        const top = (ganComboData as any)[tian];
        if (!top) return null;
        const key = `${tian}+${di}`;
        return top[key] || null;
    },
    getXingTime(star: string, timeBranch: string): XingTimeDesc | null {
        const starFull = star.endsWith('星') ? star : star + '星';
        const top = (xingTimeData as any)[starFull];
        if (!top) return null;
        const key = `${starFull}+${timeBranch}`;
        return top[key] || null;
    },
    getShenMen(shen: string, men: string): ShenMenDesc | null {
        const top = (shenMenData as any)[shen];
        if (!top) return null;
        const menFull = men.endsWith('门') ? men : men + '门';
        const key = `${shen}+${menFull}`;
        return top[key] || null;
    },
    getMenGan(men: string, gan: string): MenGanDesc | null {
        const menFull = men.endsWith('门') ? men : men + '门';
        const top = (menGanData as any)[menFull];
        if (!top) return null;
        const menShort = menFull.replace('门', '');
        const key = `${menShort}+${gan}`;
        return top[key] || null;
    },
    getMenMen(originalMen: string, currentMen: string): MenMenDesc | null {
        const origFull = originalMen.endsWith('门') ? originalMen : originalMen + '门';
        const currFull = currentMen.endsWith('门') ? currentMen : currentMen + '门';
        const top = (menMenData as any)[origFull];
        if (!top) return null;

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
    }
};
