/**
 * 模块定位：
 * - 移动端触感反馈统一入口：手势提交、关键按钮点击都只调这里，平台/强度判断收敛在此
 *
 * 平台策略：
 * - 仅安卓 Tauri 生效：复用 MainActivity.kt 的 window.OrbisNative.haptic(kind, strength) 原生桥
 *   （VibrationEffect.createOneShot，按时长/振幅区分低/中/高三档强度；VIBRATE 普通权限安装即授予）
 * - iOS / 桌面 / 纯浏览器一律 no-op
 *
 * 强度：
 * - appSettingStore 的 haptics_strength 保存：off / low / medium / high（默认 medium）
 * - 兼容旧的布尔键 haptics_enabled（历史上关过就视为 off）
 */
import { isTauri } from '@tauri-apps/api/core';
import { readSetting } from '../services/appSettingStore';

/** 强度设置键 */
export const HAPTICS_STRENGTH_KEY = 'haptics_strength';

/** 三档强度 + 关闭 */
export type HapticStrength = 'off' | 'low' | 'medium' | 'high';

/** tick = 按钮轻点；light = 手势提交（开合抽屉/翻页/卡片展开）；confirm = 确认（开关/强提示） */
export type HapticKind = 'tick' | 'light' | 'confirm';

interface OrbisNativeBridge {
    haptic?: (kind: string, strength: string) => void;
}

/** 读取当前强度；兼容旧布尔开关（haptics_enabled 曾为 false 视为关闭） */
export function getHapticStrength(): HapticStrength {
    const legacyOn = readSetting('haptics_enabled', true);
    return readSetting<HapticStrength>(HAPTICS_STRENGTH_KEY, legacyOn ? 'medium' : 'off');
}

/**
 * 触发一次触感。关闭、非安卓端、桥缺失或抛错都静默跳过——震动不能影响业务逻辑。
 */
export function haptic(kind: HapticKind = 'tick'): void {
    const strength = getHapticStrength();
    if (strength === 'off') return;
    if (!isTauri() || !/android/i.test(navigator.userAgent)) return;
    try {
        (window as unknown as { OrbisNative?: OrbisNativeBridge }).OrbisNative?.haptic?.(kind, strength);
    } catch {
        // 忽略：震不动不影响功能
    }
}
