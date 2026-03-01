/**
 * useAuth - 应用源码层
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
 * - `useAuth`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、内部模块 `authContextStore`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { useContext } from 'react';
import { AuthContext } from './authContextStore';

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
