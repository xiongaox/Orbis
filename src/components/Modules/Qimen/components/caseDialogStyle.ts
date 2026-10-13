/**
 * 案例正文的展示常量：说话人标签与气泡样式。
 *
 * 单独成文件而不是放在组件里——组件文件只导出组件，
 * 混着导出常量会破坏 fast refresh（react-refresh/only-export-components）。
 */
import type { CaseDialogKind } from '../../../Common/caseDialog';

/** 按钮与记录行都按「谁在说」来标：前两档是说话人，断法是测算师给出的结论 */
export const MODE_LABEL: Record<CaseDialogKind, string> = { q: '求测人', a: '测算师', r: '断法' };

/**
 * 气泡样式：左右分栏之后「谁在说」主要靠位置和底色区分，
 * 圆点退成标签前的小标记；断法单独一档——主色虚框，跟测算师的实心气泡拉开。
 */
export const KIND_STYLE: Record<CaseDialogKind, { dot: string; text: string; box: string; label: string }> = {
    q: {
        dot: 'bg-primary',
        text: 'text-foreground',
        box: 'rounded-2xl rounded-tl-sm border border-border bg-muted/50',
        label: 'text-muted-foreground',
    },
    a: {
        dot: 'bg-muted-foreground/50',
        text: 'text-foreground',
        box: 'rounded-2xl rounded-tr-sm border border-border bg-card',
        label: 'text-muted-foreground',
    },
    r: {
        dot: 'bg-primary ring-2 ring-primary/25',
        text: 'font-medium text-primary',
        box: 'rounded-2xl rounded-tr-sm border border-dashed border-primary/40 bg-primary/5',
        label: 'text-primary',
    },
};
