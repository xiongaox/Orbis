/**
 * 八字 - 干支留意设置
 * 移植自 Java 版本 BaZiGanZhiLiuYiSetting.java
 * @author 善待 (原作者)
 * 
 * 控制天干地支相生/相克/相合/相冲等关系的显示
 * 值含义：0 = 显示，1 = 关闭
 */

/**
 * 干支留意设置接口
 */
export interface BaZiGanZhiLiuYiSetting {
    // ========== 天干关系开关 ==========
    /** 天干相生（0:显示。1:关闭） */
    tianGanXiangSheng: number;
    /** 天干相克（0:显示。1:关闭） */
    tianGanXiangKe: number;
    /** 天干相合（0:显示。1:关闭） */
    tianGanXiangHe: number;
    /** 天干相冲（0:显示。1:关闭） */
    tianGanXiangChong: number;

    // ========== 天干计算类型 ==========
    /** 天干相生类型（0:以任意两干计算。1:以相邻两干计算） */
    tianGanXiangShengType: number;
    /** 天干相克类型（0:以任意两干计算。1:以相邻两干计算） */
    tianGanXiangKeType: number;
    /** 天干相合类型（0:以任意两干计算。1:以相邻两干计算） */
    tianGanXiangHeType: number;
    /** 天干相冲类型（0:以任意两干计算。1:以相邻两干计算） */
    tianGanXiangChongType: number;

    // ========== 地支关系开关 ==========
    /** 地支半合（0:显示。1:关闭） */
    diZhiBanHe: number;
    /** 地支拱合（0:显示。1:关闭） */
    diZhiGongHe: number;
    /** 地支暗合（0:显示。1:关闭） */
    diZhiAnHe: number;
    /** 地支六合（0:显示。1:关闭） */
    diZhiLiuHe: number;
    /** 地支相刑（0:显示。1:关闭） */
    diZhiXiangXing: number;
    /** 地支相冲（0:显示。1:关闭） */
    diZhiXiangChong: number;
    /** 地支相破（0:显示。1:关闭） */
    diZhiXiangPo: number;
    /** 地支相害（0:显示。1:关闭） */
    diZhiXiangHai: number;

    // ========== 地支计算类型 ==========
    /** 地支半合类型（0:以任意两支计算。1:以相邻两支计算） */
    diZhiBanHeType: number;
    /** 地支拱合类型（0:以任意两支计算。1:以相邻两支计算） */
    diZhiGongHeType: number;
    /** 地支暗合类型（0:以任意两支计算。1:以相邻两支计算） */
    diZhiAnHeType: number;
    /** 地支六合类型（0:以任意两支计算。1:以相邻两支计算） */
    diZhiLiuHeType: number;
    /** 地支相刑类型（0:以任意两支计算。1:以相邻两支计算） */
    diZhiXiangXingType: number;
    /** 地支相冲类型（0:以任意两支计算。1:以相邻两支计算） */
    diZhiXiangChongType: number;
    /** 地支相破类型（0:以任意两支计算。1:以相邻两支计算） */
    diZhiXiangPoType: number;
    /** 地支相害类型（0:以任意两支计算。1:以相邻两支计算） */
    diZhiXiangHaiType: number;
}

/**
 * 创建默认干支留意设置（所有项目默认显示）
 */
export function createDefaultGanZhiLiuYiSetting(): BaZiGanZhiLiuYiSetting {
    return {
        // 天干关系开关（默认全部显示）
        tianGanXiangSheng: 0,
        tianGanXiangKe: 0,
        tianGanXiangHe: 0,
        tianGanXiangChong: 0,
        // 天干计算类型（默认以任意两干计算）
        tianGanXiangShengType: 0,
        tianGanXiangKeType: 0,
        tianGanXiangHeType: 0,
        tianGanXiangChongType: 0,
        // 地支关系开关（默认全部显示）
        diZhiBanHe: 0,
        diZhiGongHe: 0,
        diZhiAnHe: 0,
        diZhiLiuHe: 0,
        diZhiXiangXing: 0,
        diZhiXiangChong: 0,
        diZhiXiangPo: 0,
        diZhiXiangHai: 0,
        // 地支计算类型（默认以任意两支计算）
        diZhiBanHeType: 0,
        diZhiGongHeType: 0,
        diZhiAnHeType: 0,
        diZhiLiuHeType: 0,
        diZhiXiangXingType: 0,
        diZhiXiangChongType: 0,
        diZhiXiangPoType: 0,
        diZhiXiangHaiType: 0,
    };
}
