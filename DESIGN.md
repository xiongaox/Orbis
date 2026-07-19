---
version: alpha
name: Orbis
description: 面向八字、奇门与案例研读的东方术数工具；以克制、温润且高信息密度的双主题界面承载复杂盘面与长文本。
colors:
  background-light: "#F7F7F7"
  foreground-light: "#333333"
  surface-light: "#FFFFFF"
  primary: "#B88728"
  primary-foreground: "#1A1712"
  muted-light: "#767676"
  background-dark: "#101112"
  foreground-dark: "#E4E0D8"
  surface-dark: "#181818"
  secondary-dark: "#292929"
  primary-dark: "#CBAE88"
  accent-dark: "#589D88"
  muted-dark: "#898989"
  destructive: "#C93636"
  success: "#168043"
  warning: "#A94C00"
  qimen-status-ji-xing: "#A21CAF"
  qimen-status-ru-mu: "#8B6D03"
  qimen-status-ji-xing-ru-mu: "#2563EB"
  lunar-badge-background: "#2A2422"
  lunar-badge-foreground: "#E2D5C5"
typography:
  body:
    fontFamily: '"Inter", system-ui, sans-serif'
    fontSize: 1rem
    fontWeight: 500
    lineHeight: 1.5
  reading:
    fontFamily: '"Noto Serif SC", "Songti SC", serif'
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: 0.02em
  display:
    fontFamily: '"Noto Serif SC", "Songti SC", serif'
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: 0.02em
  data:
    fontFamily: '"JetBrains Mono", "Fira Code", monospace'
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "{spacing.sm} {spacing.lg}"
  button-secondary:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.foreground-light}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "{spacing.sm} {spacing.lg}"
  card:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.foreground-light}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
  page-light:
    backgroundColor: "{colors.background-light}"
    textColor: "{colors.foreground-light}"
  page-dark:
    backgroundColor: "{colors.background-dark}"
    textColor: "{colors.foreground-dark}"
  card-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.foreground-dark}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
  button-secondary-dark:
    backgroundColor: "{colors.secondary-dark}"
    textColor: "{colors.foreground-dark}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "{spacing.sm} {spacing.lg}"
  button-primary-dark:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.background-dark}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "{spacing.sm} {spacing.lg}"
  selection-dark:
    backgroundColor: "{colors.accent-dark}"
    textColor: "{colors.background-dark}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xs} {spacing.sm}"
  caption:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.muted-light}"
    typography: "{typography.body}"
  caption-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.muted-dark}"
    typography: "{typography.body}"
  status-destructive:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.destructive}"
  status-success:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.success}"
  status-warning:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.warning}"
  qimen-status-ji-xing:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.qimen-status-ji-xing}"
  qimen-status-ru-mu:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.qimen-status-ru-mu}"
  qimen-status-ji-xing-ru-mu:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.qimen-status-ji-xing-ru-mu}"
  lunar-badge:
    backgroundColor: "{colors.lunar-badge-background}"
    textColor: "{colors.lunar-badge-foreground}"
    typography: "{typography.reading}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs} {spacing.sm}"
  input:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.foreground-light}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "{spacing.sm} {spacing.md}"
---

## Overview

Orbis 是用于八字、奇门、万年历与案例研读的工具型界面。视觉重点是让高密度信息保持清晰、安静和可连续阅读，而不是用装饰抢占注意力。

整体气质为现代、克制的东方感：浅色主题偏纸张与墨色，深色主题偏夜观盘面。金棕色是贯穿主题的主强调色；五行色和奇门语义色只用于表达领域含义，不能替代主操作色。

## Colors

### 主题与表面

- 浅色主题使用 `background-light` 作为页面底色，`surface-light` 用于弹层、输入框和需要抬升的卡片。
- 深色主题使用 `background-dark` 作为页面底色，`surface-dark` 作为卡片与弹层底色；不使用纯黑。
- 所有常规容器、边框、文字优先通过现有 Tailwind 语义类（如 `bg-card`、`text-foreground`、`border-border`）引用 CSS 变量，保持深浅主题同步。
- `primary` / `primary-dark` 用于当前选中、关键数据、主按钮与键盘焦点；深色主题的 `accent-dark` 仅用于辅助强调。

### 领域语义色

