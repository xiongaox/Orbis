/**
 * 奇门遁甲格局判断工具
 * 用于判断宫位是否符合特定吉凶格局
 */

import type { QimenPalace } from '../../components/Modules/Qimen/QimenChart';
import { SAN_QI, SAN_JI_MEN } from './constants';

// 天干墓库宫位
const GAN_MU: Record<string, number[]> = {
    '乙': [6, 2],  // 乙木墓于乾(6)和坤(2)说法不一，取乾为主
    '丙': [6],     // 丙火墓于乾宫
    '丁': [8],     // 丁火墓于艮宫
    '戊': [4],     // 戊土墓于巽宫
    '己': [4],     // 己土墓于巽宫
    '庚': [2],     // 庚金墓于坤宫
    '辛': [2],     // 辛金墓于坤宫
    '壬': [4],     // 壬水墓于巽宫
    '癸': [4],     // 癸水墓于巽宫
};

/**
 * 格局判断结果
 */
export interface PatternMatch {
    name: string;       // 格局名称（用于从 ju_pattern.json 获取详情）
    label: string;      // 显示标签
    type: '吉格' | '凶格';
}

/**
 * 格局判断所需的上下文信息
 */
export interface PatternContext {
    zhiShiMen?: string;         // 值使门名称
    zhiFuXing?: string;         // 值符星名称
    yearGan?: string;           // 年干
    monthGan?: string;          // 月干
    dayGan?: string;            // 日干
    hourGan?: string;           // 时干
    xunShou?: string;           // 旬首（如 "甲子"）
    siZhu?: { year: string; month: string; day: string; hour: string }; // 四柱
    allPalaces?: QimenPalace[]; // 所有宫位数据
}

/**
 * 判断宫位符合的所有格局
 * @param palace 宫位数据
 * @param ctx 上下文信息
 * @returns 匹配的格局列表
 */
