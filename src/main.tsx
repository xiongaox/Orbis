/**
 * main - 应用源码层
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
 * - 无显式导出
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、外部依赖 `react-dom/client`、内部模块 `index.css` 等 4 个模块
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
