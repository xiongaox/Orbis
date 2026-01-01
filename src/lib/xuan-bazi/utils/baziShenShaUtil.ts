/**
 * 八字 - 神煞工具
 * 移植自 Java 版本 BaZiShenShaUtil.java
 * @author 善待 (原作者)
 * 
 * 计算各种神煞
 */

import * as ShenShaMap from '../maps/baziShenShaMap';
import type { BaZiShenShaSetting } from '../settings/baziShenShaSetting';
import { getXunKong } from '../../../utils/metaphysics';
// TIAN_GAN, DI_ZHI 用于扩展计算

// ==================== 类型定义 ====================

/**
 * 神煞计算上下文
 */
export interface ShenShaContext {
    /** 性别（1:男 0:女） */
    sex: number;
    /** 季节（春/夏/秋/冬） */
    jiJie: string;
    /** 年柱纳音五行 */
    yearNaYinWuXing: string;
    /** 年干 */
    yearGan: string;
    /** 年支 */
    yearZhi: string;
    /** 月干 */
    monthGan: string;
    /** 月支 */
    monthZhi: string;
    /** 日干 */
    dayGan: string;
    /** 日支 */
    dayZhi: string;
    /** 时干 */
    hourGan: string;
    /** 时支 */
    hourZhi: string;
    /** 日干支 */
    dayGanZhi: string;
    /** 时干支 */
    hourGanZhi: string;
}

/**
 * 神煞结果
 */
export interface ShenShaResult {
    /** 神煞名称 */
    name: string;
    /** 所在柱位（年/月/日/时） */
    position: string;
}

// ==================== 核心计算函数 ====================

/**
 * 计算四柱神煞
 */
export function calculateShenSha(
    context: ShenShaContext,
    setting: BaZiShenShaSetting
): {
    year: ShenShaResult[];
    month: ShenShaResult[];
    day: ShenShaResult[];
    hour: ShenShaResult[];
} {
    const result = {
        year: [] as ShenShaResult[],
        month: [] as ShenShaResult[],
        day: [] as ShenShaResult[],
        hour: [] as ShenShaResult[],
    };

    // ===== 计算年柱神煞 =====
    result.year = calculatePillarShenSha(context, setting, 'year');

    // ===== 计算月柱神煞 =====
    result.month = calculatePillarShenSha(context, setting, 'month');

    // ===== 计算日柱神煞 =====
    result.day = calculatePillarShenSha(context, setting, 'day');

    // ===== 计算时柱神煞 =====
    result.hour = calculatePillarShenSha(context, setting, 'hour');

    return result;
}

/**
 * 计算单柱神煞
 */
/**
 * 计算动态柱（大运/流年）神煞
 */
export function calculateDynamicShenSha(
    context: ShenShaContext,
    setting: BaZiShenShaSetting,
    gan: string,
    zhi: string,
    positionName: string = '动态'
): ShenShaResult[] {
    return calculateShenShaForZhi(context, setting, gan, zhi, {
        pillarType: 'dynamic',
        positionName
    });
}

/**
 * 计算单柱神煞
 */
function calculatePillarShenSha(
    context: ShenShaContext,
    setting: BaZiShenShaSetting,
    pillar: 'year' | 'month' | 'day' | 'hour'
): ShenShaResult[] {
    const position = pillar === 'year' ? '年' : pillar === 'month' ? '月' : pillar === 'day' ? '日' : '时';

    let zhi = '';
    let gan = '';

    switch (pillar) {
        case 'year': zhi = context.yearZhi; gan = context.yearGan; break;
        case 'month': zhi = context.monthZhi; gan = context.monthGan; break;
        case 'day': zhi = context.dayZhi; gan = context.dayGan; break;
        case 'hour': zhi = context.hourZhi; gan = context.hourGan; break;
    }

    return calculateShenShaForZhi(context, setting, gan, zhi, {
        pillarType: pillar,
        positionName: position
    });
}

/**
 * 通用神煞计算核心逻辑
 */
