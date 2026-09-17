import React from 'react';

/**
 * 专为 AI 命理研判对话定制的 Markdown 渲染组件集合
 * - 强化表格：支持自适应横向滚动（min-w-[480px]），前三列（大运、年龄、吉凶）严格禁止折行，要点列自适应换行
 * - 强化排版：段落呼吸感、标题与列表规整、高亮与分割线优化
 */
export const drawerMarkdownComponents = {
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-2.5 w-full overflow-x-auto rounded-xl border border-border/80 shadow-xs bg-muted/10">
      <table className="min-w-[480px] w-full text-xs text-left border-collapse">
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
    <th className="px-3.5 py-2 whitespace-nowrap text-[11px] font-semibold tracking-wider text-muted-foreground">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="px-3.5 py-2 text-xs text-foreground/90 border-t border-border/40 first:whitespace-nowrap first:font-medium [&:nth-child(2)]:whitespace-nowrap [&:nth-child(3)]:whitespace-nowrap">
      {children}
    </td>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="hover:bg-muted/35 transition-colors even:bg-muted/15">
      {children}
    </tr>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="my-1.5 leading-relaxed text-foreground/95">
      {children}
    </p>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-xs sm:text-sm font-semibold text-foreground mt-3 mb-1.5 flex items-center gap-1 text-primary">
      {children}
    </h3>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="text-xs font-semibold text-foreground mt-2 mb-1">
      {children}
    </h4>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="my-1.5 space-y-1 pl-4 list-disc marker:text-primary/70">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="my-1.5 space-y-1 pl-4 list-decimal marker:text-primary/70">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed text-foreground/90">
      {children}
    </li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">
      {children}
    </strong>
  ),
  hr: () => (
    <hr className="my-2.5 border-border/60" />
  ),
};
