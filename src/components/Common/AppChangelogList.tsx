/**
 * 模块定位：
 * - 更新日志版本卡片列表（移动端二级页与桌面端弹窗共用），数据源 src/lib/appChangelog.ts
 * - previewCount 传入时每卡只展示前 N 条并提示点击查看全部，配合 onEntryClick 在调用方
 *   弹全量；不传则每卡展示完整条目、无点击行为
 */
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
