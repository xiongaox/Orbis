---
name: orbis-mobile-adaptation
description: 仅在 Orbis 项目中使用；当进行移动端适配任务时，严格约束改动范围，确保桌面端和 Pad 端布局不受影响。
---

# Orbis 移动端适配规范

本技能定义了移动端适配任务的安全边界和工作流程。核心原则是：**移动端适配绝不能影响桌面端和 Pad 端的现有布局和行为**。

---

## 1. 适配前准备

1. **确认当前仓库根目录是 `Orbis`。**
   - 运行 `git rev-parse --show-toplevel`。
   - 若结果路径最后一级不是 `Orbis`，立即停止并提示：此技能仅支持 Orbis 项目。

2. **创建基线快照。**
   - 在修改任何文件之前，运行 `git stash` 或确认工作区为干净状态。
   - 记录即将改动的文件列表，作为后续回归验证的依据。

3. **理解布局分层体系。**
   - 项目使用三层布局分级：
     - **桌面端 (Desktop)**：`min-width: 1024px` 且非 Pad，由 `useDesktopLayout` 控制。
     - **Pad 横屏 (Pad Landscape)**：由 `useIsPadLandscape()` 控制，通常 `min-width: 768px` 到 `max-width: 1366px` 且横屏。
     - **移动端 (Mobile)**：`isMobileLayout = !useDesktopLayout && !isPadLandscape`。
   - **仅修改 `isMobileLayout === true` 条件分支下的样式和布局。**

---

## 2. 编码规则（强制）

### 2.1 条件分支隔离

所有移动端样式改动**必须**包裹在 `isMobileLayout` 条件下，禁止修改无条件（基础）类名或其他布局分支：

```tsx
// ✅ 正确：仅在 isMobileLayout 分支中修改
className={classNames(
    'base-classes-不要改',
    isMobileLayout ? '移动端专用样式' : '桌面/Pad样式-不要改'
)}

// ❌ 错误：直接修改基础类名，影响所有布局
className={classNames(
    'base-classes-被修改了',  // 这会影响桌面端和 Pad 端
    isMobileLayout ? '移动端样式' : '其他样式'
)}
```

### 2.2 共享状态保护（关键！）

当移动端适配涉及修改**共享状态变量**（如 `useState` 的默认值、条件判断逻辑）时，必须严格遵守：

#### 2.2.1 默认值修改
```tsx
// ✅ 正确：使用独立的移动端状态，或在条件中区分
const [hideDetails, setHideDetails] = useState(isMobileLayout); // 仅影响初始值

// ⚠️ 警告：修改默认值后，必须检查所有消费此状态的地方是否需要按端分支
```

#### 2.2.2 条件逻辑修改
```tsx
// ✅ 正确：按端区分条件行为
{isMobileLayout
    ? (/* 移动端专用逻辑 */)
    : (/* 桌面端保持原样，直接复制原始代码 */)
}

// ❌ 错误：直接修改共享条件，影响所有端
{!hideDetails && <Panel />}  // 改了这个条件就影响所有端！
// ✅ 正确做法：
{(isMobileLayout || !hideDetails) && <Panel />}  // 移动端始终显示，桌面端保持原逻辑
```

#### 2.2.3 全量影响检查（强制！）
**每次修改共享状态的默认值、条件逻辑或三元表达式时，必须立即执行以下步骤：**

1. 使用 `grep_search` 搜索该状态变量在整个模块中的所有引用
2. 逐一检查每个引用点，确认该改动是否会影响桌面端或 Pad 端的行为
3. 对每个受影响的引用点，添加 `isMobileLayout` 条件分支保护

```bash
# 示例：修改了 hideDetails 的默认值后，必须搜索所有使用点
grep -n "hideDetails" src/components/Modules/Bazi/*.tsx
```

### 2.3 禁止修改的区域

以下内容在移动端适配任务中**严禁改动**（除非使用 `isMobileLayout` 条件包裹）：
- `useDesktopLayout` 条件分支中的样式和逻辑
- `isPadLandscape` 条件分支中的样式和逻辑
- 无条件的基础类名（如 `"flex flex-col min-h-0"` 等）
- 非布局相关的业务逻辑代码
- **无条件的渲染逻辑**（如 `{!hideDetails && <X />}` → 不能直接改条件）

### 2.4 新增元素的处理

如果需要为移动端新增 UI 元素（如抽屉、底部面板等）：
- 必须使用 `{isMobileLayout && (<新元素/>)}` 包裹
- 不得替换或移除桌面端/Pad 端已有的元素

### 2.5 新增 Props 的处理

如果需要向子组件传递移动端专用的 prop（如 `hideDetails`）：
- 子组件内部使用该 prop 时，必须结合 `isMobileLayout` 判断
- 禁止让移动端专用 prop 在非移动端生效

```tsx
// ✅ 正确：子组件内部按端保护
{!(isMobileLayout && hideDetails) && <DetailRows />}

// ❌ 错误：直接使用 prop，影响所有端
{!hideDetails && <DetailRows />}
```

---

## 3. 验证流程（每次改动后必须执行）

### 3.1 桌面端回归验证

1. 在浏览器中将窗口调整为 **1440×900** 或更大。
2. 打开对应模块页面，确认布局与改动前完全一致。
3. 重点检查：三栏/双栏布局、侧边栏可见性、面板位置和大小。
4. **重点检查所有按钮和交互行为是否和改动前一致。**

### 3.2 Pad 横屏回归验证

1. 在浏览器中将窗口调整为 **1024×768**（iPad Mini 横屏）或 **1194×834**（iPad Air 横屏）。
2. 确认 Pad 专有交互（如竖线抽屉把手）正常工作。

### 3.3 移动端功能验证

1. 将窗口调整为 **375×812**（iPhone）。
2. 确认新适配的布局效果符合预期。

---

## 4. 回退机制

**一旦发现桌面端或 Pad 端布局被改动：**

1. **立即停止当前工作。**
2. **回退受影响的文件**：
   - 运行 `git checkout HEAD -- <受影响的文件>` 恢复到最近的干净状态。
   - 或使用 `git diff HEAD -- <文件>` 定位并手动撤销非移动端的改动。
3. **分析原因**：确认是哪一处修改影响了桌面端/Pad 端。
4. **重新开始该文件的适配**，确保改动严格限制在 `isMobileLayout` 分支内。

---

## 5. 检查清单（提交前核对）

- [ ] 所有样式改动都在 `isMobileLayout` 条件分支内
- [ ] 未修改基础类名（无条件类名字符串）
- [ ] 未修改 `useDesktopLayout` 分支的任何内容
- [ ] 未修改 `isPadLandscape` 分支的任何内容
- [ ] **共享状态改动已执行全量引用检查**
- [ ] **每个逻辑条件改动都有 `isMobileLayout` 分支保护**
- [ ] 桌面端（1440×900）布局和交互验证通过
- [ ] Pad 横屏（1024×768）布局验证通过
- [ ] 移动端（375×812）功能验证通过
