/**
 * 断法正文内容组件 - MD 版本
 * 使用 ReactMarkdown 渲染，和八字/奇门案例保持一致
 */
import { useMemo } from 'react';
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
function parseHeadings(content: string): Map<string, string> {
    const lines = content.split(/\r?\n/);
    const headingMap = new Map<string, string>();
    let counter = 0;
    let skippedFirst = false;

    for (const line of lines) {
        const match = line.match(/^(#{1,3})\s+(.+)$/);
        if (match) {
            const level = match[1].length;
            const title = match[2].trim();

            // 跳过第一个一级标题
            if (level === 1 && !skippedFirst) {
                skippedFirst = true;
                continue;
            }

            // 使用标题文本作为 key，id 作为 value
            headingMap.set(title, `duanfa-heading-${counter}`);
            counter++;
        }
    }

    return headingMap;
}

export default function DuanFaContent({ content, title }: DuanFaContentProps) {
    // 预解析标题，生成稳定的 id 映射
    const headingIdMap = useMemo(() => parseHeadings(content), [content]);

    if (!content) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground/50">
                <span className="font-serif">暂无内容</span>
            </div>
        );
    }

    // 移除第一个 # 标题（页面标题会单独显示）
    const processedContent = content.replace(/^#\s+[^\n\r]+[\n\r]?/, '');

    // 自定义渲染器，使用预解析的 id 映射
    const components: Components = {
        ...duanfaMarkdownComponents,
        h1: ({ node, children, ...props }) => {
            const text = String(children);
            const id = headingIdMap.get(text) || `h1-${text.substring(0, 10)}`;
            return (
                <div className="mt-8 mb-6 scroll-mt-8" id={id}>
                    <h1 className="text-xl font-bold text-primary inline-block" {...props}>{children}</h1>
                    <div className="w-full h-0.5 bg-primary/30 mt-2 rounded-full" />
                </div>
            );
        },
        h2: ({ node, children, ...props }) => {
            const text = String(children);
            const id = headingIdMap.get(text) || `h2-${text.substring(0, 10)}`;
            return (
                <div className="mt-6 mb-4 scroll-mt-8" id={id}>
                    <h2 className="text-lg font-bold text-primary/80 inline-block" {...props}>{children}</h2>
                    <div className="w-full h-0.5 bg-primary/20 mt-1.5 rounded-full" />
                </div>
            );
        },
        h3: ({ node, children, ...props }) => {
            const text = String(children);
            const id = headingIdMap.get(text) || `h3-${text.substring(0, 10)}`;
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
                {/* 页面标题 */}
                <h1 className="text-2xl font-serif font-bold text-center text-primary/90 pb-4 border-b border-border/40">
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
