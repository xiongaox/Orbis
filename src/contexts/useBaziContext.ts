/**
 * useBaziContext - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：承载前端具体功能
 *
 * 关键职责：
 * - 提供核心逻辑实现或数据处理能力
 * - 处理数据流转与异常边界
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `useBaziContext`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、内部模块 `baziContextStore`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { useContext } from 'react';
import { BaziContext } from './baziContextStore';
import type { BaziContextValue } from './baziContextStore';

export function useBaziContext(): BaziContextValue {
    const context = useContext(BaziContext);
    if (!context) {
        throw new Error('useBaziContext must be used within a BaziProvider');
    }
    return context;
}
