/**
 * 八字 - 大运流年工具
 * 移植自 Java 版本 BaZiDaYunLiuNianUtil.java
 * @author 善待 (原作者)
 * 
 * 提供大运、流年、流月、流日、流时的计算功能
 */

import { Solar, Lunar } from 'lunar-typescript';
import * as DaYunLiuNianMap from '../maps/baziDaYunLiuNianMap';
import { TIAN_GAN } from '../maps/baziJichuMap';

// ==================== 类型定义 ====================

/**
 * 大运信息
 */
export interface DaYunInfo {
    /** 主星（十神） */
    zhuXing: string;
    /** 天干 */
    tianGan: string;
    /** 地支 */
    diZhi: string;
    /** 藏干 */
    cangGan: string[];
    /** 副星（藏干十神） */
    fuXing: string[];
    /** 自坐（日干对大运支的十二长生） */
    ziZuo: string;
    /** 星运（日干对大运干的十二长生） */
    xingYun: string;
    /** 空亡 */
    kongWang: string;
    /** 纳音 */
    naYin: string;
    /** 神煞 */
    shenSha: string[];
    /** 公历年 */
    solarYear: number;
    /** 年龄 */
    age: number;
    /** 公历日期描述 */
    solarDate: string;
}

/**
 * 流年信息
 */
export interface LiuNianInfo {
    /** 主星（十神） */
    zhuXing: string;
    /** 天干 */
    tianGan: string;
    /** 地支 */
    diZhi: string;
    /** 藏干 */
    cangGan: string[];
    /** 副星（藏干十神） */
    fuXing: string[];
    /** 自坐 */
    ziZuo: string;
    /** 星运 */
    xingYun: string;
    /** 空亡 */
    kongWang: string;
    /** 纳音 */
    naYin: string;
    /** 神煞 */
    shenSha: string[];
    /** 公历年 */
    solarYear: number;
    /** 年龄 */
    age: number;
}

/**
 * 流月信息
 */
export interface LiuYueInfo {
    /** 主星 */
    zhuXing: string;
    /** 天干 */
    tianGan: string;
    /** 地支 */
    diZhi: string;
    /** 藏干 */
    cangGan: string[];
    /** 纳音 */
    naYin: string;
    /** 公历月日 */
    solarMonthDay: string;
    /** 农历月 */
    lunarMonth: string;
    /** 节气 */
    jieQi: string;
}

/**
 * 流日信息
 */
export interface LiuRiInfo {
    /** 主星 */
    zhuXing: string;
    /** 天干 */
    tianGan: string;
    /** 地支 */
    diZhi: string;
    /** 藏干 */
    cangGan: string[];
    /** 纳音 */
    naYin: string;
    /** 公历日 */
    solarDay: number;
    /** 农历日 */
    lunarDay: string;
}

/**
 * 流时信息
 */
export interface LiuShiInfo {
    /** 主星 */
    zhuXing: string;
    /** 天干 */
    tianGan: string;
    /** 地支 */
    diZhi: string;
    /** 藏干 */
    cangGan: string[];
    /** 纳音 */
    naYin: string;
    /** 公历时 */
    solarHour: string;
    /** 汉代命名 */
    hanMing: string;
}

// ==================== 工具函数 ====================

/**
 * 获取干支的天干
 */
export function getGan(ganZhi: string): string {
    return ganZhi.charAt(0);
}

/**
 * 获取干支的地支
 */
export function getZhi(ganZhi: string): string {
    return ganZhi.charAt(1);
}

/**
 * 根据公历年获取流年干支
 */
export function getLiuNianGanZhi(solarYear: number): string {
    const lunar = Lunar.fromDate(new Date(solarYear, 0, 15)); // 使用当年中间的日期
    return lunar.getYearInGanZhi();
}

/**
 * 获取十二节名称
 */
export function getShiErJie(index: number): string {
    return DaYunLiuNianMap.SHI_ER_JIE[index % 12];
}

/**
 * 获取十二时描述
 */
export function getShiErShi(index: number): string {
    return DaYunLiuNianMap.SHI_ER_SHI[index % 12];
}

/**
 * 获取地支汉代命名
 */
export function getDiZhiHanMing(index: number): string {
    return DaYunLiuNianMap.DI_ZHI_HAN_MING[index % 12];
}

/**
 * 计算起运年龄（根据出生日期和性别）
 * @param solar 公历对象
 * @param sex 性别（1:男 0:女）
 * @returns 起运年龄
 */
export function calculateQiYunAge(solar: Solar, sex: number): number {
    const lunar = Lunar.fromSolar(solar);
    const eightChar = lunar.getEightChar();
    const yun = eightChar.getYun(sex);
    return yun.getStartYear();
}

/**
 * 判断是否顺行大运
 * @param yearGan 年干
 * @param sex 性别（1:男 0:女）
 * @returns 是否顺行
 */
export function isShunXing(yearGan: string, sex: number): boolean {
    const ganIndex = TIAN_GAN.indexOf(yearGan as typeof TIAN_GAN[number]);
    const isYangGan = ganIndex % 2 === 0;
    // 阳年男命、阴年女命顺行，反之逆行
    return (isYangGan && sex === 1) || (!isYangGan && sex === 0);
}