function calculateShenShaForZhi(
    context: ShenShaContext,
    setting: BaZiShenShaSetting,
    gan: string,
    zhi: string,
    options: {
        pillarType: 'year' | 'month' | 'day' | 'hour' | 'dynamic',
        positionName: string
    }
): ShenShaResult[] {
    const { pillarType, positionName: position } = options;
    const results: ShenShaResult[] = [];



    // 太极贵人（年干/日干）
    if (setting.taiJiGuiRen === 0) {
        if (ShenShaMap.TAI_JI_GUI_REN[context.dayGan + zhi] || ShenShaMap.TAI_JI_GUI_REN[context.yearGan + zhi]) {
            results.push({ name: '太极贵人', position });
        }
    }

    // 天乙贵人（年干/日干）
    if (setting.tianYiGuiRen === 0) {
        if (ShenShaMap.TIAN_YI_GUI_REN[context.dayGan + zhi] || ShenShaMap.TIAN_YI_GUI_REN[context.yearGan + zhi]) {
            results.push({ name: '天乙贵人', position });
        }
    }

    // 福星贵人（年干/日干）
    if (setting.fuXingGuiRen === 0) {
        if (ShenShaMap.FU_XING_GUI_REN[context.dayGan + zhi] || ShenShaMap.FU_XING_GUI_REN[context.yearGan + zhi]) {
            results.push({ name: '福星贵人', position });
        }
    }

    // 文昌贵人（年干/日干）
    if (setting.wenChangGuiRen === 0) {
        if (ShenShaMap.WEN_CHANG_GUI_REN[context.dayGan + zhi] || ShenShaMap.WEN_CHANG_GUI_REN[context.yearGan + zhi]) {
            results.push({ name: '文昌贵人', position });
        }
    }

    // 天厨贵人（年干/日干）
    if (setting.tianChuGuiRen === 0) {
        if (ShenShaMap.TIAN_CHU_GUI_REN[context.dayGan + zhi] || ShenShaMap.TIAN_CHU_GUI_REN[context.yearGan + zhi]) {
            results.push({ name: '天厨贵人', position });
        }
    }

    // 天官贵人（年干）
    if (setting.tianGuanGuiRen === 0) {
        if (ShenShaMap.TIAN_GUAN_GUI_REN[context.yearGan + zhi]) {
            results.push({ name: '天官贵人', position });
        }
    }

    // 月德贵人（月支查天干）- 仅在天干上显示，但此处是基于地支的函数？
    // 注意：月德贵人是 天干 神煞。我们需要检查该柱的 天干 是否符合 月支 的要求。
    // 但是 `calculatePillarShenSha` 主要基于 `zhi`。
    // 我们需要获取该柱的天干。
    // 月德贵人等需检查天干
    if (gan) {
        if (setting.yueDeGuiRen === 0) {
            if (ShenShaMap.YUE_DE_GUI_REN[context.monthZhi + gan]) {
                results.push({ name: '月德贵人', position });
            }
        }
        if (setting.tianDeGuiRen === 0) {
            // 天德贵人查天干
            if (ShenShaMap.TIAN_DE_GUI_REN[context.monthZhi + gan]) {
                results.push({ name: '天德贵人', position });
            }
        }
        if (setting.deXiuGuiRen === 0) {
            if (ShenShaMap.DE_XIU_GUI_REN[context.monthZhi + gan]) {
                results.push({ name: '德秀贵人', position });
            }
        }
        if (setting.tianDeHe === 0) {
            if (ShenShaMap.TIAN_DE_HE[context.monthZhi + gan]) {
                results.push({ name: '天德合', position });
            }
        }
        if (setting.yueDeHe === 0) {
            if (ShenShaMap.YUE_DE_HE[context.monthZhi + gan]) {
                results.push({ name: '月德合', position });
            }
        }
    }

    // 天德贵人（部分查地支）
    if (setting.tianDeGuiRen === 0) {
        if (ShenShaMap.TIAN_DE_GUI_REN[context.monthZhi + zhi]) {
            results.push({ name: '天德贵人', position });
        }
    }

    // 天德合（部分查地支）
    if (setting.tianDeHe === 0) {
        if (ShenShaMap.TIAN_DE_HE[context.monthZhi + zhi]) {
            results.push({ name: '天德合', position });
        }
    }

    // 国印（年干/日干）
    if (setting.guoYin === 0) {
        if (ShenShaMap.GUO_YIN[context.dayGan + zhi] || ShenShaMap.GUO_YIN[context.yearGan + zhi]) {
            results.push({ name: '国印', position });
        }
    }

    // 金舆（年干/日干）
    if (setting.jinYu === 0) {
        if (ShenShaMap.JIN_YU[context.dayGan + zhi] || ShenShaMap.JIN_YU[context.yearGan + zhi]) {
            results.push({ name: '金舆', position });
        }
    }

    // 红艳煞（日干）
    if (setting.hongYanSha === 0) {
        if (ShenShaMap.HONG_YAN_SHA[context.dayGan + zhi]) {
            results.push({ name: '红艳煞', position });
        }
    }

    // 羊刃（日干）
    if (setting.yangRen === 0) {
        if (ShenShaMap.YANG_REN[context.dayGan + zhi]) {
            results.push({ name: '羊刃', position });
        }
    }

    // 飞刃（日干）
    if (setting.feiRen === 0) {
        if (ShenShaMap.FEI_REN[context.dayGan + zhi]) {
            results.push({ name: '飞刃', position });
        }
    }

    // 流霞（日干）
    if (setting.liuXia === 0) {
        if (ShenShaMap.LIU_XIA[context.dayGan + zhi]) {
            results.push({ name: '流霞', position });
        }
    }

    // 禄神（日干）
    if (setting.luShen === 0) {
        if (ShenShaMap.LU_SHEN[context.dayGan + zhi]) {
            results.push({ name: '禄神', position });
        }
    }

    // 驿马（年支/日支）
    if (setting.yiMa === 0) {
        if (ShenShaMap.YI_MA[context.yearZhi + zhi] || ShenShaMap.YI_MA[context.dayZhi + zhi]) {
            results.push({ name: '驿马', position });
        }
    }

    // 劫煞（年支/日支）
    if (setting.jieSha === 0) {
        if (ShenShaMap.JIE_SHA[context.yearZhi + zhi] || ShenShaMap.JIE_SHA[context.dayZhi + zhi]) {
            results.push({ name: '劫煞', position });
        }
    }

    // 将星（年支/日支）
    if (setting.jiangXing === 0) {
        if (ShenShaMap.JIANG_XING[context.yearZhi + zhi] || ShenShaMap.JIANG_XING[context.dayZhi + zhi]) {
            results.push({ name: '将星', position });
        }
    }

    // 桃花（年支/日支）
    if (setting.taoHua === 0) {
        if (ShenShaMap.TAO_HUA[context.yearZhi + zhi] || ShenShaMap.TAO_HUA[context.dayZhi + zhi]) {
            results.push({ name: '桃花', position });
        }
    }

    // 亡神（年支/日支）
    if (setting.wangShen === 0) {
        if (ShenShaMap.WANG_SHEN[context.yearZhi + zhi] || ShenShaMap.WANG_SHEN[context.dayZhi + zhi]) {
            results.push({ name: '亡神', position });
        }
    }

    // 华盖（年支/日支）
    if (setting.huaGai === 0) {
        if (ShenShaMap.HUA_GAI[context.yearZhi + zhi] || ShenShaMap.HUA_GAI[context.dayZhi + zhi]) {
            results.push({ name: '华盖', position });
        }
    }

    // 吊客（年支）
    if (setting.diaoKe === 0) {
        if (ShenShaMap.DIAO_KE[context.yearZhi + zhi]) {
            results.push({ name: '吊客', position });
        }
    }

    // 披麻（年支）
    if (setting.piMa === 0) {
        if (ShenShaMap.PI_MA[context.yearZhi + zhi]) {
            results.push({ name: '披麻', position });
        }
    }

    // 天喜（年支）
    if (setting.tianXi === 0) {
        if (ShenShaMap.TIAN_XI[context.yearZhi + zhi]) {
            results.push({ name: '天喜', position });
        }
    }

    // 勾绞煞（年支）
    if (setting.gouJiaoSha === 0) {
        if (ShenShaMap.GOU_JIAO_SHA[context.yearZhi + zhi]) {
            results.push({ name: '勾绞煞', position });
        }
    }

    // 红鸾（年支）
    if (setting.hongLuan === 0) {
        if (ShenShaMap.HONG_LUAN[context.yearZhi + zhi]) {
            results.push({ name: '红鸾', position });
        }
    }

    // 丧门（年支）
    if (setting.sangMen === 0) {
        if (ShenShaMap.SANG_MEN[context.yearZhi + zhi]) {
            results.push({ name: '丧门', position });
        }
    }

    // 灾煞（年支）
    if (setting.zaiSha === 0) {
        if (ShenShaMap.ZAI_SHA[context.yearZhi + zhi]) {
            results.push({ name: '灾煞', position });
        }
    }

    // 孤辰（年支）
    if (setting.guChen === 0) {
        if (ShenShaMap.GU_CHEN[context.yearZhi + zhi]) {
            results.push({ name: '孤辰', position });
        }
    }

    // 寡宿（年支）
    if (setting.guaXiu === 0) {
        if (ShenShaMap.GUA_XIU[context.yearZhi + zhi]) {
            results.push({ name: '寡宿', position });
        }
    }

    // 元辰（年支）- 区分男女阴阳? 
    // 目前简单处理，此处需 context.sex (1男0女) 和 年干阴阳
    // 年干阴阳：甲丙戊庚壬为阳，乙丁己辛癸为阴
    // 阳男阴女 用 YUAN_CHEN_YANG_NAN
    // 阴男阳女 用 YUAN_CHEN_YIN_NAN
    if (setting.yuanChen === 0) {
        const yangGans = ['甲', '丙', '戊', '庚', '壬'];
        const isYearYang = yangGans.includes(context.yearGan);
        const isMale = context.sex === 1;

        let isYangNanYinNv = false;
        if ((isMale && isYearYang) || (!isMale && !isYearYang)) {
            isYangNanYinNv = true;
        }

        if (isYangNanYinNv) {
            if (ShenShaMap.YUAN_CHEN_YANG_NAN[context.yearZhi + zhi]) {
                results.push({ name: '元辰', position });
            }
        } else {
            if (ShenShaMap.YUAN_CHEN_YIN_NAN[context.yearZhi + zhi]) {
                results.push({ name: '元辰', position });
            }
        }
    }

    // 六厄（年支）
    if (setting.liuE === 0) {
        if (ShenShaMap.LIU_E[context.yearZhi + zhi]) {
            results.push({ name: '六厄', position });
        }
    }

    // 血刃（月支）
    if (setting.xueRen === 0) {
        if (ShenShaMap.XUE_REN[context.monthZhi + zhi]) {
            results.push({ name: '血刃', position });
        }
    }

    // 天医（月支）
    if (setting.tianYi === 0) {
        if (ShenShaMap.TIAN_YI[context.monthZhi + zhi]) {
            results.push({ name: '天医', position });
        }
    }

    // 天赦 (日柱)
    if (pillarType === 'day' && setting.tianShe === 0) {
        if (ShenShaMap.TIAN_SHE[context.monthZhi + context.dayGanZhi]) {
            results.push({ name: '天赦', position });
        }
    }

    // 天转 (日柱)
    if (pillarType === 'day' && setting.tianZhuan === 0) {
        if (ShenShaMap.TIAN_ZHUAN[context.monthZhi + context.dayGanZhi]) {
            results.push({ name: '天转', position });
        }
    }

    // 地转 (日柱)
    if (pillarType === 'day' && setting.diZhuan === 0) {
        if (ShenShaMap.DI_ZHUAN[context.monthZhi + context.dayGanZhi]) {
            results.push({ name: '地转', position });
        }
    }

    // 四废日 (日柱)
    if (pillarType === 'day' && setting.siFeiRi === 0) {
        if (ShenShaMap.SI_FEI_RI[context.monthZhi + context.dayGanZhi]) {
            results.push({ name: '四废日', position });
        }
    }

    // 童子煞 (日支/时支/动态) - 动态柱如流年也可能犯童子? 通常童子查命中。
    // 这里仅允许日时
    if ((pillarType === 'day' || pillarType === 'hour') && setting.tongZiSha === 0) {
        // 查季节
        if (ShenShaMap.TONG_ZI_SHA[context.jiJie + zhi]) {
            results.push({ name: '童子煞', position });
        }
        // 查纳音
        // 纳音五行: 金木水火土
        // context.yearNaYinWuXing 需包含五行字符
        const nayin = context.yearNaYinWuXing.slice(-1); // 假设最后一个字是五行
        if (ShenShaMap.TONG_ZI_SHA[nayin + zhi]) {
            // 避免重复添加
            if (!results.some(r => r.name === '童子煞')) {
                results.push({ name: '童子煞', position });
            }
        }
    }

    // 三奇贵人 (涉及三柱)
    // 简单判断逻辑: 只要当前柱参与了三奇组合，就标记
    if (setting.sanQiGuiRen === 0) {
        const tianSanQi = context.yearGan + context.monthGan + context.dayGan; // 天三奇
        const diSanQi = context.monthGan + context.dayGan + context.hourGan; // 地三奇 (这里借用术语，实际是另一组三奇)
        // 映射表里有排列组合的所有情况

        let match = false;
        // 检查第一组 (年月日)
        if (ShenShaMap.SAN_QI_GUI_REN[tianSanQi]) {
            if (pillarType === 'year' || pillarType === 'month' || pillarType === 'day') match = true;
        }
        // 检查第二组 (月日时)
        if (ShenShaMap.SAN_QI_GUI_REN[diSanQi]) {
            if (pillarType === 'month' || pillarType === 'day' || pillarType === 'hour') match = true;
        }

        if (match) results.push({ name: '三奇贵人', position });
    }

    // 拱禄 (日时)
    if (setting.gongLu === 0) {
        // 只在日柱或时柱显示? 既然是拱出来的，通常算作吉神，显示在日或时均可
        // 这里两个都显示
        if (pillarType === 'day' || pillarType === 'hour') {
            const keyPrefix = context.dayGanZhi + context.hourGanZhi; // 比如 "癸亥癸丑"
            // 遍历查找
            const gongLuKeys = Object.keys(ShenShaMap.GONG_LU);
            if (gongLuKeys.some(k => k.startsWith(keyPrefix))) {
                results.push({ name: '拱禄', position });
            }
        }
    }

    // 空亡 (各柱地支)
    if (setting.kongWang === 0) {
        // 日空
        const dayKw = getXunKong(context.dayGanZhi);
        if (dayKw.includes(zhi)) {
            if (!results.some(r => r.name === '空亡')) {
                results.push({ name: '空亡', position });
            }
        }
        // 年空
        const yearKw = getXunKong(context.yearGan + context.yearZhi);
        if (yearKw.includes(zhi)) {
            if (!results.some(r => r.name === '空亡')) {
                results.push({ name: '空亡', position });
            }
        }
    }

    // 阴注阳受（月支）
    if (setting.yinZhuYangShou === 0) {
        if (ShenShaMap.YIN_ZHU_YANG_SHOU[context.monthZhi + zhi]) {
            results.push({ name: '阴注阳受', position });
        }
    }

    // 天罗地网（年支/日支）
    if (setting.tianLuoDiWang === 0) {
        if (ShenShaMap.TIAN_LUO_DI_WANG[context.yearZhi + zhi] || ShenShaMap.TIAN_LUO_DI_WANG[context.dayZhi + zhi]) {
            results.push({ name: '天罗地网', position });
        }
    }

    // 孤鸾煞 (仅日柱)
    if (pillarType === 'day' && setting.guLuanSha === 0) {
        if (isGuLuanSha(context.dayGanZhi)) results.push({ name: '孤鸾煞', position });
    }
    // 其他日柱神煞 (仅日柱)
    if (pillarType === 'day') {
        if (isShiEDaBai(context.dayGanZhi) && setting.shiEDaBai === 0) results.push({ name: '十恶大败', position });
        if (isYinChaYangCuo(context.dayGanZhi) && setting.yinChaYangCuo === 0) results.push({ name: '阴差阳错', position });
        if (isLiuXiuRi(context.dayGanZhi) && setting.liuXiuRi === 0) results.push({ name: '六秀日', position });
        if (isShiLingRi(context.dayGanZhi) && setting.shiLingRi === 0) results.push({ name: '十灵日', position });
        if (isKuiGangRi(context.dayGanZhi) && setting.kuiGangRi === 0) results.push({ name: '魁罡日', position });
        if (isBaZhuanRi(context.dayGanZhi) && setting.baZhuanRi === 0) results.push({ name: '八专日', position });
        if (isJiuChouRi(context.dayGanZhi) && setting.jiuChouRi === 0) results.push({ name: '九丑日', position });
        if (isJinShen(context.dayGanZhi) && setting.jinShen === 0) results.push({ name: '金神', position });
    }

    // 截空 (日干+时支) -> 仅时支
    if (pillarType === 'hour' && setting.jieKong === 0) {
        if (ShenShaMap.JIE_KONG[context.dayGan + zhi]) {
            results.push({ name: '截空', position });
        }
    }

    // 学堂词馆 (支持子平法 + 禄命法)
    if (setting.xueTang === 0) {
        // 子平法 (年干/日干 + zhi)
        if (ShenShaMap.XUE_TANG_ZI_PING[context.dayGan + zhi] || ShenShaMap.XUE_TANG_ZI_PING[context.yearGan + zhi]) {
            // 避免重复
            if (!results.some(r => r.name === '学堂')) {
                results.push({ name: '学堂', position });
            }
        }
        // 禄命法 (年柱纳音五行 + zhi)
        const nayin = context.yearNaYinWuXing.slice(-1);
        if (ShenShaMap.XUE_TANG_LU_MING[nayin + zhi]) {
            if (!results.some(r => r.name === ShenShaMap.XUE_TANG_LU_MING[nayin + zhi])) {
                results.push({ name: ShenShaMap.XUE_TANG_LU_MING[nayin + zhi], position });
            }
        }
    }

    if (setting.ciGuan === 0) {
        // 子平法 (年干/日干 + zhi)
        if (ShenShaMap.CI_GUAN_ZI_PING[context.dayGan + zhi] || ShenShaMap.CI_GUAN_ZI_PING[context.yearGan + zhi]) {
            if (!results.some(r => r.name === '词馆')) {
                results.push({ name: '词馆', position });
            }
        }
        // 禄命法 (年柱纳音五行 + zhi)
        const nayin = context.yearNaYinWuXing.slice(-1);
        if (ShenShaMap.CI_GUAN_LU_MING[nayin + zhi]) {
            if (!results.some(r => r.name === ShenShaMap.CI_GUAN_LU_MING[nayin + zhi])) {
                results.push({ name: ShenShaMap.CI_GUAN_LU_MING[nayin + zhi], position });
            }
        }
    }

    return results;
}

