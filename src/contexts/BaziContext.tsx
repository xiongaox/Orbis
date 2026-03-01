/**
 * BaziContext - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：承载前端具体功能
 *
 * 关键职责：
 * - 渲染 UI 视图并处理交互逻辑
 * - 处理用户输入与展示边界行为
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `BaziProvider`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、内部模块 `useBazi`、内部模块 `baziContextStore`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import type { ReactNode } from 'react';
import { useBazi } from '../hooks/useBazi';
import { BaziContext } from './baziContextStore';

// Provider Props
interface BaziProviderProps {
    children: ReactNode;
}

/**
 * BaziProvider - 八字状态提供者
 * 包裹需要访问八字状态的组件树
 */
export function BaziProvider({ children }: BaziProviderProps) {
    const baziState = useBazi();

    return (
        <BaziContext.Provider value={baziState}>
            {children}
        </BaziContext.Provider>
    );
}
