/**
 * CaseStudy 模块 - Markdown 渲染器配置
 * 共享的 ReactMarkdown components 配置
 */
import type { Components } from 'react-markdown';

export const duanfaHeadingStyles = {
    h1: {
        wrapper: 'not-prose mt-6 mb-4 lg:mt-10 lg:mb-6',
        title: 'text-xl lg:text-3xl font-bold tracking-tight text-foreground',
        underline: 'w-full h-0.5 lg:h-1 bg-gradient-to-r from-primary/70 via-primary/25 to-transparent mt-1.5 lg:mt-2 rounded-full',
    },
    h2: {
        wrapper: 'not-prose mt-5 mb-3 lg:mt-8 lg:mb-4',
        row: 'flex items-center gap-2 lg:gap-3',
        marker: 'h-4 w-1 lg:h-5 lg:w-1.5 bg-primary/60 rounded-full',
        title: 'text-lg lg:text-2xl font-semibold tracking-tight text-foreground',
    },
    h3: {
        wrapper: 'not-prose mt-4 mb-2 lg:mt-6 lg:mb-3',
        row: 'flex items-center gap-1.5 lg:gap-2',
        marker: 'h-2.5 w-2.5 lg:h-3 lg:w-3 bg-primary/80 rotate-45 rounded-[1px]',
        title: 'text-base lg:text-xl font-semibold text-foreground/90',
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
        <p className="mb-3 lg:mb-4 text-justify text-[16px] lg:text-[18px] leading-7 lg:leading-8 indent-6 lg:indent-8 text-foreground/75" {...props} />
    ),
    blockquote: ({ node, ...props }) => (
        <blockquote
            className="border-l-4 border-primary/40 pl-4 pr-4 py-3 my-4 lg:pl-6 lg:pr-6 lg:py-4 lg:my-6 bg-primary/10 dark:bg-primary/5 rounded-r-lg text-sm lg:text-[16px] font-medium text-foreground/70 leading-relaxed [&>p]:indent-0 [&>p]:mb-3 [&>p:last-child]:mb-0 space-y-2"
            {...props}
        />
    ),
    table: ({ node, ...props }) => (
        <div className="overflow-x-auto my-4 lg:my-8 rounded-lg border border-border/50 shadow-sm">
            <table className="w-full text-left border-collapse table-fixed" {...props} />
        </div>
    ),
    th: ({ node, ...props }) => (
        <th className="px-3 py-2.5 lg:px-6 lg:py-4 bg-primary/5 text-sm lg:text-base font-bold text-foreground border-b border-r border-border/50 last:border-r-0 whitespace-nowrap" {...props} />
    ),
    td: ({ node, ...props }) => (
        <td className="px-3 py-2.5 lg:px-6 lg:py-4 text-sm lg:text-base text-foreground/80 border-b border-r border-border/40 last:border-r-0" {...props} />
    ),
    span: ({ node, ...props }) => <span {...props} />,
    ul: ({ node, ...props }) => (
        <ul className="list-disc space-y-3 lg:space-y-4 mb-3 lg:mb-4 pl-5 lg:pl-6 text-[16px] lg:text-[18px] [&_p]:!indent-0 [&_p]:mb-0 [&_li::marker]:!text-primary/50" {...props} />
    ),
    ol: ({ node, ...props }) => (
        <ol className="list-decimal space-y-3 lg:space-y-4 mb-3 lg:mb-4 pl-5 lg:pl-6 text-[16px] lg:text-[18px] [&_p]:!indent-0 [&_p]:mb-0 [&_li::marker]:!text-primary/50" {...props} />
    ),
    // 强制增加 marker 权重，使用 arbitrary variant 以确保生效
    li: ({ node, ...props }) => (
        <li className="text-[16px] lg:text-[18px] leading-7 lg:leading-8 text-foreground/75 !indent-0 [&>p]:!indent-0 [&::marker]:!font-bold" {...props} />
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
