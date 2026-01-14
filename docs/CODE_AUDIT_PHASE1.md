# 代码优化建议书 (Code Optimization Proposal)

**日期**: 2026-01-14
**审计对象**: Orbis 项目 (重点审计 src/components/Modules/Bazi, src/services, src/lib)

## 1. 总体评分

| 维度 | 评分 (1-10) | 简评 |
| :--- | :--- | :--- |
| **代码整洁度** | 6 | 核心组件 (`GanZhiDiagramModal`) 逻辑混杂，存在 "God Object" 倾向；命名尚可。 |
| **耦合度** | 5 | 核心算法（如布局计算）硬编码在 UI 组件中，导致无法独立测试和复用。 |
| **可复用性** | 6 | 基础 `maps` 抽离较好，但部分业务逻辑（如十神分组）仍散落在组件内。 |
| **健壮性** | 5 | 关键业务逻辑大量使用 `any` 绕过类型检查，存在极高运行时风险。 |

## 2. 核心问题总结

**核心架构风险：类型系统失效与核心算法的 UI 耦合**

项目中核心的八字排盘业务逻辑（特别是 `GanZhiDiagramModal` 中的轨道布局算法）被紧密耦合在 React UI 组件中，且输入数据 (`baziData`) 和处理过程大量使用 `any` 类型。这不仅导致核心算法无法进行单元测试，也使得任何 UI 调整都可能意外破坏业务逻辑，系统的可维护性和健壮性受到严重威胁。

## 3. 优化要点列表

| 序号 | 优化维度 | 问题描述 | 影响分析 (如果不改会怎样) | 建议重构方案 | 优先级 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **耦合度** | `src/components/Modules/Bazi/GanZhiDiagramModal.tsx` (L24: `assignTracks`) <br> 核心布局算法硬编码在 UI 组件中 | 布局逻辑无法单测，UI 与算法逻辑强绑定，修改一处易崩另一处。 | 提取布局算法到 `src/lib/xuan-bazi/utils/diagramLayoutUtil.ts`，实现纯逻辑分离。 | **高** |
| 2 | **健壮性** | `src/components/Modules/Bazi/GanZhiDiagramModal.tsx` (L14, L46) <br> 大量使用 `any` (如 `baziData`, `relations`) | 丧失 TypeScript 类型保护，重构时极易引入运行时错误。 | 定义完整的 `DiagramData` 和 `Relation` 接口，移除所有 `any`。 | **高** |
| 3 | **健壮性** | `src/services/bazi/baziCalculator.ts` (L25, L34) <br> `bazi` 对象类型缺失 (`any`)，依赖 `safeCall` 动态调用 | 无法利用 IDE 智能提示，隐藏潜在的 API 调用错误，代码晦涩。 | 引入 `lunar-typescript` 的类型定义 (`Solar`/`EightChar`)，移除 `safeCall`。 | **中** |
| 4 | **可复用性** | `src/components/Modules/Bazi/GanZhiLiuTongModal.tsx` (L43) <br> `SHISHEN_GROUP_MAP` 等业务常量分散在组件内 | 其他模块无法复用该逻辑，导致业务规则定义不唯一。 | 将通用业务常量迁移至 `src/lib/xuan-bazi/maps` 目录。 | **低** |
| 5 | **代码整洁度** | `src/lib/xuan-bazi/utils/wangShuaiUtil.ts` <br> 文件过大 (>1300行)，职责不单一 | 阅读和维护困难，容易产生逻辑冲突。 | (建议后续执行) 按功能拆分为 `wangShuaiStrength.ts` 等子模块。 | **低** |

[导出到 Google 表格]

## 4. 确认与执行

**以上优化方案是否准确？请告知我需要开始执行哪些要点。**
