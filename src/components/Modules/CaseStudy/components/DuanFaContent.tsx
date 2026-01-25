/**
 * 断法正文内容组件 - MD 版本
 * 使用 ReactMarkdown 渲染，和八字/奇门案例保持一致
 */

import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import type { Components } from 'react-markdown';
import { duanfaMarkdownComponents } from './MarkdownRenderers';

interface DuanFaContentProps {
    content: string;
    title: string;
}

/**
 * 预解析内容，提取所有标题并分配 id
 * 这样可以确保每次渲染使用相同的 id
 */
export default function DuanFaContent({ content, title }: DuanFaContentProps) {
    if (!content) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground/50">
                <span className="font-serif">暂无内容</span>
            </div>
        );
    }

    // 检查是否以一级标题开头
    const hasH1 = /^#\s/.test(content);

    // 移除第一个 # 标题（页面标题会单独显示）
    const processedContent = content.replace(/^#\s+[^\n\r]+[\n\r]?/, '');

    // 渲染计数器：如果移除了 H1 (ID=0)，则 Markdown 从 ID=1 开始渲染
    // 否则从 ID=0 开始
    let renderCounter = hasH1 ? 1 : 0;

    // 自定义渲染器，使用顺序计数器生成 ID
    const components: Components = {
        ...duanfaMarkdownComponents,
        h1: ({ node, children, ...props }) => {
            const id = `duanfa-heading-${renderCounter++}`;
            return (
                <div className="mt-8 mb-6 scroll-mt-8" id={id}>
                    <h1 className="text-xl font-bold text-primary inline-block" {...props}>{children}</h1>
                    <div className="w-full h-0.5 bg-primary/30 mt-2 rounded-full" />
                </div>
            );
        },
        h2: ({ node, children, ...props }) => {
            const id = `duanfa-heading-${renderCounter++}`;
            return (
                <div className="mt-6 mb-4 scroll-mt-8" id={id}>
                    <h2 className="text-lg font-bold text-primary/80 inline-block" {...props}>{children}</h2>
                    <div className="w-full h-0.5 bg-primary/20 mt-1.5 rounded-full" />
                </div>
            );
        },
        h3: ({ node, children, ...props }) => {
            const id = `duanfa-heading-${renderCounter++}`;
            return (
                <div className="mt-5 mb-3 scroll-mt-8" id={id}>
                    <h3 className="text-base font-bold text-primary/70 inline-block" {...props}>{children}</h3>
                </div>
            );
        },
    };

    return (
        <div className="flex-1 overflow-y-auto p-8 scrollbar-none">
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
                {/* 页面标题 - 对应第 0 个标题的 ID (仅当实际上有 H1 时) */}
                <h1
                    id={hasH1 ? "duanfa-heading-0" : undefined}
                    className="text-2xl font-serif font-bold text-center text-primary/90 pb-4 border-b border-border/40 scroll-mt-8"
                >
                    {title}
                </h1>

                {/* Markdown 内容 */}
                <div className="prose dark:prose-invert max-w-none text-foreground font-serif leading-relaxed">
                    <ReactMarkdown
                        rehypePlugins={[rehypeRaw]}
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                        components={components}
                    >
                        {processedContent}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    );
}
