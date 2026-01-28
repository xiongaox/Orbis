/**
 * CaseStudy 模块 - Markdown 渲染器配置
 * 共享的 ReactMarkdown components 配置
 */
import type { Components } from 'react-markdown';

export const duanfaHeadingStyles = {
    h1: {
        wrapper: 'not-prose mt-10 mb-6',
        title: 'text-2xl font-bold tracking-tight text-foreground',
        underline: 'w-full h-1 bg-gradient-to-r from-primary/70 via-primary/25 to-transparent mt-2 rounded-full',
    },
    h2: {
        wrapper: 'not-prose mt-8 mb-4',
        row: 'flex items-center gap-3',
        marker: 'h-5 w-1.5 bg-primary/60 rounded-full',
        title: 'text-lg font-semibold tracking-tight text-foreground',
    },
    h3: {
        wrapper: 'not-prose mt-6 mb-3',
        row: 'flex items-center gap-2',
        marker: 'h-1.5 w-1.5 bg-primary/55 rounded-full',
        title: 'text-base font-semibold text-foreground/90',
    },
} as const;

/**
 * 断法内容的 Markdown 渲染组件 (优化版列表样式: 无缩进、大间距、高亮序号)
 * 这是基础样式组件，其他配置都复用此样式以保持全站统一
 */
export const duanfaMarkdownComponents: Components = {
    h1: ({ node, children, ...props }) => {
        const { className, ...rest } = props;
        return (
            <div className={duanfaHeadingStyles.h1.wrapper}>
                <h1 className={[duanfaHeadingStyles.h1.title, className].filter(Boolean).join(' ')} {...rest}>{children}</h1>
                <div className={duanfaHeadingStyles.h1.underline} aria-hidden="true" />
            </div>
        );
    },
    h2: ({ node, children, ...props }) => {
        const { className, ...rest } = props;
        return (
            <div className={duanfaHeadingStyles.h2.wrapper}>
                <div className={duanfaHeadingStyles.h2.row}>
                    <div className={duanfaHeadingStyles.h2.marker} aria-hidden="true" />
                    <h2 className={[duanfaHeadingStyles.h2.title, className].filter(Boolean).join(' ')} {...rest}>{children}</h2>
                </div>
            </div>
        );
    },
    h3: ({ node, children, ...props }) => {
        const { className, ...rest } = props;
        return (
            <div className={duanfaHeadingStyles.h3.wrapper}>
                <div className={duanfaHeadingStyles.h3.row}>
                    <div className={duanfaHeadingStyles.h3.marker} aria-hidden="true" />
                    <h3 className={[duanfaHeadingStyles.h3.title, className].filter(Boolean).join(' ')} {...rest}>{children}</h3>
                </div>
            </div>
        );
    },
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
    hr: ({ node, ...props }) => <hr className="my-8 border-t border-border" {...props} />,
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
