# Orbis 设计规范治理文档

> 本文档是 Orbis 设计体系的**治理与实施路线**，回答三个问题：
> 1. 设计规范（DESIGN.md）与代码现状的差距在哪里；
> 2. 按什么优先级（P0–P9）、什么步骤收敛；
> 3. 后续日常改动如何「按规范办事」。
>
> 规范本体在根目录 `DESIGN.md`；本文档不替代它，只约束「它如何演进、代码如何对齐」。

| 项 | 内容 |
|------|------|
| 版本 | v1.0 |
| 建立依据 | [google-labs-code/design.md](https://github.com/google-labs-code/design.md)（格式规范 + CLI 工具）及其 [规范说明](https://github.com/google-labs-code/design.md/blob/main/README.md) |
| 审计快照 | 2026-03（本会话只读勘察，行号以当时 Dev 分支为准） |
| 适用范围 | `src/**` 全部 UI 代码、`DESIGN.md`、`tailwind.config.js`、`src/index.css` |
| 执行原则 | 先描述现实，再收敛增量，后消化存量；每次改动可 review、可回滚 |

---

## 0. 三个文件的分工

| 文件 | 角色 | 谁读 |
|------|------|------|
| `DESIGN.md` | 规范本体：YAML token（机器读）+ 章节条文（人读），格式遵循 Google design.md spec | AI 代理 + 人 |
| `src/index.css` + `tailwind.config.js` | 实现层：CSS 变量是 token 的运行时载体，Tailwind 语义类是消费接口 | 代码 |
| `docs/DESIGN-GOVERNANCE.md`（本文） | 治理层：差距基线、P0–P9 路线、日常操作手册 | 人 + AI 代理 |

与 Google 仓库的关系：**它是「格式与工具」，不是「视觉决策」**。Orbis 用它的 frontmatter 格式组织 token、用它的 CLI（lint/diff/export）做校验与回归；颜色、字号的具体取值永远由本项目决定。

---

## 1. 现状基线（2026-03 审计快照）

### 1.1 字号失控

| 事实 | 数量 | 代表位置 |
|------|------|---------|
| 裸字号 `text-[10px]`~`text-[13px]` | 166 处 | AI 弹窗集中 10–11px（`AiChatHistoryModal.tsx`），盘面 11–12px，案例卡 12–13px |
| `text-xs`（12px） | 414 处 | 全站泛滥 |
| 孤例值 | `text-[14.4px]` | `src/components/Modules/Wannianli/layouts/WannianliLayout.tsx:313` |

`DESIGN.md` 声称 `body = 1rem`，但现实主导字号是 10–13px——**规范与实现脱节**。

### 1.2 双轨 token 体系

`src/index.css` 同时存在：
- 现行体系：`--muted-foreground`、`--border`、`--card` …（Tailwind 语义类消费）
- 遗留体系：`--text-secondary-light`、`--text-tertiary-light`、`--card-time`、`--border-light`、`--accent-primary` …

仍消费遗留变量的组件：`BaziCaseInfo.tsx`、`components/CaseList/CaseCard.tsx` 等。

### 1.3 平台断点不一致（三端）

| 事实 | 位置 |
|------|------|
| `isMobile` 有两个定义：`<640` 与 `<768` | `CaseLibraryModal.tsx:117` vs `GanZhiDiagramModal.tsx:82` |
| Bazi 页自定义推导 `isMobile || (!isDesktop && !isPadLandscape)` | `BaziPage.tsx:48` |
| 绕过 `useLayoutMode` 自行 `useMediaQuery('(min-width:1024px)')` | `DuanFaPage.tsx:41-43` |

### 1.4 可读性硬伤（安卓端放大）

- `--muted-foreground: 0 0% 55%` 在浅色背景上对比度约 **3.2:1**（WCAG AA 小字要求 4.5:1），而大量 10–11px 文字恰恰用它。
- 衬线字体（Noto Serif SC）在 10px 下笔画发虚。
- 字号全部 px 硬编码，**无全站缩放机制**——安卓整体放大只能逐处改。

### 1.5 结论

`DESIGN.md` 目前是「理想态宣言」。治理路线 = **让规范描述现实 → 机制锁住增量 → 分批消化存量**。

---

## 2. 依据：Google design.md 规范要点

> 完整 spec：仓库 `docs/spec.md`；以下为落地所需的摘要。格式版本 `alpha`，spec 仍在演进，升级 CLI 时注意 breaking change。

### 2.1 文件结构（两层）

1. **YAML frontmatter**（`---` 围栏）：机器可读 token，是**规范值（normative）**；
2. **Markdown 正文**：`##` 章节，解释 *为什么* 与 *如何应用*。

### 2.2 Token schema 与类型

```yaml
version: alpha          # 可选，当前固定 alpha
name: <string>
description: <string>   # 可选
omitted: [<section>]    # 可选，声明有意省略的章节
colors: { <token>: <Color> }
typography: { <token>: <Typography> }
rounded: { <level>: <Dimension> }
spacing: { <level>: <Dimension | number> }
components:
  <component>:
    <prop>: <string | {token 引用}>
```

| 类型 | 格式 | 示例 |
|------|------|------|
| Color | 任意 CSS 颜色 | `"#1A1C1E"`、`oklch(...)` |
| Dimension | 数字+单位（`px`/`em`/`rem`） | `48px`、`0.75rem` |
| Token Reference | `{path.to.token}` | `{colors.primary}` |
| Typography | `fontFamily`/`fontSize`/`fontWeight`/`lineHeight`/`letterSpacing`/`fontFeature`/`fontVariation` | 见 2.2 schema |

组件 token 合法属性仅 8 个：`backgroundColor`、`textColor`、`typography`、`rounded`、`padding`、`size`、`height`、`width`；hover/active 等变体写成**独立条目**（如 `button-primary-hover`）。

### 2.3 章节顺序（正文 `##` 必须按此排列，可省略不可乱序）

1. Overview → 2. Colors → 3. Typography → 4. Layout → 5. Elevation & Depth → 6. Shapes → 7. Components → 8. Do's and Don'ts

未知章节标题会被**保留不报错**——因此本项目可新增「Platforms」章节，格式安全（见 P2 注意事项）。

### 2.4 CLI（Windows 必读）

Windows 下 `design.md` bin 名与 Markdown 文件关联冲突，**一律用 `designmd` 别名**：

```bash
# 安装
npm install -D "@google/design.md"

# 校验（Windows 用别名；npx 直跑需 -p）
npx -p "@google/design.md" designmd lint DESIGN.md

# 比较两版规范，检测 token 级回归（exit 1 = 有回归）
npx -p "@google/design.md" designmd diff DESIGN.md DESIGN-v2.md

# 导出（Tailwind v3 theme.extend JSON）
npx -p "@google/design.md" designmd export --format json-tailwind DESIGN.md
```

`package.json` 脚本中同样用别名：

```json
{ "scripts": { "design:lint": "designmd lint DESIGN.md" } }
```

### 2.5 lint 规则（11 条）与本项目的对应关系

| 规则 | 级别 | 对 Orbis 的意义 |
|------|------|----------------|
| `broken-ref` | error | `{colors.xxx}` 引用必须存在 → CI 门禁 |
| `contrast-ratio` | warning | 组件前景/背景对 < 4.5:1 自动报警 → P8 自动化 |
| `orphaned-tokens` | warning | 定义了却没人用的 token → P4 清理双轨变量 |
| `missing-primary` | warning | 必须有 `primary` 色（已有） |
| `missing-typography` / `missing-sections` | info | 补 token 时的完整性提示 |
| `section-order` / `unknown-key` / `token-like-ignored` / `omitted-rule` | warning/info | 格式卫生 |

> ⚠️ **`token-like-ignored` 陷阱**：顶层出现「看起来像 token」的未知 YAML 键（含 hex 色、字号等）会被 warning。因此 P2 新增平台字号时，应写进 `typography` 块（如 `typography.caption-mobile`）或仅写正文条文，**不要**自创顶层 `platforms:` 键塞 token 值。

---

## 3. 目标架构（终态）

### 3.1 单一事实源链路

```
DESIGN.md (frontmatter token)
   │  designmd lint / diff —— 门禁
   ▼
src/index.css  CSS 变量（唯一运行时载体，:root + .dark）
   ▼
tailwind.config.js（语义类映射，hsl(var(--xxx))）
   ▼
组件层 —— 只允许消费语义类（bg-card / text-muted-foreground / text-label …）
        禁止裸色值、裸字号
```

### 3.2 字号阶梯（六档，挂载进 DESIGN.md `typography` 块）

| token | rem | px@16 | 归档现状 | 用途 |
|-------|-----|-------|---------|------|
| `caption` | 0.6875 | 11 | `text-[10px]`、`text-[11px]`（**10px 淘汰**） | 徽标、时间戳、角标 |
| `label` | 0.75 | 12 | `text-xs`、`text-[12px]` | 按钮字、表单标签、列表元信息 |
| `body-compact` | 0.8125 | 13 | `text-[13px]` | 紧凑正文、卡片描述 |
| `data`（保留） | 0.875 | 14 | 盘面数字现状 | 盘面数据、对齐数字 |
| `body` / `reading`（保留） | 1 | 16 | 正文 | 界面正文 / 沉浸阅读 |
| `display`（保留） | 1.5 | 24 | 标题 | 模块标题 |

原则：**阶梯覆盖现状主流值**（11/12/13 全部有名字），迁移 = 换名字不改视觉。

### 3.3 缩放机制（治「安卓字太小」的根）

- 阶梯单位全部用 `rem`；`html { font-size }` 分端设定：
  - desktop `16px`、pad `17px`、mobile（含安卓 WebView）`18px`；
- 由 Tauri 平台检测或 `useLayoutMode` 给 `<html>` 挂 `data-platform` 属性，CSS 按属性切根字号；
- 效果：安卓整体 +12.5% 字号 = **改一处配置**，而非改 414 处 `text-xs`。

### 3.4 平台契约（新增 DESIGN.md「Platforms」章节，prose 层）

- 断点唯一事实源 = `useLayoutMode()`：mobile `<768`；pad = `isPadLandscape`；desktop `≥1024` 且非 Pad 横屏；
- 组件**禁止**自行 `useMediaQuery` / `window.innerWidth` 重算端别；
- 布局分叉分级：
  - **模块级**（允许三套文件）：仅 `src/components/Modules/<X>/layouts/`；
  - **叶子级**（只允许 className 响应式 + `isPadLandscape` prop）：其余一切组件；
- 触控目标：mobile ≥ 40px（主操作 44px）、pad/desktop ≥ 32px。

---

## 4. 治理路线 P0–P9

> 优先级含义：P0–P2 止血与立规；P3 执法机制；P4–P6 还清技术债；P7–P8 专项治理；P9 长期演进。
> 工作量按「单人·天」粗估；每个 P 结束都必须 `npm run lint && npx tsc -b && npm run build` 全绿。

---

### P0 止血（0.5 天）——不动规范，先缓解安卓阅读性

- [ ] Tauri Android WebView 设置 `textZoom`（115%–125%，真机试出舒适值）；
- [ ] `src/index.css` 浅色主题 `--muted-foreground: 0 0% 55%` → `0 0% 46%`（对比度 3.2:1 → ≈4.5:1）；
- [ ] 盘面若保留 10px 衬线小字，字重提至 500。

**验收**：安卓真机案例正文与盘面可读性主观通过；`build` 绿。
**回滚**：纯 CSS/配置单点改动，revert 即可。
**注意**：此步是**临时缓解**，P7 完成后 textZoom 应撤掉（避免双重放大）。

---

### P1 字号审计（1 天）——产出事实，不改视觉

- [ ] 用 grep/脚本统计全部字号类名分布：`text-xs`、`text-[Npx]`（N ∈ 10–16 及孤例），按模块×字号出交叉表；
- [ ] 同法统计裸色值（`text-[#`、`bg-[#`、`text-[hsl(`、遗留 `--text-*`/`--card-time` 消费点）；
- [ ] 审计结果写入 `docs/design-audit.md`（此后每次大迁移更新），作为 P2/P5 的输入。

**验收**：能回答「11px 都在哪、有多少」，且数字与本文 §1 一致或更新。
**风险**：无（只读）。

---

### P2 规范修订：DESIGN.md v2（0.5 天）——规范开始描述现实

- [ ] `typography` 块新增 `caption` / `label` / `body-compact` 三档（§3.2），单位用 `rem`；`body`/`reading`/`data`/`display` 保留但字号单位 px→rem；
- [ ] 正文新增 **Platforms** 章节（§3.4 契约 + §1.3 的不一致现状处理决定）；
- [ ] Do's and Don'ts 增补：「禁止裸字号类名」「禁止组件内自行判断端别」；
- [ ] 修订说明写入 frontmatter `description` 或 Overview（改动可追溯）。

**格式合规动作**：
- [ ] `designmd lint DESIGN.md` 通过（0 error）；
- [ ] `designmd diff DESIGN.md DESIGN-v2.md` 人工审查 token 变更清单，确认无意外删除。

**注意事项**：
- Platforms 写在**正文**，平台字号变体放 `typography` 块内（如 `caption-mobile`），勿造顶层 `platforms:` 键（§2.5 陷阱）；
- 新章节放在 Do's and Don'ts **之前**、符合 §2.3 顺序约束的位置（未知章节会被保留，但保持顺序卫生）；
- lint 若报 `orphaned-tokens`（新 token 尚无组件引用）属预期，P5 消化。

**验收**：lint 0 error；diff 报告仅含预期新增/修改。
**回滚**：git 单文件 revert；旧 DESIGN.md 与代码互不依赖，无连锁。

---

### P3 机制固化（1 天）——新代码从此无法越轨

- [ ] 安装 `eslint-plugin-tailwindcss`（或自写 no-restricted-syntax 规则），禁止：
  - `text-\[(\d+(\.\d+)?)(px|rem)\]`（裸字号）；
  - `text-\[#|bg-\[#`（裸色值）；
  - 白名单豁免目录先挂 `docs/design-audit.md`（存量文件），**新增文件零豁免**；
- [ ] `package.json` 增加 `design:lint`（用 `designmd` 别名）；
- [ ] CI（或 worktree:build 脚本）串联：`npm run lint` + `npx tsc -b` + `npm run design:lint`；
- [ ] `AGENTS.md` CONVENTIONS 更新：改 UI 必读 DESIGN.md + 改 DESIGN.md 必跑 design:lint（替换现有含糊表述）。

**验收**：故意写一个 `text-[11px]` 提交 → lint 红；豁免清单外的存量改动逐步收紧。
**回滚**：规则降级为 warn 一周，再升 error。

---

### P4 双轨 token 收编（2–3 天）——一个体系说话

- [ ] 建立映射表（附录 B）：`--text-secondary-light`→`text-muted-foreground`… 逐条确认视觉等价（含 dark 分支）；
- [ ] 逐组件替换遗留变量消费点（`BaziCaseInfo.tsx`、`CaseCard.tsx` 等约 10 个文件）；
- [ ] `src/index.css` 删除死变量；确需保留的加 `/* deprecated: use --xxx */` 注释与删除期限；
- [ ] 跑 `designmd lint` 看 `orphaned-tokens` 清理无效 token。

**验收**：grep 遗留变量名 = 0 消费点；浅/深主题截图对比无肉眼可见回归。
**风险**：dark 模式分支遗漏 → 每替换一个组件必须双主题目检。
**回滚**：按组件粒度提交，可单点 revert。

---

### P5 字号 rem 化迁移（3–5 天，分批）——换名字，不改视觉

批次顺序（按阅读频率 = 用户收益排序）：

1. **批次 A · 阅读层**：案例正文、断法文章、Markdown 渲染器（`markdownComponents.tsx` 等）→ `reading`/`body`；
2. **批次 B · 盘面层**：`Qimen`/`Bazi`/`SanYuan`/`CaseStudy` 盘面组件 → `data`/`label`（衬线小字同步 500 字重）；
3. **批次 C · 列表与导航**：案例卡、筛选器、Tab → `label`/`body-compact`；
4. **批次 D · 弹窗与辅助**：AI 系列弹窗（裸字号重灾区 10–11px）→ `caption`/`label`；`text-[10px]` 全部升 `caption`（11px，移动端字号下限）。

每批操作：映射表（附录 A）→ 批量替换 → 双主题 + 三端目检 → 单独 commit。

**验收**：批次结束时该范围 `grep -E "text-\[1[0-6]px\]"` = 0；P3 的 ESLint 豁免清单相应缩短。
**风险**：10px→11px 徽标可能挤爆容器 → 批次 D 逐处目检，必要时同批加 `whitespace-nowrap`/容器 min-width。
**回滚**：批次 = commit 粒度。

---

### P6 平台断点统一（1–2 天）——一个端别判定

- [ ] `useLayoutMode` 成为唯一端别来源；处理 §1.3 三处：
  - `CaseLibraryModal.tsx` `<640` → 收编（预期行为：640–767 从「移动」改判「pad 档」，需真机确认弹窗布局）；
  - `GanZhiDiagramModal.tsx` 自写 `<768` → 换 `useLayoutMode().isMobile`；
  - `DuanFaPage.tsx` 自写 `useMediaQuery` → 换 `useLayoutMode().useDesktopLayout`；
  - `BaziPage.tsx` 的第三种推导 → 评估能否并入 hook；若业务确需「中间地带走移动布局」，把该规则**写进 Platforms 章节**成为显式条文，而不是留在页面里；
- [ ] ESLint 增补：组件内禁止 `useMediaQuery(` / `window.innerWidth`（白名单：`hooks/` 内的布局 hook）。

**验收**：grep 上述模式在白名单外 = 0；四端场景（手机竖屏/Pad 竖屏/Pad 横屏/桌面）回归清单过一遍。
**风险**：640→768 属行为变更，可能暴露临界宽度布局问题 → 单独 commit，出问题只 revert 这一条。

---

### P7 安卓端阅读性专项（2 天）——治本，替换 P0 的拐杖

- [ ] 阶梯 rem 化完成后，`index.html`/`main.tsx` 给 `<html>` 挂 `data-platform="mobile|pad|desktop"`（Tauri API 检测，浏览器回退宽度判断）；
- [ ] `index.css`：
  ```css
  html { font-size: 16px; }
  html[data-platform="pad"] { font-size: 17px; }
  html[data-platform="mobile"] { font-size: 18px; }
  ```
- [ ] 移除 P0 的 `textZoom`（避免叠加放大）；
- [ ] 三端真机回归：盘面网格不溢出、横向滚动行为不变、44px 触控目标保持。

**验收**：安卓端正文 ≥ 视觉 16px 等效、盘面无溢出；`textZoom` 代码已删。
**风险**：个别 px 定高的容器（如 `h-[90px]` 行高格）内文字变大可能截断 → 盘面行高格必要时改 `min-h`；发现一处修一处并回写 Platforms 章节。

---

### P8 可达性治理（1–2 天，可与 P5 并行）

- [ ] 目标一：全部「正文语义」文字对比度 ≥ 4.5:1（浅色主题逐 token 核查：muted 已在 P0 处理，核查 `--text-subtle`、`foreground/70` 等透明度用法）；
- [ ] 目标二：状态不只靠颜色（现有 DESIGN.md 条文落实核查：destructive/success/warning 均带文字或图标）；
- [ ] `designmd lint` 的 `contrast-ratio` 纳入 CI 报警（warning 级即可，不阻塞）；
- [ ] 产出《对比度核查表》追加进 `docs/design-audit.md`。

**验收**：lint 无新增 contrast warning；双主题抽查通过。

---

### P9 长期治理（持续，无截止）

- [ ] **diff 门禁**：任何改 `DESIGN.md` 的 PR 必须附 `designmd diff` 输出，token 删除视为 breaking 需说明迁移；
- [ ] **导出管线（可选）**：`designmd export --format json-tailwind DESIGN.md` 接入 `tailwind.config.js` 的 `theme.extend`，让 frontmatter 真正成为机器事实源（当前阶段人工同步即可，标记为实验特性）；
- [ ] **alpha 跟踪**：Google spec 仍为 alpha（见 §2），升级 CLI 时读其 changelog，breaking 则锁版本；
- [ ] **季节性审计**：每季度跑一次 P1 的统计脚本，裸字号/裸色值必须为 0，新孤例当周清零；
- [ ] **豁免清零**：P3 白名单随 P5 批次推进逐批删除，最终删除豁免机制本身。

---

## 5. 日常改动操作手册

> 后续任何 UI 相关改动，先在这里对号入座，再动手。

### 场景 A：改某组件的字号/间距/颜色（最常见）

1. 到 `DESIGN.md` 找对应 token（字号→§Typography 阶梯；颜色→§Colors；间距→§Layout 的 4px 节奏）；
2. 组件里只写语义类：`text-label`、`text-muted-foreground`、`bg-card`——**写不出语义类的需求本身就是规范缺口**，转场景 B/E；
3. 三端检查：手机+桌面各看一眼，涉及盘面加 Pad 横屏；
4. 双主题各看一眼。

### 场景 B：需要一个新颜色

1. 先问：能否用现有 token？（90% 的答案是能）
2. 确需新增：`src/index.css` 定义变量（:root + .dark 都要有）→ `tailwind.config.js` 映射语义类 → `DESIGN.md` colors 块加 token → `npm run design:lint`；
3. 若新色与领域语义相关（五行/奇门），先读 `src/index.css` 现有语义变量组，扩展变量而非复用功能色。

### 场景 C：新增页面/布局

1. 端别判断只用 `useLayoutMode()`；
2. 模块需要三套布局 → 建 `layouts/` 三文件 + 页面级分发（照 `QimenPage.tsx` 模式）；叶子组件只用 className 响应式；
3. 在 DESIGN.md Platforms 章节「布局分叉清单」登记新模块。

### 场景 D：修改 DESIGN.md 本身

1. 改 frontmatter token → 必跑 `npm run design:lint`，0 error 才算完成；
2. 改完跑 `designmd diff` 留档（P9 门禁）；
3. 正文改动同步检查受影响的代码（如改阶梯值 → grep 旧档位消费点）；
4. 同步更新本文档对应条目（阶梯表、契约、批次状态）。

### 场景 E：新增组件 token / 变体

1. components 块属性只用 §2.2 的 8 个合法键；
2. hover/active 变体写成独立条目（`button-primary-hover`），不要发明嵌套结构；
3. 颜色一律 `{colors.xxx}` 引用，不写裸值（lint 会抓 `broken-ref` 与裸色）。

### 反模式速查（出现即错，CI 会拦）

| ❌ 禁止 | ✅ 应该 |
|--------|--------|
| `text-[11px]`、`text-[14.4px]` | `text-caption` / 对应档位语义类 |
| `text-[#B88728]` | `text-primary` |
| 组件里 `window.innerWidth < 768` | `const { isMobile } = useLayoutMode()` |
| `style={{ color: '#xxx' }}`（领域色除外，且须引用 CSS 变量） | 语义类或 CSS 变量 |
| 深色主题沿用浅色阴影 / 只改背景色表达状态 | 按 DESIGN.md Elevation/状态条文 |
| 改了 DESIGN.md 不跑 lint | `npm run design:lint` 后再提交 |

---

## 6. 附录

### 附录 A · 字号映射表（P5 迁移用）

| 现状类名 | 目标 token | 备注 |
|----------|-----------|------|
| `text-[10px]` | `text-caption` | 10px 淘汰，升 11px；批次 D 逐处目检容器 |
| `text-[11px]` | `text-caption` | 直映 |
| `text-xs`、`text-[12px]` | `text-label` | 数量最大（414 处），批次 B/C 分摊 |
| `text-[13px]` | `text-body-compact` | 直映 |
| `text-[14px]`、`text-sm`（数据位） | `text-data` | 仅盘面/对齐数字；正文语义的 `text-sm` → `text-body-compact` |
| `text-base` | `text-body` | 直映 |
| `text-[14.4px]` | `text-data` | 孤例，WannianliLayout.tsx:313 |
| `text-[16px]` | `text-body` | 直映 |

### 附录 B · 遗留变量映射表（P4 用，替换前逐条目检 dark 分支）

| 遗留 | 目标 | 消费点示例 |
|------|------|-----------|
| `--text-secondary-light` | `--muted-foreground` | BaziCaseInfo.tsx、CaseCard.tsx |
| `--text-tertiary-light` | `--muted-foreground`（或新增 `--foreground/60` 用法） | BaziCaseInfo.tsx:244 |
| `--card-time` | `--muted-foreground` | BaziCaseInfo.tsx:148 |
| `--border-light` / `--border-lighter` | `--border` | CaseCard.tsx:111 |
| `--muted-hover` | `--accent` / `bg-muted` | BaziCaseInfo.tsx:135 |
| `--accent-primary` | `--primary` | BaziCaseInfo.tsx:177、CaseCard.tsx:123 |

### 附录 C · 常用命令

```bash
# 设计规范门禁
npm run design:lint                                   # = designmd lint DESIGN.md（Windows 别名）
npx -p "@google/design.md" designmd diff DESIGN.md DESIGN-v2.md
npx -p "@google/design.md" designmd export --format json-tailwind DESIGN.md

# 例行自检
npm run lint && npx tsc -b && npm run build

# 审计统计（P1/P9 用，PowerShell）
# 裸字号分布
rg -o 'text-\[\d+(\.\d+)?px\]' src --count-matches
# 遗留变量消费点
rg 'var\(--(text-secondary-light|text-tertiary-light|card-time|border-light|accent-primary|muted-hover)\)' src -l
```

### 附录 D · 术语表

| 术语 | 含义 |
|------|------|
| Token | DESIGN.md frontmatter 中的具名设计值（颜色/字号/圆角…） |
| 语义类 | Tailwind 中映射 CSS 变量的类（`bg-card`、`text-label`），组件唯一合法消费接口 |
| 裸值 | 直接写在类名/内联样式里的字面量（`text-[11px]`、`#B88728`），禁止 |
| 档位（阶梯） | §3.2 的六档具名字号：caption/label/body-compact/data/body/display |
| 端别 | mobile / pad（以 `isPadLandscape` 为准）/ desktop 三种布局形态 |
| 门禁 | 阻止不合规范代码合入的自动化检查（ESLint + designmd lint + CI） |
| 豁免清单 | P3 中允许存量裸值临时存在的文件名单，随迁移批次清零 |

---

## 7. 路线总览（一屏图）

```
P0 止血 ──────────────► textZoom + 对比度           (今天可做)
P1 审计 ──► 审计快照 ──┐
P2 立规 ──► DESIGN.md v2（阶梯 + Platforms + lint 通过）
P3 执法 ──► ESLint 禁裸值 + design:lint 进 CI
P4 收编 ──► 遗留变量清零                              (还债期 1-2 周)
P5 rem  ──► 字号四批次迁移（阅读→盘面→列表→弹窗）
P6 断点 ──► useLayoutMode 唯一端别
P7 治本 ──► 根字号分端缩放，撤 textZoom               (安卓专项收口)
P8 可达 ──► 对比度/触控全面达标                        (可并行)
P9 长治 ──► diff 门禁 / 导出管线 / 季度审计            (持续)
```

> 每完成一个 P：更新本文档对应勾选状态与 `docs/design-audit.md`，并按 `AGENTS.md` 约定同步相关子目录 `AGENTS.md`。
