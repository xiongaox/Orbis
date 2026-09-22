import React from 'react';

/**
 * 专为 AI 命理研判对话定制的 Markdown 渲染组件集合
 * - 字号由外层阅读容器给定基准（正文 16px），标题按 h1~h4 逐级建立层级，表格 13px（桌面 14px）
 * - 强化表格：支持自适应横向滚动（min-w-[480px]），前三列（大运、年龄、吉凶）严格禁止折行，要点列自适应换行
 * - 强化排版：段落呼吸感、标题与列表规整、高亮与分割线优化
 *
 * 注：不使用 @tailwindcss/typography（项目未安装），所有排版均由此处显式定义
 */
export const drawerMarkdownComponents = {
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-3 w-full overflow-x-auto rounded-xl border border-border/80 shadow-xs bg-muted/10">
      <table className="min-w-[480px] w-full text-[13px] sm:text-sm text-left border-collapse">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-muted/70 text-muted-foreground font-semibold border-b border-border/70">
      {children}
    </thead>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="px-3.5 py-2 whitespace-nowrap text-[12px] sm:text-[13px] font-semibold tracking-wider text-muted-foreground">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="px-3.5 py-2 text-[13px] sm:text-sm text-foreground/90 border-t border-border/40 first:whitespace-nowrap first:font-medium [&:nth-child(2)]:whitespace-nowrap [&:nth-child(3)]:whitespace-nowrap">
      {children}
    </td>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="hover:bg-muted/35 transition-colors even:bg-muted/15">
      {children}
    </tr>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="my-3 leading-[1.75] text-foreground/95">
      {children}
    </p>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-xl font-bold text-foreground border-b border-border/60 pb-1.5 mt-5 mb-3">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-[18px] font-bold text-primary mt-5 mb-2 flex items-center gap-1.5">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-[17px] font-semibold text-primary mt-4 mb-2 flex items-center gap-1.5">
      {children}
    </h3>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="text-base font-semibold text-foreground mt-4 mb-2">
      {children}
    </h4>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="my-3 space-y-1.5 pl-4 list-disc marker:text-primary/70">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="my-3 space-y-1.5 pl-4 list-decimal marker:text-primary/70">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-[1.75] text-foreground/90">
      {children}
    </li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">
      {children}
    </strong>
  ),
  hr: () => (
    <hr className="my-4 border-border/60" />
  ),
};
