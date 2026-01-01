/**
 * xuan-bazi - 八字命理计算库
 * 移植自 Java 版本 xuan-utils-pro
 * @author 善待 (原作者)
 * 
 * 使用示例：
 * ```typescript
 * import { createBaziFromSiZhu, calculateDaYun, calculateLiuNian } from '@/lib/xuan-bazi';
 * 
 * // 从四柱干支创建八字
 * const bazi = createBaziFromSiZhu({
 *   year: '甲子',
 *   month: '乙丑',
 *   day: '丙寅',
 *   hour: '丁卯',
 * }, { name: '测试', sex: 1 });
 * 
 * // 计算大运
 * const daYun = calculateDaYun(bazi.dayMaster, '乙丑', 1, '甲');
 * 
 * // 计算流年
 * const liuNian = calculateLiuNian(2024);
 * ```
 */

// 核心功能
export {
    createBaziFromSiZhu,
    calculateDaYun,
    calculateLiuNian,
    type BaziInfo,
    type SiZhu,
} from './bazi';

// 常量映射
export * from './maps';

// 配置
export * from './settings';

// 工具函数
export * from './utils';
