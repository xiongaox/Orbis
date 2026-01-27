/**
 * 断法正文内容组件 - MD 版本
 * 使用 ReactMarkdown 渲染，和八字/奇门案例保持一致
 */

import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import type { Components } from 'react-markdown';
import { duanfaMarkdownComponents } from './MarkdownRenderers';
import type { DuanFaOutlineItem } from '../../../../lib/caseStudy/duanfaData';

interface DuanFaContentProps {
    content: string;
    title: string;
    onOutlineChange: (outline: DuanFaOutlineItem[]) => void;
}

/**
 * 预解析内容，提取所有标题并分配 id
 * 这样可以确保每次渲染使用相同的 id
 */
export default function DuanFaContent({ content, title, onOutlineChange }: DuanFaContentProps) {
    const contentRef = useRef<HTMLDivElement>(null);

    // 检查是否以一级标题开头
    const hasH1 = /^#\s/.test(content);

    // 移除第一个 # 标题（页面标题会单独显示）
    const processedContent = content.replace(/^#\s+[^\n\r]+[\n\r]?/, '');

    // 自定义渲染器，为标题添加标记用于大纲生成
    const components: Components = {
        ...duanfaMarkdownComponents,
        h1: ({ node, children, ...props }) => {
            return (
                <div className="mt-8 mb-6 scroll-mt-8" data-duanfa-heading="true" data-heading-level="1">
                    <h1 className="text-xl font-bold text-primary inline-block" {...props}>{children}</h1>
                    <div className="w-full h-0.5 bg-primary/30 mt-2 rounded-full" />
                </div>
            );
        },
        h2: ({ node, children, ...props }) => {
            return (
                <div className="mt-6 mb-4 scroll-mt-8" data-duanfa-heading="true" data-heading-level="2">
                    <h2 className="text-lg font-bold text-primary/80 inline-block" {...props}>{children}</h2>
                    <div className="w-full h-0.5 bg-primary/20 mt-1.5 rounded-full" />
                </div>
            );
        },
        h3: ({ node, children, ...props }) => {
            return (
                <div className="mt-5 mb-3 scroll-mt-8" data-duanfa-heading="true" data-heading-level="3">
                    <h3 className="text-base font-bold text-primary/70 inline-block" {...props}>{children}</h3>
                </div>
            );
        },
    };

    useEffect(() => {
        if (!content) {
            onOutlineChange([]);
            return;
        }
        const root = contentRef.current;
        if (!root) return;

        const headingElements = Array.from(root.querySelectorAll<HTMLElement>('[data-duanfa-heading]'));
        if (headingElements.length === 0) {
            onOutlineChange([]);
            return;
        }

        const nextOutline = headingElements.map((element, index) => {
            const id = `duanfa-heading-${index}`;
            element.id = id;

            const level = Number(element.dataset.headingLevel) || 1;
            const titleText = (element.textContent || '').trim();

            return {
                id,
                title: titleText || '未命名标题',
                level,
            };
        });

        onOutlineChange(nextOutline);
    }, [content, title, hasH1, onOutlineChange]);

    return (
        <div className="flex-1 overflow-y-auto p-8 scrollbar-none">
            {!content ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground/50">
                    <span className="font-serif">暂无内容</span>
                </div>
            ) : (
                <div ref={contentRef} className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
                {/* 页面标题 - 对应第 0 个标题的 ID (仅当实际上有 H1 时) */}
                <h1
                    data-duanfa-heading={hasH1 ? 'true' : undefined}
                    data-heading-level={hasH1 ? '1' : undefined}
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
            )}
        </div>
    );
}
