/**
 * 关键职责：
 * - 字段排序按钮（两键合一的紧凑形态）：
 *   · 左侧主体（字段名 + ▾）点开选择界面，单选排序字段（含「默认」= 新建顺序）
 *   · 右侧独立箭头（↑/↓）一键切换升/降序（桌面端显示；移动端在选择板内切换）
 * - 桌面端：锚定按钮的下拉菜单；移动端：底部选择板（与 AI 助手页/王衰面板同款，
 *   遮罩 + 圆角顶板 + 拖拽指示条 + 44px 触控行，portal 到 body 避免被弹窗 transform 锚定）
 * - 按钮直接显示当前生效的「字段 + 方向」；field 为 null 表示默认顺序
 * - 供案例列表侧栏（BaseCaseList.extraActions）使用；案例库弹窗不提供自定义排序，
 *   顺序一律为数据源的新建顺序
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpDown, Check, ChevronDown } from 'lucide-react';
import { useLayoutMode } from '../../hooks/useLayoutMode';

export interface SortOption {
    id: string;
    label: string;
}

export interface SortState {
    /** 当前排序字段；null = 默认（数据源默认序） */
    field: string | null;
    dir: 'asc' | 'desc';
}

interface SortFieldButtonProps {
    options: SortOption[];
    value: SortState;
    onChange: (next: SortState) => void;
    /** 按钮样式覆写（侧栏窄按钮 / 弹窗标准按钮） */
    className?: string;
}

const DEFAULT_CLASS = 'flex items-center gap-1 px-2.5 py-2 bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg text-sm font-medium transition-colors border border-border focus-ring';

export default function SortFieldButton({ options, value, onChange, className = DEFAULT_CLASS }: SortFieldButtonProps) {
    const [open, setOpen] = useState(false);
    const { isMobile } = useLayoutMode();
    const current = options.find((o) => o.id === value.field);
    const close = () => setOpen(false);

    const pickField = (field: string | null) => {
        onChange({ field, dir: value.dir });
        close();
    };

    const dirButtonClass = (dir: 'asc' | 'desc') =>
        `flex-1 min-h-11 rounded-xl text-sm font-medium border transition-colors ${value.field === null
            ? 'opacity-40 cursor-not-allowed border-border text-muted-foreground'
            : value.dir === dir
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
        }`;

    // 选项行：移动端选择板贴 AiChatDrawer 标准（px-3 py-3 大触控行 + border-b 分隔线）；
    // 桌面下拉保持紧凑小行
    const rowClass = (active: boolean, inSheet: boolean) => inSheet
        ? `w-full flex items-center justify-between gap-2 px-3 py-3 text-left text-sm border-b border-border/40 last:border-b-0 transition-colors cursor-pointer ${active
            ? 'text-primary font-medium'
            : 'text-foreground hover:bg-muted/50'
        }`
        : `w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-md transition-colors ${active
            ? 'bg-primary/10 text-primary'
            : 'text-foreground hover:bg-sidebar-accent/60'
        }`;

    const rows = (inSheet: boolean) => (
        <>
            <button type="button" onClick={() => pickField(null)} className={rowClass(value.field === null, inSheet)}>
                <span>默认</span>
                {value.field === null && <Check className={inSheet ? 'w-4 h-4 shrink-0' : 'w-3 h-3'} />}
            </button>
            {options.map((option) => (
                <button
                    key={option.id}
                    type="button"
                    onClick={() => pickField(option.id)}
                    className={rowClass(value.field === option.id, inSheet)}
                >
                    <span className="truncate">{option.label}</span>
                    <span className="flex items-center gap-1">
                        {value.field === option.id && (
                            <span className="text-[11px] leading-none">{value.dir === 'asc' ? '↑' : '↓'}</span>
                        )}
                        {value.field === option.id && <Check className={inSheet ? 'w-4 h-4 shrink-0' : 'w-3 h-3'} />}
                    </span>
                </button>
            ))}
        </>
    );

    return (
        <div className="relative">
            <div className={className}>
                {/* 主体：打开选择界面选字段 */}
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    aria-haspopup="menu"
                    className="flex items-center gap-1 outline-none focus-visible:underline"
                    title="选择排序字段"
                >
                    {!current && <ArrowUpDown className="w-3.5 h-3.5" />}
                    <span className="whitespace-nowrap">{current ? current.label : '排序'}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {/* 右侧箭头：一键切升/降（触控目标偏小，仅桌面端显示；移动端在选择板内切换） */}
                {current && !isMobile && (
                    <button
                        type="button"
                        onClick={() => onChange({ field: value.field, dir: value.dir === 'asc' ? 'desc' : 'asc' })}
                        className="-mr-1 flex items-center px-1 border-l border-border/60 outline-none focus-visible:underline"
                        title={value.dir === 'asc' ? '当前升序，点击改降序' : '当前降序，点击改升序'}
                    >
                        <span className="text-[12px] leading-none">{value.dir === 'asc' ? '↑' : '↓'}</span>
                    </button>
                )}
            </div>

            {/* 移动端：底部选择板（同款交互，portal 到 body） */}
            {open && isMobile && createPortal(
                <>
                    <div className="fixed inset-0 z-[110] bg-black/55" onClick={close} />
                    <div
                        className="fixed left-0 right-0 bottom-0 z-[115] bg-popover border-t border-border rounded-t-2xl"
                        style={{ paddingBottom: 'calc(10px + var(--safe-area-inset-bottom, 0px))' }}
                    >
                        <div className="w-9 h-1 rounded-full bg-border mx-auto mt-2.5" />
                        <div className="max-h-[46vh] overflow-y-auto px-2 pt-2 pb-1">
                            {rows(true)}
                        </div>
                        {/* 方向切换：44px 触控目标，未选字段时禁用 */}
                        <div className="flex gap-2 px-4 pt-2 pb-1 border-t border-border/40">
                            <button
                                type="button"
                                disabled={value.field === null}
                                onClick={() => onChange({ ...value, dir: 'asc' })}
                                className={dirButtonClass('asc')}
                            >
                                升序 ↑
                            </button>
                            <button
                                type="button"
                                disabled={value.field === null}
                                onClick={() => onChange({ ...value, dir: 'desc' })}
                                className={dirButtonClass('desc')}
                            >
                                降序 ↓
                            </button>
                        </div>
                    </div>
                </>,
                document.body
            )}

            {/* 桌面端：锚定按钮的下拉菜单 */}
            {open && !isMobile && (
                <>
                    <div className="fixed inset-0 z-40" onClick={close} />
                    <div className="absolute left-0 top-full mt-1 z-50 w-36 bg-sidebar border border-sidebar-border rounded-lg shadow-lg p-2 space-y-0.5">
                        {rows(false)}
                    </div>
                </>
            )}
        </div>
    );
}