- `src/index.css` 中的五行 CSS 变量仅表示五行，不可重新赋予成功、警告或主按钮含义。
- 奇门的门、星、神、干及吉星、入墓状态沿用 `src/index.css` 中的语义变量；新增盘面颜色时先扩展变量，再在组件中使用。
- 成功、警告、危险状态必须使用语义色，且同时辅以中文文字、图标或状态标签，不能只依赖颜色。

## Typography

- 普通 UI 使用 `body`；导航、按钮、表单与说明文字保持清晰、紧凑。
- 案例正文、古文、干支与需要沉浸阅读的内容使用 `reading` 或 `font-serif`，正文行高保持舒展。
- 模块标题、盘面重点和日期大号信息使用 `display`，避免过度使用超粗字重。
- 数字、时间、日期与需要对齐的盘面数据使用 `data` 或 `font-mono`。
- 中文界面保持简体中文；不要以全大写作为层级手段。

## Layout

- 使用 4px 为最小间距单位，常用节奏为 8 / 12 / 16 / 24 / 32px。
- 复杂桌面布局可使用多栏；移动端按现有模块规则折叠为单列、抽屉或分步视图，不得仅缩小桌面布局。
- 页面主区域优先保持留白，信息分组通过间距、弱边框和表面层级建立，而非堆叠重阴影。
- 触控操作目标原则上不小于 40px；移动端主操作优先达到 44px。
- 横向溢出的盘面、时间轴和数据表必须提供可发现的滚动或切换方式，不能裁切关键内容。

## Elevation & Depth

- 常规层级以背景色差和 `border-border` 区分；浅色主题可使用轻阴影，深色主题优先减少阴影。
- 弹层、侧抽屉使用较强遮罩与 `shadow-2xl`，其余卡片使用 `shadow-sm` 或无阴影。
- `glass-header` 仅用于固定或悬浮页头；半透明背景必须保留边框，保证滚动内容下的可读性。
- 动效以 `fade-in`、`slide-up`、颜色过渡和短距离位移为主，时长约 200–300ms；尊重现有交互，不为装饰添加持续动效。

## Shapes

- 默认圆角为 8px；普通输入框、按钮、列表项采用 6–8px。
- 信息卡和功能区可使用 12px；圆形只用于头像、状态点、图标容器与明确的徽标。
- 避免混用过多圆角等级。与现有组件相邻时，优先复用其圆角等级。

## Components

### 按钮与可选项

- 主按钮使用 `bg-primary text-primary-foreground`；悬停使用透明度或同色系明暗变化。
- 次级操作使用 `bg-secondary`、`bg-card` 或描边样式，不与主按钮竞争。
- 选中状态通常为 `bg-primary/10 text-primary border-primary/30`，并保留文字或图标状态提示。
- 危险操作使用 `destructive` 语义色，确认操作与取消操作在视觉权重上必须明确区分。

### 卡片、表单与弹层

- 卡片使用 `bg-card border border-border`，根据内容密度选择 `rounded-lg` 或 `rounded-xl`。
- 输入框必须提供清晰的焦点状态，复用 `.focus-ring`；不要移除键盘可见焦点。
- 弹层背景为 `bg-popover`，移动端全屏弹层应使用 `rounded-none`，避免保留桌面浮层的无效边距。
- 说明、空状态和加载状态使用 `text-muted-foreground`，同时给出下一步可执行动作。

### 盘面与案例

- 盘面内的干支、宫位、五行信息优先通过字形、位置、标签和语义色共同表达。
- 案例正文以衬线字体、舒适行高和有限内容宽度为优先；目录、筛选和正文的视觉层级必须清晰。
- 高亮当前日期、当前案例或选中宫位时，使用主色淡底与边框/文字组合，不只改变背景色。

## Do's and Don'ts

### Do

- 优先复用 `src/index.css` 与 Tailwind 中已有的语义 token。
- 同时检查浅色和深色主题，以及桌面、Pad、手机布局。
- 让领域语义服务于理解：五行色、休忌、门星神等必须有稳定且一致的含义。
- 保持信息密度与阅读舒适度的平衡。

### Don't

- 不要在组件中散落新的裸色值；可复用的颜色先定义为 CSS 变量。
- 不要用五行色充当任意功能的主色或纯装饰色。
- 不要移除焦点样式、仅用颜色传达状态，或让深色主题沿用浅色阴影。
- 不要为了“更现代”而替换现有术数内容所需的衬线阅读体验。
