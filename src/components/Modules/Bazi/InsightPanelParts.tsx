/**
 * InsightPanelParts - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：承载具体业务模块的前端功能
 *
 * 关键职责：
 * - 渲染 UI 视图并处理交互逻辑
 * - 处理用户输入与展示边界行为
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `TianGanHighlight`, `TouCangHighlight`, `MarkdownText`, `DitiansuitYuanwen`, `LogicAnalysisCard`, `CollapsibleSection`
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `react`、内部模块 `baziJichuMap`、外部依赖 `lucide-react`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */
import type { ReactNode } from 'react';
import { TIAN_GAN } from '../../../lib/xuan-bazi/maps/baziJichuMap';
import { BookOpen } from 'lucide-react';

// 天干列表
const tianGanList = TIAN_GAN;

/**
 * 天干高亮组件
 * 将文本中的天干字符高亮显示
 */
export function TianGanHighlight({ text }: { text: string }) {
    const chars = text.split('');
    return (
        <>
            {chars.map((char, index) => {
                if (tianGanList.includes(char as typeof tianGanList[number])) {
                    return (
                        <span
                            key={index}
                            className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium rounded-md border border-primary/50 text-primary bg-primary/10"
                        >
                            {char}
                        </span>
                    );
                }
                return null; // 忽略非天干字符
            })}
        </>
    );
}

/**
 * 透藏高亮组件
 * 渲染"透X 藏Y"格式的文本
 */
export function TouCangHighlight({ text }: { text: string }) {
    const parts = text.split(' ').filter(Boolean);
    return (
        <>
            {parts.map((part, index) => {
                if (part.startsWith('透')) {
                    const gans = part.slice(1).split('');
                    return (
                        <span key={index} className="inline-flex items-center gap-1">
                            <span className="text-xs font-bold text-foreground mr-0.5">
                                透
                            </span>
                            {gans.map((gan, i) => (
                                <span
                                    key={i}
                                    className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium rounded-md border border-primary/50 text-primary bg-primary/10"
                                >
                                    {gan}
                                </span>
                            ))}
                        </span>
                    );
                } else if (part.startsWith('藏')) {
                    const gans = part.slice(1).split('');
                    return (
                        <span key={index} className="inline-flex items-center gap-1 ml-3">
                            <span className="text-xs font-bold text-foreground mr-0.5">
                                藏
                            </span>
                            {gans.map((gan, i) => (
                                <span
                                    key={i}
                                    className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium rounded-md border border-primary/50 text-primary bg-primary/10"
                                >
                                    {gan}
                                </span>
                            ))}
                        </span>
                    );
                }
                return <span key={index}>{part}</span>;
            })}
        </>
    );
}

/**
 * Markdown 文本渲染器
 * 支持 **粗体** 语法
 */
export function MarkdownText({ text }: { text: string }) {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                        <span key={i} className="font-bold text-foreground">
                            {part.slice(2, -2)}
                        </span>
                    );
                }
                return <span key={i}>{part}</span>;
            })}
        </>
    );
}

/**
 * 滴天髓原文区块
 */
interface DitiansuitYuanwenProps {
    poem?: string;
    explanation?: string[];
}

export function DitiansuitYuanwen({ poem, explanation }: DitiansuitYuanwenProps) {
    return (
        <div className="space-y-4">
            {/* 诗诀 */}
            <div className="bg-secondary/30 rounded-lg border border-border p-4">
                <p className="text-sm text-foreground leading-relaxed font-serif">
                    {poem}
                </p>
            </div>
            {/* 原注与任氏曰 */}
            {explanation && explanation.length > 0 && (
                <div className="bg-secondary/30 rounded-lg border border-border">
                    <div className="p-3 border-b border-border/50">
                        <span className="text-sm font-medium text-foreground flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-accent" />
                            原注与任氏曰
                        </span>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {explanation.map((point, index) => (
                            <div
                                key={index}
                                className={`px-4 py-3 text-sm text-muted-foreground leading-relaxed ${index > 0 ? 'border-t border-border/30 pt-3' : ''}`}
                            >
                                {point}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * 滴天髓逻辑解析卡片
 */
interface LogicAnalysisCardProps {
    segment: string;
    tags: string[];
    reasoning: string;
    modern: string;
}

export function LogicAnalysisCard({ segment, tags, reasoning, modern }: LogicAnalysisCardProps) {
    return (
        <div className="bg-secondary/30 rounded-lg border border-border p-4 space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{segment}</span>
            </div>
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {tags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/20">
                            {tag}
                        </span>
                    ))}
                </div>
            )}
            {reasoning && (
                <p className="text-sm text-muted-foreground leading-relaxed">{reasoning}</p>
            )}
            {modern && (
                <div className="text-sm text-foreground font-bold bg-secondary/50 rounded p-2 border-l-2 border-muted-foreground/30">
                    💡 {modern}
                </div>
            )}
        </div>
    );
}

/**
 * 可折叠区块
 */
interface CollapsibleSectionProps {
    title: string;
    icon: ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    children: ReactNode;
}

export function CollapsibleSection({ title, icon, isOpen, onToggle, children }: CollapsibleSectionProps) {
    return (
        <div className="bg-secondary/30 rounded-lg border border-border">
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center justify-between p-3 text-left"
            >
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                    {icon}
                    {title}
                </span>
                <svg
                    className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && (
                <div className="px-3 pb-3">
                    {children}
                </div>
            )}
        </div>
    );
}