// ==================== 日柱特殊神煞 ====================

/**
 * 检查十恶大败日
 */
export function isShiEDaBai(dayGanZhi: string): boolean {
    return ShenShaMap.SHI_E_DA_BAI.includes(dayGanZhi);
}

/**
 * 检查阴差阳错日
 */
export function isYinChaYangCuo(dayGanZhi: string): boolean {
    return ShenShaMap.YIN_CHA_YANG_CUO.includes(dayGanZhi);
}

/**
 * 检查孤鸾煞日
 */
export function isGuLuanSha(dayGanZhi: string): boolean {
    return ShenShaMap.GU_LUAN_SHA.includes(dayGanZhi);
}

/**
 * 检查六秀日
 */
export function isLiuXiuRi(dayGanZhi: string): boolean {
    return ShenShaMap.LIU_XIU_RI.includes(dayGanZhi);
}

/**
 * 检查十灵日
 */
export function isShiLingRi(dayGanZhi: string): boolean {
    return ShenShaMap.SHI_LING_RI.includes(dayGanZhi);
}

/**
 * 检查魁罡日
 */
export function isKuiGangRi(dayGanZhi: string): boolean {
    return ShenShaMap.KUI_GANG_RI.includes(dayGanZhi);
}

/**
 * 检查八专日
 */
