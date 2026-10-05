/**
 * 模块定位：
 * - 主要目标：为移动端底部导航提供「当前模块案例 / 参考面板抽屉」的注册表
 *
 * 各模块的移动端布局（MainLayout / QimenMobileLayout / CaseStudyMobileLayout）在挂载时
 * 把打开自身抽屉的回调注册进来；MobileTabBar 只消费当前激活模块的注册项，
 * 使「案例 / 参考面板」插槽与模块真实具备的抽屉保持一致——没有注册对应抽屉的模块，
 * 底栏自动收窄为「当前模块 + 重选菜单」。
*/
/* eslint-disable react-refresh/only-export-components -- context 定义、Provider 与注册/读取 hook 同文件是 React 惯例；拆回多文件仅为迁就 HMR 导出检查，属过度分层（同 BaziContext） */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ChartType } from '../types';

export interface MobileModuleDrawers {
    openCase?: () => void;
    openPanel?: () => void;
}

type DrawerRegistry = Partial<Record<ChartType, MobileModuleDrawers>>;

interface MobileNavContextValue {
    registry: DrawerRegistry;
    registerDrawers: (chart: ChartType, drawers: MobileModuleDrawers) => void;
    unregisterDrawers: (chart: ChartType) => void;
}

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

export function MobileNavProvider({ children }: { children: ReactNode }) {
    const [registry, setRegistry] = useState<DrawerRegistry>({});

    const registerDrawers = useCallback((chart: ChartType, drawers: MobileModuleDrawers) => {
        setRegistry((prev) => (prev[chart] === drawers ? prev : { ...prev, [chart]: drawers }));
    }, []);

    const unregisterDrawers = useCallback((chart: ChartType) => {
        setRegistry((prev) => {
            if (!prev[chart]) return prev;
            const next = { ...prev };
            delete next[chart];
            return next;
        });
    }, []);

    const value = useMemo<MobileNavContextValue>(
        () => ({ registry, registerDrawers, unregisterDrawers }),
        [registry, registerDrawers, unregisterDrawers],
    );

    return <MobileNavContext.Provider value={value}>{children}</MobileNavContext.Provider>;
}

function useMobileNavContext(): MobileNavContextValue {
    const ctx = useContext(MobileNavContext);
    if (!ctx) throw new Error('移动端导航注册必须在 MobileNavProvider 内使用');
    return ctx;
}

/** App 层读取注册表，供底栏判断当前模块具备哪些插槽 */
export function useMobileNavRegistry(): DrawerRegistry {
    const { registry } = useMobileNavContext();
    return registry;
}

/**
 * 模块布局挂载时注册自己的抽屉开启回调；chart 为 null 时跳过注册
 * （如 MainLayout 在非移动场景复用）。闭包经 ref 转发，注册后状态更新仍生效。
 */
export function useRegisterMobileDrawers(chart: ChartType | null, drawers: MobileModuleDrawers): void {
    const { registerDrawers, unregisterDrawers } = useMobileNavContext();
    // 闭包经 ref 转发：注册仅发生一次，后续抽屉回调的更新通过 effect 同步进 ref
    const drawersRef = useRef(drawers);
    useEffect(() => {
        drawersRef.current = drawers;
    }, [drawers]);

    useEffect(() => {
        if (!chart) return;
        registerDrawers(chart, {
            openCase: () => drawersRef.current.openCase?.(),
            openPanel: () => drawersRef.current.openPanel?.(),
        });
        return () => unregisterDrawers(chart);
    }, [chart, registerDrawers, unregisterDrawers]);
}
