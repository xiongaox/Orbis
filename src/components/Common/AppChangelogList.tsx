/**
 * 模块定位：
 * - 更新日志展示组件，数据源 src/lib/appChangelog.ts
 * - 默认导出：版本卡片列表（移动端二级页使用）。previewCount 传入时每卡只展示前 N 条
 *   并提示点击查看全部，配合 onEntryClick 在调用方弹全量；不传则每卡展示完整条目、无点击行为
 * - 具名导出 AppChangelogSplitView：桌面端弹窗的左右分栏视图（左栏版本号、右栏所选版本
 *   完整日志），窄容器（<sm）自动退化为卡片列表
 */
import { useState } from 'react';
import { APP_CHANGELOG, type AppChangelogEntry } from '../../lib/appChangelog';

/** 日志条目渲染：【标签】前缀单独高亮 */
export function ChangelogItems({ items }: { items: string[] }) {
    return (
        <ul className="space-y-1.5">
            {items.map((item) => {
                const match = item.match(/^【(.+?)】(.*)$/);
                return (
                    <li key={item} className="flex gap-1.5 text-[12.5px] leading-relaxed text-foreground/90">
                        {match ? (
                            <>
                                <span className="shrink-0 font-medium">【{match[1]}】</span>
                                <span>{match[2]}</span>
                            </>
                        ) : (
                            <span>{item}</span>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

interface AppChangelogListProps {
    /** 每张卡片最多展示的条目数；不传则展示全部 */
    previewCount?: number;
    /** 传入后卡片可点击（用于弹出单版本全量日志） */
    onEntryClick?: (entry: AppChangelogEntry) => void;
}

export default function AppChangelogList({ previewCount, onEntryClick }: AppChangelogListProps) {
    return (
        <>
            {APP_CHANGELOG.map((entry) => {
                const truncated = typeof previewCount === 'number' && entry.items.length > previewCount;
                const card = (
                    <>
                        <div className="flex items-baseline justify-between">
                            <span className="font-serif text-base font-bold text-primary">{entry.version}</span>
                            <span className="text-[11px] text-muted-foreground">{entry.date}</span>
                        </div>
                        <div className="mt-2">
                            <ChangelogItems items={truncated ? entry.items.slice(0, previewCount) : entry.items} />
                        </div>
                        {truncated && (
                            <div className="mt-2 text-[11px] text-muted-foreground">共 {entry.items.length} 条 · 点击查看全部</div>
                        )}
                    </>
                );
                return onEntryClick ? (
                    <button
                        key={entry.version}
                        type="button"
                        onClick={() => onEntryClick(entry)}
                        className="w-full text-left rounded-xl border border-border bg-card p-3.5 transition-colors hover:bg-secondary/40 focus-ring cursor-pointer"
                    >
                        {card}
                    </button>
                ) : (
                    <div key={entry.version} className="rounded-xl border border-border bg-card p-3.5">
                        {card}
                    </div>
                );
            })}
        </>
    );
}

/**
 * 桌面端分栏视图：默认选中最新版本，左栏切换版本时右栏滚动位置随 key 重置回顶部。
 * 版本列表非空由数据源保证（APP_CHANGELOG 常量），空数组时整体不渲染。
 */
export function AppChangelogSplitView() {
    const [selected, setSelected] = useState<AppChangelogEntry | null>(null);
    const current = selected ?? APP_CHANGELOG[0];
    if (!current) return null;
    return (
        <>
            <div className="sm:hidden p-4 space-y-3">
                <AppChangelogList />
            </div>
            <div className="hidden sm:flex h-[60vh] max-h-[600px] min-h-[360px]">
                <nav aria-label="版本列表" className="w-28 sm:w-32 shrink-0 overflow-y-auto border-r border-border p-2 space-y-1">
                    {APP_CHANGELOG.map((entry) => {
                        const active = entry.version === current.version;
                        return (
                            <button
                                key={entry.version}
                                type="button"
                                onClick={() => setSelected(entry)}
                                aria-current={active || undefined}
                                className={`w-full rounded-lg px-2.5 py-2 text-left transition-colors focus-ring ${
                                    active ? 'bg-primary/10' : 'hover:bg-secondary/50'
                                }`}
                            >
                                <span className={`block font-serif text-[13px] font-bold leading-5 ${active ? 'text-primary' : 'text-foreground'}`}>
                                    {entry.version}
                                </span>
                                <span className="block mt-0.5 font-mono text-[10px] text-muted-foreground">{entry.date}</span>
                            </button>
                        );
                    })}
                </nav>
                <div key={current.version} className="flex-1 min-w-0 overflow-y-auto px-5 py-4">
                    <div className="flex items-baseline justify-between gap-3 pb-3 mb-3 border-b border-border">
                        <span className="font-serif text-lg font-bold text-primary">{current.version}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">{current.date}</span>
                    </div>
                    <ChangelogItems items={current.items} />
                </div>
            </div>
        </>
    );
}
