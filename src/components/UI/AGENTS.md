# UI 基础组件知识库

`src/components/UI` 放跨模块复用的基础组件。改这里的组件，或**用它们做「弹窗 ↔ 二级菜单」适配**时，先读本文件。

## 核心约定：一个界面两套壳

项目里的弹层几乎都是「桌面端居中弹窗，移动端整页二级菜单」。
**不要自己写 `createPortal` + 遮罩 + 卡片**，按下面二选一：

| 场景 | 桌面端 | 移动端 |
|------|--------|--------|
| 普通弹层 | `BaseModal` | `SubPage` |
| 移动端本就是底部滑出/全屏 | `BaseModal`（`bottomSheet` / `fullScreen`） | 由 `BaseModal` 自己处理，不再套 `SubPage` |

标准写法（`QimenNewCaseModal`、`Bazi/EditCaseModal` 同款）：

```tsx
const { isMobile } = useLayoutMode();

// 移动端：统一二级页壳（返回手势 + 统一页头）；桌面端：保留居中弹窗
if (isMobile) {
    return (
        <SubPage isOpen={isOpen} onClose={onClose} title="标题" bodyClassName="p-4" footer={footer}>
            {bodyContent}
        </SubPage>
    );
}
return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="标题" maxWidth="max-w-md" footer={footer}>
        {bodyContent}
    </BaseModal>
);
```

要点：
- **正文抽成变量**（如 `bodyContent`），两套壳共用，避免两处各写一遍导致行为漂移。
- **返回手势由壳负责**。`BaseModal` 与 `SubPage` 内部都注册了 `pushBackHandler`；
  组件自己不要再注册，否则一次返回退两层（移动端尤其容易双注册：既套了 `SubPage` 又自己注册了一遍）。

## `SubPage` 用法约束

- **不要传 `titleIcon`**。全仓 17 处用法无一处传它，二级页页头统一只有「返回箭头 + 标题」。
  图标只属于桌面端 `BaseModal`（如新建案例弹窗）。
- `title` 必填，只写标题文字。
- `bodyClassName` 按正文滚动方式来选，**不要现编**：

| 取值 | 适用 |
|------|------|
| `"p-4"` / `"p-4 space-y-3"` | 简单表单页，内容整体滚动 |
| `"overflow-hidden flex flex-col"` | 正文内部自己控滚动（长列表、聊天流、分栏） |
| `"flex flex-col"` | 同上但需要外层可见溢出 |

  默认值是空字符串（`SubPage` 的 children 容器自带 `flex-1 overflow-y-auto`）；
  正文内部还要滚动时必须显式关掉外层滚动（`overflow-hidden`），否则会套两层滚动容器。
- `actions` 放页头右侧常驻操作；`tabBar` 配 `SubPageTabs`；`footer` 钉在底部（自带 `border-t`）。

## `BaseModal` 用法约束

- `maxWidth` 默认 `max-w-md`，按内容宽度显式传。
- `title` 传 ReactNode 时由 `BaseModal` 统一摆标题与关闭按钮；
  需要多行自定义头部（标题 + Tabs）时传函数，并把收到的关闭按钮放进标题行内部。
- `bottomSheet`（移动端底部滑出）、`responsiveDrawer`（桌面右侧抽屉）都是**移动端形态由 `BaseModal` 自己处理**，
  不要再叠一层 `SubPage`。

## 反模式

- 用 `createPortal` 手写遮罩/卡片，绕开 `BaseModal`。
- 给 `SubPage` 传 `titleIcon`（全仓无先例）。
- 组件里重复注册安卓返回手势。
- 只改一套壳、另一套漏改（改这类组件时，两套壳都要过一遍）。