export function detectPalacePatterns(
    palace: QimenPalace,
    zhiShiMen?: string,
    ctx?: PatternContext
): PatternMatch[] {
    const patterns: PatternMatch[] = [];
    const tian = palace.tianPan || '';
    const di = palace.diPan || '';
    const pos = palace.position;
    const men = palace.men || '';
    const shen = palace.shen || '';
    const xing = palace.xing || '';

    const dayGan = ctx?.dayGan || '';
    const hourGan = ctx?.hourGan || '';
    const yearGan = ctx?.yearGan || '';
    const monthGan = ctx?.monthGan || '';
    const zhiFuXing = ctx?.zhiFuXing || '';

    // ==================== 吉格 ====================

    // 1. 三奇得使：三奇临值使门宫位
    if (SAN_QI.includes(tian) && zhiShiMen && men === zhiShiMen) {
        patterns.push({ name: '三奇得使', label: '三奇得使', type: '吉格' });
    }

    // 2. 玉女守门：值使门临地盘丁奇
    if (zhiShiMen && men === zhiShiMen && di === '丁') {
        patterns.push({ name: '玉女守门', label: '玉女守门', type: '吉格' });
    }

    // 3. 三奇贵人升殿：乙临震(3)、丙临离(9)、丁临兑(7)
    if ((tian === '乙' && pos === 3) ||
        (tian === '丙' && pos === 9) ||
        (tian === '丁' && pos === 7)) {
        patterns.push({ name: '三奇贵人升殿', label: '三奇贵人升殿', type: '吉格' });
    }

    // 4. 天显时格：六甲透出显现之时
    // 甲己日甲子/甲戌时，乙庚日甲申时，丙辛日甲午时，戊癸日甲寅时，丁壬日甲辰时
    // 条件：时干必须是"甲"，且满足特定日干+时支组合
    const hourZhi = ctx?.siZhu?.hour?.charAt(1) || '';
    if (hourGan === '甲' && shen === '值符') {
        const tianXianConditions = [
            ['甲', '己'].includes(dayGan) && ['子', '戌'].includes(hourZhi),
            ['乙', '庚'].includes(dayGan) && hourZhi === '申',
            ['丙', '辛'].includes(dayGan) && hourZhi === '午',
            ['戊', '癸'].includes(dayGan) && hourZhi === '寅',
            ['丁', '壬'].includes(dayGan) && hourZhi === '辰',
        ];
        if (tianXianConditions.some(c => c)) {
            patterns.push({ name: '天显时格', label: '天显时格', type: '吉格' });
        }
    }

    // 5. 奇游禄位：乙临震(3)、丙临巽(4)、丁临离(9)
    if ((tian === '乙' && pos === 3) ||
        (tian === '丙' && pos === 4) ||
        (tian === '丁' && pos === 9)) {
        patterns.push({ name: '奇游禄位', label: '奇游禄位', type: '吉格' });
    }

    // 6. 欢怡：三奇临值符宫
    if (SAN_QI.includes(tian) && shen === '值符') {
        patterns.push({ name: '欢怡', label: '欢怡', type: '吉格' });
    }

    // 7. 交泰：乙+丁 或 丁+丙
    if ((tian === '乙' && di === '丁') || (tian === '丁' && di === '丙')) {
        patterns.push({ name: '交泰', label: '交泰', type: '吉格' });
    }

    // 8. 相佐：值符加在地盘三奇之上
    if (shen === '值符' && SAN_QI.includes(di)) {
        patterns.push({ name: '相佐', label: '相佐', type: '吉格' });
    }

    // 9. 天运昌气：天盘丁加地盘乙
    if (tian === '丁' && di === '乙') {
        patterns.push({ name: '天运昌气', label: '天运昌气', type: '吉格' });
    }

    // 10. 奇仪相合：乙庚、丙辛、丁壬、戊癸
    const qiHeMap: Record<string, string> = {
        '乙': '庚', '庚': '乙',
        '丙': '辛', '辛': '丙',
        '丁': '壬', '壬': '丁',
        '戊': '癸', '癸': '戊',
    };
    if (qiHeMap[tian] === di) {
        patterns.push({ name: '奇仪相合', label: '奇仪相合', type: '吉格' });
    }
    // 12. 天辅吉时：特定日时组合
    // 甲己日己巳时，乙庚日甲申时，丙辛日甲午时，丁壬日甲辰时，戊癸日甲寅时
    // 在值符宫判断
    if (shen === '值符') {
        const tianFuConditions = [
            ['甲', '己'].includes(dayGan) && hourGan === '己',
            ['乙', '庚'].includes(dayGan) && hourGan === '甲',
            ['丙', '辛'].includes(dayGan) && hourGan === '甲',
            ['丁', '壬'].includes(dayGan) && hourGan === '甲',
            ['戊', '癸'].includes(dayGan) && hourGan === '甲',
        ];
        if (tianFuConditions.some(c => c)) {
            patterns.push({ name: '天辅吉时', label: '天辅吉时', type: '吉格' });
        }
    }

    // 13. 三诈五假
    // 真诈：三奇 + 三吉门 + 太阴
    // 重诈：三奇 + 三吉门 + 九地
    // 休诈：三奇 + 三吉门 + 六合
    if (SAN_QI.includes(tian) && SAN_JI_MEN.includes(men)) {
        if (shen === '太阴') {
            patterns.push({ name: '三诈五假', label: '真诈', type: '吉格' });
        } else if (shen === '九地') {
            patterns.push({ name: '三诈五假', label: '重诈', type: '吉格' });
        } else if (shen === '六合') {
            patterns.push({ name: '三诈五假', label: '休诈', type: '吉格' });
        }
    }
    // 天假：景门 + 三奇 + 九天
    if (men === '景门' && SAN_QI.includes(tian) && shen === '九天') {
        patterns.push({ name: '三诈五假', label: '天假', type: '吉格' });
    }
    // 地假：杜门 + 丁/己/癸 + 九地
    if (men === '杜门' && ['丁', '己', '癸'].includes(tian) && shen === '九地') {
        patterns.push({ name: '三诈五假', label: '地假', type: '吉格' });
    }
    // 物假：伤门 + 丁/己/癸 + 六合
    if (men === '伤门' && ['丁', '己', '癸'].includes(tian) && shen === '六合') {
        patterns.push({ name: '三诈五假', label: '物假', type: '吉格' });
    }
    // 鬼假/神假：死门 + 丁/己/癸 + 九地
    if (men === '死门' && ['丁', '己', '癸'].includes(tian) && shen === '九地') {
        patterns.push({ name: '三诈五假', label: '鬼假(神假)', type: '吉格' });
    }
    // 人假：惊门 + 壬 + 九天
    if (men === '惊门' && tian === '壬' && shen === '九天') {
        patterns.push({ name: '三诈五假', label: '人假', type: '吉格' });
    }

    // 14. 九遁
    // 天遁：丙奇 + 生/开/休门 + 地盘丁
    if (tian === '丙' && SAN_JI_MEN.includes(men) && di === '丁') {
        patterns.push({ name: '九遁', label: '天遁', type: '吉格' });
    }
    // 地遁：乙奇 + 开/生/休门 + 地盘己
    if (tian === '乙' && SAN_JI_MEN.includes(men) && di === '己') {
        patterns.push({ name: '九遁', label: '地遁', type: '吉格' });
    }
    // 人遁：丁奇 + 休门 + 太阴
    if (tian === '丁' && men === '休门' && shen === '太阴') {
        patterns.push({ name: '九遁', label: '人遁', type: '吉格' });
    }
    // 神遁：丙奇 + 生门 + 九天
    if (tian === '丙' && men === '生门' && shen === '九天') {
        patterns.push({ name: '九遁', label: '神遁', type: '吉格' });
    }
    // 鬼遁：丁奇 + 杜门/开门 + 九地
    if (tian === '丁' && (men === '杜门' || men === '开门') && shen === '九地') {
        patterns.push({ name: '九遁', label: '鬼遁', type: '吉格' });
    }
    // 风遁：乙奇 + 三吉门 + 巽宫(4)
    if (tian === '乙' && SAN_JI_MEN.includes(men) && pos === 4) {
        patterns.push({ name: '九遁', label: '风遁', type: '吉格' });
    }
    // 云遁：乙奇 + 三吉门 + 地盘辛
    if (tian === '乙' && SAN_JI_MEN.includes(men) && di === '辛') {
        patterns.push({ name: '九遁', label: '云遁', type: '吉格' });
    }
    // 龙遁：乙奇 + 三吉门 + (坎宫 或 地盘癸)
    if (tian === '乙' && SAN_JI_MEN.includes(men) && (pos === 1 || di === '癸')) {
        patterns.push({ name: '九遁', label: '龙遁', type: '吉格' });
    }
    // 虎遁：乙奇 + 休/生门 + 地盘辛 + 艮宫(8)，或 庚 + 开门 + 兑宫(7)
    if ((tian === '乙' && (men === '休门' || men === '生门') && di === '辛' && pos === 8) ||
        (tian === '庚' && men === '开门' && pos === 7)) {
        patterns.push({ name: '九遁', label: '虎遁', type: '吉格' });
    }

    // ==================== 凶格 ====================

    // 15. 飞干格：日干加地盘庚
    if (dayGan && di === '庚') {
        // 需要判断天盘是否是日干
        if (tian === dayGan) {
            patterns.push({ name: '飞干格', label: '飞干格', type: '凶格' });
        }
    }

    // 16. 伏干格：天盘庚加地盘日干
    if (tian === '庚' && dayGan && di === dayGan) {
        patterns.push({ name: '伏干格', label: '伏干格', type: '凶格' });
    }

    // 17. 年月日时格：庚加年/月/日/时干
    if (tian === '庚') {
        if (di === yearGan) {
            patterns.push({ name: '年月日时格', label: '年格(岁格)', type: '凶格' });
        }
        if (di === monthGan) {
            patterns.push({ name: '年月日时格', label: '月格', type: '凶格' });
        }
        if (di === dayGan) {
            patterns.push({ name: '年月日时格', label: '日格', type: '凶格' });
        }
        if (di === hourGan) {
            patterns.push({ name: '年月日时格', label: '时格', type: '凶格' });
        }
    }

    // 18. 刑格：庚+己
    if (tian === '庚' && di === '己') {
        patterns.push({ name: '刑格', label: '刑格', type: '凶格' });
    }

    // 19. 悖格：丙加年/月/日/时干，或丙加值符，或值符加丙
    if (tian === '丙') {
        if (di === yearGan) {
            patterns.push({ name: '悖格', label: `天丙+地${yearGan}(年干)`, type: '凶格' });
        }
        if (di === monthGan) {
            patterns.push({ name: '悖格', label: `天丙+地${monthGan}(月干)`, type: '凶格' });
        }
        if (di === dayGan) {
            patterns.push({ name: '悖格', label: `天丙+地${dayGan}(日干)`, type: '凶格' });
        }
        if (di === hourGan) {
            patterns.push({ name: '悖格', label: `天丙+地${hourGan}(时干)`, type: '凶格' });
        }
    }
    // 值符宫天盘丙
    if (shen === '值符' && tian === '丙') {
        patterns.push({ name: '悖格', label: '值符+天盘丙', type: '凶格' });
    }
    // 天盘值符星落丙地
    if (xing === zhiFuXing && di === '丙') {
        patterns.push({ name: '悖格', label: '值符星+地盘丙', type: '凶格' });
    }


    // 20. 伏吟：星/门落本宫 - 已在全局格局中处理，宫位详情不显示
    // 21. 反吟：星/门落对冲宫 - 已在全局格局中处理，宫位详情不显示

    // 22. 六仪击刑：特定天盘六仪落特定宫位
    const liuYiJiXingMap: Record<string, number> = {
        '戊': 3,  // 甲子戊落震宫（子刑卯）
        '己': 2,  // 甲戌己落坤宫（戌刑未）
        '庚': 8,  // 甲申庚落艮宫（申刑寅）
        '辛': 9,  // 甲午辛落离宫（午午自刑）
        '壬': 4,  // 甲辰壬落巽宫（辰辰自刑）
        '癸': 4,  // 甲寅癸落巽宫（寅刑巳）
    };
    if (liuYiJiXingMap[tian] === pos) {
        let label = '六仪击刑';
        if (tian === '戊' && pos === 3) label = '甲子戊落震宫';
        if (tian === '己' && pos === 2) label = '甲戌己落坤宫';
        if (tian === '庚' && pos === 8) label = '甲申庚落艮宫';
        if (tian === '辛' && pos === 9) label = '甲午辛落离宫';
        if (tian === '壬' && pos === 4) label = '甲辰壬落巽宫';
        if (tian === '癸' && pos === 4) label = '甲寅癸落巽宫';
        patterns.push({ name: '六仪击刑', label, type: '凶格' });
    }

    // 23. 五不遇时：时干克日干（同性相克）
    // 甲日庚午时，乙日辛巳时，丙日壬辰时，丁日癸卯时，戊日甲寅时，己日乙丑时，庚日丙子时，辛日丁酉时，壬日戊申时，癸日己未时
    const wuBuYuMap: Record<string, string> = {
        '甲': '庚', '乙': '辛', '丙': '壬', '丁': '癸', '戊': '甲',
        '己': '乙', '庚': '丙', '辛': '丁', '壬': '戊', '癸': '己',
    };
    if (dayGan && hourGan && wuBuYuMap[dayGan] === hourGan) {
        // 在值符宫显示
        if (shen === '值符') {
            patterns.push({ name: '五不遇时', label: '五不遇时', type: '凶格' });
        }
    }

    // 24. 时干入墓：时干落墓宫
    // 丙戌时入乾6宫，壬辰时入巽4宫，癸未时入坤2宫，戊戌时入乾6宫，己丑时入艮8宫，丁丑时入艮8宫
    if (hourGan && GAN_MU[hourGan]?.includes(pos)) {
        // 判断时干是否在此宫
        if (tian === hourGan) {
            patterns.push({ name: '时干入墓', label: '时干入墓', type: '凶格' });
        }
    }

    // 25. 三奇入墓
    if ((tian === '乙' && (pos === 6 || pos === 2)) ||
        (tian === '丙' && pos === 6) ||
        (tian === '丁' && pos === 8)) {
        patterns.push({ name: '三奇入墓', label: '三奇入墓', type: '凶格' });
    }

    return patterns;
}

