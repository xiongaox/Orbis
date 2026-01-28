import { useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import type { Components } from 'react-markdown';
import { duanfaHeadingStyles, duanfaMarkdownComponents } from './MarkdownRenderers';
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
const DuanFaContent = forwardRef<HTMLDivElement, DuanFaContentProps>(({ content, title, onOutlineChange }, ref) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // 暴露滚动容器给父组件
    useImperativeHandle(ref, () => scrollContainerRef.current as HTMLDivElement);

    // 仅当正文首行 H1 与页面标题一致时，才视作“重复标题”并移除。
    // 注意：断法文章会把原 h2/h3 提级写回 Markdown 源文件，因此正文可能以多个 H1 章节开头，不能一概移除。
    const leadingH1Text = useMemo(() => {
        const match = content.match(/^#\s+([^\n\r]+)/);
        return match?.[1]?.trim() || '';
    }, [content]);

    const hasTitleH1 = leadingH1Text.length > 0 && leadingH1Text === title.trim();

    // 移除第一个 # 标题（页面标题会单独显示）
    const processedContent = hasTitleH1 ? content.replace(/^#\s+[^\n\r]+[\n\r]?/, '') : content;

    // 为每个 Markdown 标题行分配稳定 id（StrictMode 下渲染函数可能会被调用两次，避免用自增计数产生副作用）。
    // 约定：如果正文首行是与页面标题重复的 H1（会被移除并用页面标题展示），则页面标题占用 duanfa-heading-0，正文标题从 1 开始。
    const headingLineIdMap = useMemo(() => {
        const map = new Map<number, string>();
        const lines = processedContent.split(/\r?\n/);
        let counter = hasTitleH1 ? 1 : 0;

        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(/^(#{1,6})\s+(.+)$/);
            if (!match) continue;
            map.set(i + 1, `duanfa-heading-${counter}`);
            counter++;
        }
        return map;
    }, [hasTitleH1, processedContent]);

    // 自定义渲染器，为标题添加标记用于大纲生成
    const components: Components = {
        ...duanfaMarkdownComponents,
        h1: ({ node, children, ...props }) => {
            const line = node?.position?.start?.line;
            const id = typeof line === 'number' ? headingLineIdMap.get(line) : undefined;
            const { className, ...rest } = props;
            return (
                <div
                    id={id}
                    className={`${duanfaHeadingStyles.h1.wrapper} scroll-mt-8`}
                    data-duanfa-heading="true"
                    data-heading-level="1"
                >
                    <h1 className={[duanfaHeadingStyles.h1.title, className].filter(Boolean).join(' ')} {...rest}>{children}</h1>
                    <div className={duanfaHeadingStyles.h1.underline} aria-hidden="true" />
                </div>
            );
        },
        h2: ({ node, children, ...props }) => {
            const line = node?.position?.start?.line;
            const id = typeof line === 'number' ? headingLineIdMap.get(line) : undefined;
            const { className, ...rest } = props;
            return (
                <div
                    id={id}
                    className={`${duanfaHeadingStyles.h2.wrapper} scroll-mt-8`}
                    data-duanfa-heading="true"
                    data-heading-level="2"
                >
                    <div className={duanfaHeadingStyles.h2.row}>
                        <div className={duanfaHeadingStyles.h2.marker} aria-hidden="true" />
                        <h2 className={[duanfaHeadingStyles.h2.title, className].filter(Boolean).join(' ')} {...rest}>{children}</h2>
                    </div>
                </div>
            );
        },
        h3: ({ node, children, ...props }) => {
            const line = node?.position?.start?.line;
            const id = typeof line === 'number' ? headingLineIdMap.get(line) : undefined;
            const { className, ...rest } = props;
            return (
                <div
                    id={id}
                    className={`${duanfaHeadingStyles.h3.wrapper} scroll-mt-8`}
                    data-duanfa-heading="true"
                    data-heading-level="3"
                >
                    <div className={duanfaHeadingStyles.h3.row}>
                        <div className={duanfaHeadingStyles.h3.marker} aria-hidden="true" />
                        <h3 className={[duanfaHeadingStyles.h3.title, className].filter(Boolean).join(' ')} {...rest}>{children}</h3>
                    </div>
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
            const id = element.id || `duanfa-heading-${index}`;
            if (!element.id) {
                element.id = id;
            }

            const level = Number(element.dataset.headingLevel) || 1;
            const titleText = (element.textContent || '').trim();

            return {
                id,
                title: titleText || '未命名标题',
                level,
            };
        });

        onOutlineChange(nextOutline);
    }, [content, title, hasTitleH1, onOutlineChange]);

    return (
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-8 scrollbar-none">
            {!content ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground/50">
                    <span className="font-serif">暂无内容</span>
                </div>
            ) : (
                <div ref={contentRef} className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
                    {/* 页面标题 - 对应第 0 个标题的 ID (仅当实际上有 H1 时) */}
                    <h1
                        id={hasTitleH1 ? 'duanfa-heading-0' : undefined}
                        data-duanfa-heading={hasTitleH1 ? 'true' : undefined}
                        data-heading-level={hasTitleH1 ? '1' : undefined}
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
});

DuanFaContent.displayName = 'DuanFaContent';
export default DuanFaContent;