export function isBaZhuanRi(dayGanZhi: string): boolean {
    return ShenShaMap.BA_ZHUAN_RI.includes(dayGanZhi);
}

/**
 * 检查九丑日
 */
export function isJiuChouRi(dayGanZhi: string): boolean {
    return ShenShaMap.JIU_CHOU_RI.includes(dayGanZhi);
}

/**
 * 检查金神
 */
export function isJinShen(ganZhi: string): boolean {
    return ShenShaMap.JIN_SHEN.includes(ganZhi);
}

// ==================== 辅助函数 ====================

/**
 * 获取季节
 */
export function getJiJie(monthZhi: string): string {
    const springZhis = ['寅', '卯', '辰'];
    const summerZhis = ['巳', '午', '未'];
    const autumnZhis = ['申', '酉', '戌'];
    const winterZhis = ['亥', '子', '丑'];

    if (springZhis.includes(monthZhi)) return '春';
    if (summerZhis.includes(monthZhi)) return '夏';
    if (autumnZhis.includes(monthZhi)) return '秋';
    if (winterZhis.includes(monthZhi)) return '冬';
    return '';
}

/**
 * 获取日柱所有特殊日类型
 */
export function getDaySpecialTypes(dayGanZhi: string): string[] {
    const types: string[] = [];

    if (isShiEDaBai(dayGanZhi)) types.push('十恶大败');
    if (isYinChaYangCuo(dayGanZhi)) types.push('阴差阳错');
    if (isGuLuanSha(dayGanZhi)) types.push('孤鸾煞');
    if (isLiuXiuRi(dayGanZhi)) types.push('六秀日');
    if (isShiLingRi(dayGanZhi)) types.push('十灵日');
    if (isKuiGangRi(dayGanZhi)) types.push('魁罡日');
    if (isBaZhuanRi(dayGanZhi)) types.push('八专日');
    if (isJiuChouRi(dayGanZhi)) types.push('九丑日');
    if (isJinShen(dayGanZhi)) types.push('金神');

    return types;
}
