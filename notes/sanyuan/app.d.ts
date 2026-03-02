/**
 * 三元天星排盘算法 - TypeScript 类型定义
 */

/** 八宫名称（英文） */
export type PalaceName = 'Qian' | 'Dui' | 'Gen' | 'Li' | 'Kan' | 'Kun' | 'Zhen' | 'Xun';

/** 24山 */
export type Mountain =
    | '壬' | '子' | '癸' | '丑' | '艮' | '寅' | '甲' | '卯'
    | '乙' | '辰' | '巽' | '巳' | '丙' | '午' | '丁' | '未'
    | '坤' | '申' | '庚' | '酉' | '辛' | '戌' | '乾' | '亥';

/** 元运阶段 */
export type YuanPhase = 'lower' | 'upper';

/** 元龙类型 */
export type YuanLong = 'tian' | 'di' | 'ren';

/** 盘面数据：八宫对应的数字 */
export interface BoardData {
    Qian: number;
    Dui: number;
    Gen: number;
    Li: number;
    Kan: number;
    Kun: number;
    Zhen: number;
    Xun: number;
}

/** 盘头信息 */
export interface HeaderInfo {
    /** 运数 */
    yun: number;
    /** 山盘入中数 */
    shanStart: number;
    /** 向盘入中数 */
    xiangStart: number;
    /** 坐山 */
    mountain: Mountain;
    /** 向山 */
    facing: Mountain;
    /** 是否替卦 */
    isTiGua: boolean;
    /** 盘类型：下卦/替卦 */
    panType: '下卦' | '替卦';
}

/** 三元天星算法库 */
export interface SanYuanLib {
    /** 八宫顺飞顺序 */
    palaceOrder: PalaceName[];

    /** 八宫中文名称映射 */
    palaceCn: Record<PalaceName, string>;

    /** 24山对应卦位 */
    trigramOfMountain: Record<Mountain, PalaceName>;

    /** 纳甲对应卦位 */
    naJiaTrigram: Record<string, PalaceName>;

    /** 替卦替数表 */
    tiGuaReplace: Record<Mountain, number>;

    /**
     * 计算运盘
     * @param yun - 运数 (1-9)
     * @returns 八宫对应的运星数
     */
    computeYunPan(yun: number): BoardData;

    /**
     * 计算大玄空数
     * @param mountain - 坐山
     * @param yuanPhase - 元运阶段
     * @returns 八宫对应的大玄空数
     */
    computeBigXuanKong(mountain: Mountain, yuanPhase?: YuanPhase): BoardData;

    /**
     * 计算山盘（山星）
     * @param yunPan - 运盘对象
     * @param mountain - 坐山
     * @param isTiGua - 是否替卦
     * @param yuanPhase - 元运阶段
     * @returns 八宫对应的山星
     */
    computeMountainPan(
        yunPan: BoardData,
        mountain: Mountain,
        isTiGua?: boolean,
        yuanPhase?: YuanPhase
    ): BoardData;

    /**
     * 计算向盘（向星）
     * @param yunPan - 运盘对象
     * @param facing - 向山
     * @param isTiGua - 是否替卦
     * @param yuanPhase - 元运阶段
     * @returns 八宫对应的向星
     */
    computeFacingPan(
        yunPan: BoardData,
        facing: Mountain,
        isTiGua?: boolean,
        yuanPhase?: YuanPhase
    ): BoardData;

    /**
     * 计算地母翻卦（地盘）
     * @param mountain - 坐山
     * @returns 八宫对应的地盘数
     */
    computeEarthBoard(mountain: Mountain): BoardData;

    /**
     * 计算辅星水法（天盘）
     * @param facing - 向山
     * @returns 八宫对应的天盘数
     */
    computeWaterBoard(facing: Mountain): BoardData;

    /**
     * 计算天星阳宅（人盘）
     * @param mountain - 坐山
     * @returns 八宫对应的人盘数
     */
    computeHeavenBoard(mountain: Mountain): BoardData;

    /**
     * 获取盘头信息
     * @param yun - 运数
     * @param mountain - 坐山
     * @param facing - 向山
     * @param isTiGua - 是否替卦
     * @returns 盘头信息对象
     */
    getHeaderInfo(
        yun: number,
        mountain: Mountain,
        facing: Mountain,
        isTiGua?: boolean
    ): HeaderInfo;

    /**
     * 获取山的元龙类型
     * @param mountain - 山名
     * @returns 元龙类型
     */
    getYuanLong(mountain: Mountain): YuanLong;

    /**
     * 获取山的阴阳步进
     * @param mountain - 山名
     * @returns +1 顺飞，-1 逆飞
     */
    dragonStep(mountain: Mountain): 1 | -1;

    /**
     * 运星数字转卦名
     * @param star - 运星数字 (1-9, 不含5)
     * @returns 卦名
     */
    starToTrigram(star: number): PalaceName | undefined;

    /**
     * 将数字映射到 1-9 范围
     * @param n - 任意整数
     * @returns 1-9 之间的数字
     */
    wrap9(n: number): number;

    /**
     * 从指定宫位开始旋转顺序
     * @param palace - 起始宫位
     * @returns 旋转后的宫位顺序
     */
    rotateOrderFrom(palace: PalaceName): PalaceName[];

    /**
     * 按起始宫位旋转顺序填充序列
     * @param startPalace - 起始宫位
     * @param seq - 数字序列
     * @returns 各宫位对应的数字
     */
    fillSequence(startPalace: PalaceName, seq: number[]): BoardData;

    /**
     * 查找卦中同元龙的山
     * @param trigram - 卦名
     * @param yuanLong - 元龙类型
     * @returns 对应的山名
     */
    findSameYuanLongMountain(trigram: PalaceName, yuanLong: YuanLong): Mountain;
}

declare const SanYuan: SanYuanLib;

export default SanYuan;
export { SanYuan };
