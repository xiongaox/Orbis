/**
 * CaseStudy 模块 - Markdown 渲染器配置
 * 共享的 ReactMarkdown components 配置
 */
import type { Components } from 'react-markdown';

/**
 * 断法内容的 Markdown 渲染组件 (优化版列表样式: 无缩进、大间距、高亮序号)
 * 这是基础样式组件，其他配置都复用此样式以保持全站统一
 */
export const duanfaMarkdownComponents: Components = {
    h1: ({ node, ...props }) => (
        <div className="mt-8 mb-6">
            <h1 className="text-xl font-bold text-primary inline-block" {...props} />
            <div className="w-full h-0.5 bg-primary/30 mt-2 rounded-full" />
        </div>
    ),
    h2: ({ node, ...props }) => (
        <div className="mt-6 mb-4">
            <h2 className="text-lg font-bold text-primary/80 inline-block" {...props} />
            <div className="w-full h-0.5 bg-primary/20 mt-1.5 rounded-full" />
        </div>
    ),
    h3: ({ node, ...props }) => (
        <div className="mt-5 mb-3">
            <h3 className="text-base font-bold text-primary/70 inline-block" {...props} />
        </div>
    ),
    p: ({ node, ...props }) => (
        <p className="mb-4 text-justify text-[18px] leading-8 indent-8 text-foreground/75" {...props} />
    ),
    blockquote: ({ node, ...props }) => (
        <blockquote
            className="border-l-4 border-primary/40 pl-6 pr-6 py-4 my-6 bg-primary/10 dark:bg-primary/5 rounded-r-lg text-[16px] font-medium text-foreground/70 leading-relaxed [&>p]:indent-0 [&>p]:mb-3 [&>p:last-child]:mb-0 space-y-2"
            {...props}
        />
    ),
    table: ({ node, ...props }) => (
        <div className="overflow-x-auto my-4">
            <table className="min-w-full divide-y divide-border" {...props} />
        </div>
    ),
    th: ({ node, ...props }) => (
        <th className="px-3 py-2 bg-muted/50 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider" {...props} />
    ),
    td: ({ node, ...props }) => (
        <td className="px-3 py-2 whitespace-nowrap text-sm border-t border-border/50" {...props} />
    ),
    span: ({ node, ...props }) => <span {...props} />,
    ul: ({ node, ...props }) => (
        <ul className="list-disc space-y-4 mb-4 pl-6 text-[18px] [&_p]:!indent-0 [&_p]:mb-0" {...props} />
    ),
    ol: ({ node, ...props }) => (
        <ol className="list-decimal space-y-4 mb-4 pl-6 text-[18px] [&_p]:!indent-0 [&_p]:mb-0" {...props} />
    ),
    // 强制增加 marker 权重，使用 arbitrary variant 以确保生效
    li: ({ node, ...props }) => (
        <li className="text-[18px] leading-8 text-foreground/75 !indent-0 [&>p]:!indent-0 [&::marker]:!text-primary [&::marker]:!font-bold" {...props} />
    ),
    strong: ({ node, ...props }) => <strong className="text-primary" {...props} />,
};

/**
 * 案例内容的 Markdown 渲染组件
 * 复用统一的断法样式
 */
export const caseMarkdownComponents = duanfaMarkdownComponents;

/**
 * 作者介绍的 Markdown 渲染组件
 * 复用统一的断法样式
 */
export const authorMarkdownComponents = duanfaMarkdownComponents;