/**
 * 全局格局检测结果
 */
export interface GlobalPattern {
    name: string;       // 格局名称（用于从 ju_pattern.json 获取详情）
    label: string;      // 显示标签（简短）
    fullLabel: string;  // 完整标签
    type: '吉格' | '凶格';
}

/**
 * 检测全局格局（不依赖于特定宫位，而是对整个盘面进行判断）
 * 这些格局会显示在顶部信息栏，点击弹窗展示详情
 */
export function detectGlobalPatterns(
    ctx: PatternContext,
    palaces: QimenPalace[]
): GlobalPattern[] {
    const patterns: GlobalPattern[] = [];

    const dayGan = ctx.dayGan || '';
    const hourGan = ctx.hourGan || '';
    const hourZhi = ctx.siZhu?.hour?.charAt(1) || '';

    // ===== 1. 天显时格 =====
    // 甲己日甲子/甲戌时，乙庚日甲申时，丙辛日甲午时，戊癸日甲寅时，丁壬日甲辰时
    if (hourGan === '甲') {
        const tianXianConditions = [
            ['甲', '己'].includes(dayGan) && ['子', '戌'].includes(hourZhi),
            ['乙', '庚'].includes(dayGan) && hourZhi === '申',
            ['丙', '辛'].includes(dayGan) && hourZhi === '午',
            ['戊', '癸'].includes(dayGan) && hourZhi === '寅',
            ['丁', '壬'].includes(dayGan) && hourZhi === '辰',
        ];
        if (tianXianConditions.some(c => c)) {
            patterns.push({ name: '天显时格', label: '天显', fullLabel: '天显时格', type: '吉格' });
        }
    }

    // ===== 2. 五不遇时 =====
    // 时干克日干（同性相克）
    const wuBuYuMap: Record<string, string> = {
        '甲': '庚', '乙': '辛', '丙': '壬', '丁': '癸', '戊': '甲',
        '己': '乙', '庚': '丙', '辛': '丁', '壬': '戊', '癸': '己',
    };
    if (dayGan && hourGan && wuBuYuMap[dayGan] === hourGan) {
        patterns.push({ name: '五不遇时', label: '五不', fullLabel: '五不遇时', type: '凶格' });
    }

    // ===== 3. 时干入墓 =====
    // 时干落墓宫
    if (hourGan && GAN_MU[hourGan]) {
        for (const palace of palaces) {
            if (palace.tianPan === hourGan && GAN_MU[hourGan].includes(palace.position)) {
                patterns.push({ name: '时干入墓', label: '时墓', fullLabel: '时干入墓', type: '凶格' });
                break;
            }
        }
    }

    // ===== 4. 伏吟检测 =====
    // 九星本宫
    const xingBenGong: Record<string, number> = {
        '天蓬': 1, '天芮': 2, '天冲': 3, '天辅': 4, '天禽': 5,
        '天心': 6, '天柱': 7, '天任': 8, '天英': 9,
    };
    // 八门本宫
    const menBenGong: Record<string, number> = {
        '休门': 1, '死门': 2, '伤门': 3, '杜门': 4,
        '开门': 6, '惊门': 7, '生门': 8, '景门': 9,
    };

    let xingFuYinCount = 0;
    let menFuYinCount = 0;
    for (const palace of palaces) {
        if (palace.position === 5) continue; // 跳过中宫
        if (xingBenGong[palace.xing] === palace.position) xingFuYinCount++;
        if (menBenGong[palace.men] === palace.position) menFuYinCount++;
    }

    // 大多数星/门在本宫即为伏吟
    if (xingFuYinCount >= 7 && menFuYinCount >= 7) {
        patterns.push({ name: '伏吟', label: '星门伏吟', fullLabel: '星门俱伏吟', type: '凶格' });
    } else if (xingFuYinCount >= 7) {
        patterns.push({ name: '伏吟', label: '星伏吟', fullLabel: '九星伏吟', type: '凶格' });
    } else if (menFuYinCount >= 7) {
        patterns.push({ name: '伏吟', label: '门伏吟', fullLabel: '八门伏吟', type: '凶格' });
    }

    // ===== 5. 反吟检测 =====
    const duiChong: Record<number, number> = {
        1: 9, 9: 1, 2: 8, 8: 2, 3: 7, 7: 3, 4: 6, 6: 4,
    };

    let xingFanYinCount = 0;
    let menFanYinCount = 0;
    for (const palace of palaces) {
        if (palace.position === 5) continue;
        const xingBen = xingBenGong[palace.xing];
        const menBen = menBenGong[palace.men];
        if (xingBen !== undefined && duiChong[xingBen] === palace.position) xingFanYinCount++;
        if (menBen !== undefined && duiChong[menBen] === palace.position) menFanYinCount++;
    }

    if (xingFanYinCount >= 7 && menFanYinCount >= 7) {
        patterns.push({ name: '反吟', label: '星门反吟', fullLabel: '星门俱反吟', type: '凶格' });
    } else if (xingFanYinCount >= 7) {
        patterns.push({ name: '反吟', label: '星反吟', fullLabel: '九星反吟', type: '凶格' });
    } else if (menFanYinCount >= 7) {
        patterns.push({ name: '反吟', label: '门反吟', fullLabel: '八门反吟', type: '凶格' });
    }

    return patterns;
}
