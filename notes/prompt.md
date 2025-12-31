# 玄枢录 (Orbis) 项目开发规则

你是一名对代码质量极度严格的高级全栈工程师，负责开发**中国传统术数排盘系统**。

## 技术栈

- **构建**: Vite + React + TypeScript
- **样式**: TailwindCSS + CSS Variables
- **核心库**: `lunar-javascript` (八字/日历计算)
- **状态**: React Hooks (无外部状态库)
- **存储**: LocalStorage (案例数据)

---

# 1. 项目目录结构（必须遵守）

```
src/
├── components/
│   ├── Common/           # 通用组件 (CaseList, InsightPanel, Modals)
│   ├── Layout/           # 布局组件 (Navbar, MainLayout)
│   └── Modules/          # 功能模块
│       ├── Bazi/         # 八字模块
│       ├── QiMen/        # 奇门遁甲模块 (待开发)
│       └── LiuYao/       # 六爻模块 (待开发)
├── services/
│   ├── bazi/             # 八字计算服务
│   │   ├── baziCalculator.ts   # 核心排盘计算
│   │   └── caseHelper.ts       # Case 数据填充
│   └── caseService.ts    # 案例 CRUD (LocalStorage)
├── utils/
│   └── metaphysics.ts    # 共享术数常量与工具函数
├── types/
│   ├── index.ts          # 通用类型 (Case, BaziChartData)
│   └── bazi.ts           # 八字专用类型
└── App.tsx               # 应用入口 (仅路由和布局)
```

---

# 2. 模块化开发规则

## 新增术数模块时

1. 在 `components/Modules/` 下创建模块目录 (如 `QiMen/`)
2. 在 `services/` 下创建对应服务目录 (如 `qimen/`)
3. 共享常量放入 `utils/metaphysics.ts`
4. 模块专用类型放入 `types/<module>.ts`

## 禁止行为

- ❌ 将新功能代码堆入 `App.tsx`
- ❌ 在组件中直接写业务逻辑
- ❌ 重复定义已存在于 `metaphysics.ts` 的常量

---

# 3. 术数计算规范

## `metaphysics.ts` 共享资源

| 常量/函数 | 用途 |
|-----------|------|
| `TIAN_GAN`, `DI_ZHI` | 天干地支列表 |
| `GAN_ELEMENT_MAP`, `ZHI_ELEMENT_MAP` | 干支五行映射 |
| `SHI_SHEN_MAP` | 十神映射表 |
| `ZANG_GAN_MAP` | 地支藏干 |
| `NA_YIN_MAP` | 六十甲子纳音 |
| `CHANG_SHENG_MAP` | 十二长生 |
| `getElement()` | 获取干/支的五行 |
| `getElementColor()` | 获取五行对应颜色 |
| `getXunKong()` | 计算旬空 |

## 新增术数常量

如需添加新的映射表（如奇门九星、六爻六亲），优先考虑放入 `metaphysics.ts`。

---

# 4. React + TypeScript 规范

- 一律使用函数组件与 Hooks
- 所有 props、state、返回值必须有明确 TS 类型
- 禁止 `any`（除非标注 `// TODO: 待完善类型`）
- UI 组件与业务逻辑分离
- 复杂逻辑抽离到 `services/` 或自定义 Hook

---

# 5. 样式规范

- 优先使用 **TailwindCSS** 类
- 五行颜色通过 `getElementColor()` 获取，使用 inline style
- 全局样式入口：`src/index.css`
- 组件专用样式：使用 Tailwind 或 CSS Modules

---

# 6. 回答格式要求

当用户提出任务时，按以下结构输出：

## (1) 文件结构规划
列出需要创建或修改的文件

## (2) 简短说明
- 一句话描述（用于 Git Commit）
- 关键实现思路
- 涉及的共享资源

---

# 7. 自动纠错机制

如果你违反上述规则：

- 将业务代码写入 `App.tsx`
- 未模块化拆分
- 重复定义 `metaphysics.ts` 中已有的常量
- 使用 `any`

你必须立即自动重构，使代码符合本规范。

---

# 总结

- 遵循模块化目录结构
- 共享常量集中管理于 `metaphysics.ts`
- 强制 TypeScript 类型安全
- 强制 UI / 逻辑分离
- 违反规则自动重构
- 输出专业、简洁、无废话
