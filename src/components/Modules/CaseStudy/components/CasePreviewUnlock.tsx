/**
 * CasePreviewUnlock - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：案例库未激活（试读）状态下的解锁引导
 *
 * 关键职责：
 * - 正文形态：试读片段结束后说明可读范围并给出激活入口
 * - 面板形态：提示排盘、大运流年等需激活后查看
 *
 * 依赖关系：
 * - 上游依赖：外部依赖 `lucide-react`
 * - 下游影响：由 CaseStudy 三种布局在试读状态下渲染
 */

import { KeyRound, Lock } from 'lucide-react';

interface CasePreviewUnlockProps {
    variant?: 'article' | 'panel';
    /** 当前试读字数 */
    previewChars?: number;
    /** 本篇全文约字数 */
    fullChars?: number;
    /** 全库篇数 */
    libraryTotal: number;
    onActivate: () => void;
}

const ACTIVATE_LABEL = '激活并解锁完整案例库';

export default function CasePreviewUnlock({
    variant = 'article',
    previewChars,
    fullChars,
    libraryTotal,
    onActivate,
}: CasePreviewUnlockProps) {
    if (variant === 'panel') {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                <Lock className="w-12 h-12 opacity-20 text-muted-foreground" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                    排盘图需激活后查看
                </p>
                <p className="text-xs text-muted-foreground/70 leading-relaxed">
                    八字排盘、大运流年与奇门盘面
                </p>
                <button
                    type="button"
                    onClick={onActivate}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                    <KeyRound className="w-3.5 h-3.5" />
                    激活解锁
                </button>
            </div>
        );
    }

    const scopeText = fullChars && fullChars > 0
        ? `本篇全文约 ${fullChars} 字，当前可试读 ${previewChars ?? 0} 字。`
        : '以上为试读内容。';

    return (
        <div className="rounded-lg border border-primary/25 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">试读到此结束</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
                {scopeText}激活后可阅读全部 {libraryTotal} 篇案例，并查看八字排盘、大运流年与奇门盘面。
            </p>
            <button
                type="button"
                onClick={onActivate}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
                <KeyRound className="w-4 h-4" />
                {ACTIVATE_LABEL}
            </button>
            <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                离线加密案例库 · 一机一码专属授权 · 激活后无需联网
            </p>
        </div>
    );
}
