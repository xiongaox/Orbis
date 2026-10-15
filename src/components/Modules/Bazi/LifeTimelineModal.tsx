/**
 * 模块定位：
 * - 主要目标：八字案例的「生平记事」 —— 把人生大事挂到大运 / 流年上，形成命主小传
 *
 * 关键职责：
 * - 时间轴（D1 排布）：大运为节点，节点下按年列出流年记录；时间是「元数据行」、正文独占一行
 * - 记一笔（C1 输入面板）：大运 / 流年用文字 tab 切换，时段用 ‹ › 步进（有序序列比翻列表顺手）
 *
 * 数据来源：
 * - 大运 / 流年由调用方用完整排盘算出后传入（案例只存简化排盘，不含大运流年）
 * - 只展示 index >= 0 的大运：出生前大运（覆盖出生前百年）记录与命主生平无关
 * - 流年有约 300 条（每段大运逐年生成），故采用「先选大运、再选流年」两级步进
 * - 起运前那一段的干支是数据层的字面量 '小运'，展示时按「起运前」处理
 *
 * 挂载约定（调用方条件渲染，不要用 isOpen 常驻挂载）：
 * - 每次打开都是新实例，选中时段 / 草稿等状态直接用初值初始化，无需 effect 重置
 * - 切换时段时的草稿回填也放在事件处理里，避免在 effect 里 setState（React 反模式）
 *
 * 写入时机：本弹窗只改草稿，随「编辑案例」的保存一并入库；取消编辑则整体丢弃
 */

import { useMemo, useState } from 'react';
import { X, ChevronLeft, ChevronRight, ChevronDown, Plus, Minus, ListFilter } from 'lucide-react';
import type { LifeEvent } from '../../../services/baziCaseService';
import { groupLifeEvents, defaultDayunCount, minDayunCount } from './lifeEvents';
import BaseModal from '../../UI/BaseModal';
import SubPage from '../../UI/SubPage';
import { useLayoutMode } from '../../../hooks/useLayoutMode';

/** bazi_data 里的结构子集（跨 JSON 边界，字段可能缺失） */
export interface DaYunLike {
    index?: number;
    startYear: number;
    endYear: number;
    startAge?: number;
    endAge?: number;
    ganZhi: string;
}

export interface LiuNianLike {
    year: number;
    age?: number;
    ganZhi: string;
}

interface LifeTimelineModalProps {
    onClose: () => void;
    daYun: DaYunLike[];
    liuNian: LiuNianLike[];
    /** 当前记录（受控，由编辑弹窗持有并随保存入库） */
    events: LifeEvent[];
    onChange: (events: LifeEvent[]) => void;
}

/** 起运前那一段没有干支，数据层用字面量 '小运' 占位，不能当成干支或大运展示 */
const isPreYun = (ganZhi: string) => ganZhi === '小运';

export default function LifeTimelineModal({
    onClose,
    daYun,
    liuNian,
    events,
    onChange,
}: LifeTimelineModalProps) {
    const { isMobile } = useLayoutMode();

    const currentYear = new Date().getFullYear();

    // 命主出生后的大运，按起始年升序
    const afterBirth = useMemo(
        () => daYun.filter((d) => (d.index ?? 0) >= 0).slice().sort((a, b) => a.startYear - b.startYear),
        [daYun],
    );

    // 打开时的定位：当前年份所在大运，找不到（如尚未起运）则退回第一段
    const initialDayun = useMemo(
        () => afterBirth.find((d) => currentYear >= d.startYear && currentYear <= d.endYear) ?? afterBirth[0],
        [afterBirth, currentYear],
    );
    const initialRef = initialDayun ? String(initialDayun.startYear) : '';
    /** 流年默认选当前年份（在数据里时），否则退回所属大运的第一年 */
    const initialLiunianRef = useMemo(() => {
        if (liuNian.some((l) => l.year === currentYear)) return String(currentYear);
        const first = liuNian.find((l) => initialDayun && l.year >= initialDayun.startYear && l.year <= initialDayun.endYear);
        return first ? String(first.year) : initialRef;
    }, [liuNian, initialDayun, currentYear, initialRef]);

    // 默认展示到 100 岁（已有记录与当前段必然纳入），更远的段用底部「新增大运」展开
    const [visibleCount, setVisibleCount] = useState(() => defaultDayunCount(afterBirth, events, currentYear));
    const [mode, setMode] = useState<'dayun' | 'liunian'>('dayun');
    const [dayunRef, setDayunRef] = useState(initialRef);
    const [liunianRef, setLiunianRef] = useState(initialLiunianRef);
    const [draft, setDraft] = useState(
        () => events.find((e) => e.kind === 'dayun' && e.ref === initialRef)?.text ?? '',
    );
    /** 时间轴上各段的折叠状态：没记录默认折叠，用户点过之后以用户的为准 */
    const [collapseOverride, setCollapseOverride] = useState<Record<number, boolean>>({});
    /** 只看有记事的段：把空大运收起来，视线直接落在写过内容的地方 */
    const [onlyWithEvents, setOnlyWithEvents] = useState(false);

    /** 有记事的段的起始年（记录按年份归到所属大运段） */
    const eventedStarts = useMemo(() => {
        const set = new Set<number>();
        for (const e of events) {
            const year = Number(e.ref);
            const period = afterBirth.find((d) => year >= d.startYear && year <= d.endYear);
            if (period) set.add(period.startYear);
        }
        return set;
    }, [events, afterBirth]);

    const rangeList = useMemo(() => {
        const base = afterBirth.slice(0, visibleCount);
        return onlyWithEvents ? base.filter((d) => eventedStarts.has(d.startYear)) : base;
    }, [afterBirth, visibleCount, onlyWithEvents, eventedStarts]);

    const activeDaYun = rangeList.find((d) => String(d.startYear) === dayunRef) ?? rangeList[0];
    /** 当前选中大运内的流年（流年 tab 的二级列表） */
    const scopedLiuNian = useMemo(
        () => (activeDaYun
            ? liuNian.filter((l) => l.year >= activeDaYun.startYear && l.year <= activeDaYun.endYear).sort((a, b) => a.year - b.year)
            : []),
        [activeDaYun, liuNian],
    );

    const ref = mode === 'dayun' ? dayunRef : liunianRef;
    const currentItem = mode === 'dayun'
        ? (activeDaYun
            ? {
                ganZhi: activeDaYun.ganZhi,
                label: `${activeDaYun.startYear}–${activeDaYun.endYear}`,
                meta: activeDaYun.startAge !== undefined && activeDaYun.endAge !== undefined ? `${activeDaYun.startAge}-${activeDaYun.endAge}岁` : '',
                typeLabel: isPreYun(activeDaYun.ganZhi) ? '起运前' : '大运',
            }
            : null)
        : (() => {
            const item = scopedLiuNian.find((l) => String(l.year) === liunianRef) ?? scopedLiuNian[0];
            return item
                ? { ganZhi: item.ganZhi, label: String(item.year), meta: item.age !== undefined ? `${item.age}岁` : '', typeLabel: '流年' }
                : null;
        })();

    /** 输入面板是否展开：打开时收起，点某个流年/切换到大运 tab 才出现，记下之后收起 */
    const [composerOpen, setComposerOpen] = useState(false);

    /** 切换选中时段：草稿在该时段的已存文本与空白之间切换（回填放这里，不放 effect） */
    const selectDayun = (nextRef: string) => {
        setDayunRef(nextRef);
        setLiunianRef(nextRef);
        setDraft(events.find((e) => e.kind === 'dayun' && e.ref === nextRef)?.text ?? '');
    };
    const selectLiunian = (nextRef: string) => {
        setLiunianRef(nextRef);
        setDraft(events.find((e) => e.kind === 'liunian' && e.ref === nextRef)?.text ?? '');
        setComposerOpen(true);
    };
    const selectMode = (nextMode: 'dayun' | 'liunian') => {
        setMode(nextMode);
        // 打开输入面板：大运 tab 直接展开（默认选中项明确），流年展开后由下面选中具体年份
        if (nextMode === 'dayun') setComposerOpen(true);
        // 切到流年时，若当前流年不在新大运范围内则退到该段第一年
        const nextRef = nextMode === 'dayun'
            ? dayunRef
            : String((scopedLiuNian.find((l) => String(l.year) === liunianRef) ?? scopedLiuNian[0])?.year ?? '');
        if (nextMode === 'liunian' && nextRef) {
            setComposerOpen(true);
            setLiunianRef(nextRef);
        }
        setDraft(nextRef ? events.find((e) => e.kind === nextMode && e.ref === nextRef)?.text ?? '' : '');
    };

    /** 切换「只看有记事」：开启后若当前选中的段被收起来了，把选中项挪到第一段，避免面板与列表不一致 */
    const toggleOnlyWithEvents = () => {
        const next = !onlyWithEvents;
        setOnlyWithEvents(next);
        if (!next) return;
        const filtered = afterBirth.slice(0, visibleCount).filter((d) => eventedStarts.has(d.startYear));
        if (filtered.length > 0 && !filtered.some((d) => String(d.startYear) === dayunRef)) {
            selectDayun(String(filtered[0].startYear));
        }
    };

    /** 大运步进（流年已改为平铺点选，不再需要步进） */
    const stepDayun = (dir: -1 | 1) => {
        const next = rangeList.findIndex((d) => String(d.startYear) === dayunRef) + dir;
        if (next < 0 || next >= rangeList.length) return;
        selectDayun(String(rangeList[next].startYear));
    };

    const commit = () => {
        if (!currentItem || !ref) return;
        const text = draft.trim();
        // 空文本不写入也不删除：删除走面板里的独立按钮，避免误触丢内容
        if (!text) return;
        const rest = events.filter((e) => !(e.kind === mode && e.ref === ref));
        onChange([...rest, { kind: mode, ref, ganZhi: currentItem.ganZhi, text }]);
        // 记完就把面板收起来，视线回到时间轴；再点某个流年/大运即重新展开
        setComposerOpen(false);
    };

    const removeEvent = (kind: LifeEvent['kind'], eventRef: string) => {
        onChange(events.filter((e) => !(e.kind === kind && e.ref === eventRef)));
        // 删掉的正是当前正在编辑的时段：草稿一并清空，避免「更新」时又把内容写回去
        if (kind === mode && eventRef === ref) setDraft('');
    };

    // 记录按大运节点分组（纯函数，见 lifeEvents.ts）
    const grouped = useMemo(() => groupLifeEvents(events, rangeList), [events, rangeList]);

    const hasRecord = (kind: LifeEvent['kind'], eventRef: string) => events.some((e) => e.kind === kind && e.ref === eventRef);

    /**
     * 记录的时间标注：流年标当年岁数，大运标该段岁数区间。
     * 数据层 LifeEvent 只存年份，岁数按年份回查大运 / 流年；查不到（改过出生时间）就不显示。
     */
    const eventAge = (event: LifeEvent) => {
        if (event.kind === 'liunian') {
            const age = liuNian.find((l) => String(l.year) === event.ref)?.age;
            return age !== undefined ? `${age}岁` : '';
        }
        const period = afterBirth.find((d) => String(d.startYear) === event.ref);
        if (period?.startAge !== undefined && period.endAge !== undefined) {
            return period.startAge === period.endAge ? `${period.startAge}岁` : `${period.startAge}-${period.endAge}岁`;
        }
        return '';
    };

    /** D1 条目：元数据行（干支 + 年份 + 岁数 + 删除）+ 正文行占满整宽 */
    const eventNode = (event: LifeEvent) => (
        <div
            key={`${event.kind}-${event.ref}`}
            className="rounded-r-lg border border-border/60 border-l-4 border-l-primary/60 px-2.5 py-2"
        >
            <div className="flex items-center gap-2 mb-1.5">
                <span className="font-serif font-semibold text-[14px] tracking-wide text-primary">{event.ganZhi}</span>
                <span className="font-mono text-[12px] tabular-nums text-muted-foreground">{event.ref}</span>
                {eventAge(event) && (
                    <span className="font-mono text-[12px] tabular-nums text-muted-foreground/70">{eventAge(event)}</span>
                )}
                {/* 删除按钮的点击区要够大（此前 p-0.5 + 14px 图标约 18px，手机上点不中）；
                    -mr-0.5 抵消卡片 px-2.5 与 py-2 的差值，使按钮到上边与到右边等距 */}
                <button
                    type="button"
                    onClick={() => removeEvent(event.kind, event.ref)}
                    aria-label="删除这条记录"
                    className="-mr-0.5 ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive focus-ring cursor-pointer"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            <div className="text-[13px] leading-relaxed text-foreground whitespace-pre-wrap break-words">{event.text}</div>
        </div>
    );

    const dayunStepIndex = rangeList.findIndex((d) => String(d.startYear) === dayunRef);

    // 正文：移动端 SubPage 与桌面端 BaseModal 共用
    const bodyContent = rangeList.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
            {afterBirth.length === 0
                ? '该案例尚无大运数据，请先保存一次排盘后再记录生平。'
                : '这些记录都落在当前大运范围之外，关掉「只看有记事」可以浏览全部大运。'}
        </div>
    ) : (
        <div className="relative pl-[22px]">
            {/* 贯通轴线：输入节点与下方各年龄节点共用同一条，避免两段线错位 */}
            <span className="pointer-events-none absolute left-[5px] top-2 bottom-1.5 w-px bg-border" />

            {/* 记一笔（C1）：实心圆点挂在同一条轴线上，文字 tab 切换大运/流年，‹ › 步进时段 */}
            <div className="relative mb-5">
                <div className="relative mb-2.5 flex items-center gap-3.5">
                    <span className="pointer-events-none absolute -left-[21px] top-1/2 h-[9px] w-[9px] -translate-y-1/2 rounded-full bg-primary ring-4 ring-primary/15" />
                    {(['dayun', 'liunian'] as const).map((item) => (
                        <button
                            key={item}
                            type="button"
                            onClick={() => selectMode(item)}
                            className={`border-b-[1.5px] pb-1 text-[15px] transition-colors focus-ring cursor-pointer ${mode === item
                                ? 'border-primary font-semibold text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {item === 'dayun' ? '大运' : '流年'}
                        </button>
                    ))}
                </div>

                {/* 流年有约 300 条：先在其所属大运里定位，再在该段的 10 年里步进 */}
                {mode === 'liunian' && (
                    <div className="mb-2 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                const next = Math.max(0, rangeList.findIndex((d) => String(d.startYear) === dayunRef) - 1);
                                selectDayun(String(rangeList[next].startYear));
                            }}
                            aria-label="上一步大运"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary focus-ring cursor-pointer"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="flex-1 truncate text-center text-[15px] text-muted-foreground">
                            {activeDaYun
                                ? `所属 ${isPreYun(activeDaYun.ganZhi) ? '起运前' : `${activeDaYun.ganZhi} 大运`} ${activeDaYun.startYear}–${activeDaYun.endYear}`
                                : '—'}
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                const next = Math.min(rangeList.length - 1, rangeList.findIndex((d) => String(d.startYear) === dayunRef) + 1);
                                selectDayun(String(rangeList[next].startYear));
                            }}
                            aria-label="下一步大运"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary focus-ring cursor-pointer"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {mode === 'liunian' ? (
                    /* 流年平铺：干支上下结构 + 底部岁数与年份，点选比逐格步进直接；
                       一排 5 格放两年，格子够宽、干支和年份读得清；
                       右上角圆点标出已经记过的年份 */
                    <div className="mb-2.5 grid grid-cols-5 gap-1.5">
                        {scopedLiuNian.map((item) => {
                            const itemRef = String(item.year);
                            const selected = itemRef === liunianRef;
                            const recorded = hasRecord('liunian', itemRef);
                            return (
                                <button
                                    key={item.year}
                                    type="button"
                                    onClick={() => selectLiunian(itemRef)}
                                    title={`${item.ganZhi} ${item.year}`}
                                    className={`relative flex flex-col items-center rounded-lg border px-0.5 py-2 transition-colors focus-ring cursor-pointer ${selected
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border/60 hover:border-primary/40 hover:bg-secondary/40'
                                        }`}
                                >
                                    <span className={`font-serif text-[17px] font-semibold leading-[1.15] ${selected ? 'text-primary' : 'text-foreground'}`}>
                                        {item.ganZhi[0] ?? ''}
                                    </span>
                                    <span className={`font-serif text-[17px] font-semibold leading-[1.15] ${selected ? 'text-primary' : 'text-foreground'}`}>
                                        {item.ganZhi[1] ?? ''}
                                    </span>
                                    <span className="mt-1 font-mono text-[13px] tabular-nums text-muted-foreground">
                                        {item.age !== undefined ? `${item.age}岁` : item.year}
                                    </span>
                                    {item.age !== undefined && (
                                        <span className="font-mono text-[13px] tabular-nums leading-tight text-muted-foreground">
                                            {item.year}
                                        </span>
                                    )}
                                    {recorded && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" />}
                                </button>
                            );
                        })}
                        {scopedLiuNian.length === 0 && (
                            <div className="col-span-5 py-3 text-center text-[12px] text-muted-foreground">该大运段没有流年数据</div>
                        )}
                    </div>
                ) : (
                    <div className="mb-2.5 flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => stepDayun(-1)}
                            disabled={dayunStepIndex <= 0}
                            aria-label="上一步大运"
                            className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:cursor-default disabled:opacity-30 focus-ring cursor-pointer"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-0 flex-1 text-center">
                            <span className="font-serif text-[18px] font-semibold tracking-wide text-foreground">{currentItem?.ganZhi ?? '—'}</span>
                            <span className="mt-px block font-mono text-[12px] text-muted-foreground">
                                {currentItem ? `${currentItem.label}${currentItem.meta ? ` · ${currentItem.meta}` : ''} · ${currentItem.typeLabel}` : ''}
                            </span>
                        </span>
                        <button
                            type="button"
                            onClick={() => stepDayun(1)}
                            disabled={dayunStepIndex >= rangeList.length - 1}
                            aria-label="下一步大运"
                            className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:cursor-default disabled:opacity-30 focus-ring cursor-pointer"
                        >
                            <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}

                {/* 流年平铺时网格本身已高亮选中项，不再重复说明 */}

                {/* 收起态：只留一句引导，点选流年（或大运 tab）后展开输入面板 */}
                {!composerOpen ? (
                    <button
                        type="button"
                        onClick={() => setComposerOpen(true)}
                        className="flex w-full items-center rounded-lg border border-dashed border-border px-3 py-2.5 text-left text-[13px] text-muted-foreground/70 transition-colors hover:border-primary/40 hover:text-muted-foreground focus-ring cursor-pointer"
                    >
                        点选上方时段即可记录…
                    </button>
                ) : (
                    <>
                        <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            rows={3}
                            placeholder="这段时间发生了什么…"
                            className="w-full resize-none rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-[14px] leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus-ring"
                        />
                        <div className="mt-2 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setDraft('')}
                                className="rounded-md px-3.5 py-2 text-[14px] text-muted-foreground transition-colors hover:text-foreground focus-ring cursor-pointer"
                            >
                                清空
                            </button>
                            {/* 删除是独立操作：主按钮只负责写入，不再兼职「清空草稿再提交」 */}
                            {hasRecord(mode, ref) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        removeEvent(mode, ref);
                                        setComposerOpen(false);
                                    }}
                                    className="rounded-md border border-destructive/40 px-4 py-2 text-[14px] font-medium text-destructive transition-colors hover:bg-destructive/10 focus-ring cursor-pointer"
                                >
                                    删除
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={commit}
                                disabled={!draft.trim()}
                                className={`rounded-md px-4 py-2 text-[14px] font-medium transition-colors disabled:cursor-default disabled:opacity-40 focus-ring cursor-pointer ${hasRecord(mode, ref)
                                    ? 'border border-primary/30 bg-primary/15 text-primary hover:bg-primary/25'
                                    : 'bg-primary text-primary-foreground hover:opacity-90'
                                    }`}
                            >
                                {hasRecord(mode, ref) ? '更新' : '记下'}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* 时间轴（D1 排布）：轴线由外层统一提供，这里只放节点。
                标题行样式一律保持醒目；折叠只收起该段的记录列表（没记录的段没有可折叠的内容） */}
            {rangeList.map((period) => {
                const list = grouped.map.get(period.startYear) ?? [];
                const preYun = isPreYun(period.ganZhi);
                const hasEvents = list.length > 0;
                const collapsed = collapseOverride[period.startYear] ?? false;
                return (
                    <div key={period.startYear} className="relative mb-5 last:mb-0">
                        <button
                            type="button"
                            onClick={() => hasEvents && setCollapseOverride((prev) => ({ ...prev, [period.startYear]: !collapsed }))}
                            aria-expanded={hasEvents ? !collapsed : undefined}
                            className={`relative flex w-full items-center gap-2.5 text-left ${hasEvents ? 'focus-ring cursor-pointer' : 'cursor-default'} ${collapsed || !hasEvents ? 'mb-0' : 'mb-2'}`}
                        >
                            {/* 圆点相对标题行垂直居中，与干支一条线 */}
                            <span className={`absolute -left-[21px] top-1/2 h-[9px] w-[9px] -translate-y-1/2 rounded-full border-2 border-primary bg-card ${hasEvents ? 'bg-primary' : ''}`} />
                            {/* 目录式：干支在左、年份区间靠右、中间点线相连，便于横向扫读。
                                岁数与年份互为推算，不重复展示；首尾同年时不写重复区间 */}
                            <span className={`shrink-0 font-serif text-[17px] font-semibold tracking-wide ${preYun ? 'text-muted-foreground' : 'text-foreground'}`}>
                                {preYun ? '小运' : period.ganZhi}
                            </span>
                            <span className="mx-1 h-0 min-w-4 flex-1 shrink self-center border-b border-dotted border-border" />
                            {/* 状态标记不占位（无记录时整块不渲染），否则年份右侧会空出一截 */}
                            {hasEvents && (
                                <span className="flex shrink-0 items-center gap-1">
                                    <span className="text-[12px] text-primary">{list.length} 条</span>
                                    <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground/50 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
                                </span>
                            )}
                            <span className="shrink-0 font-mono text-[12.5px] tabular-nums text-muted-foreground">
                                {period.startYear === period.endYear ? period.startYear : `${period.startYear}–${period.endYear}`}
                                {period.startAge !== undefined && period.endAge !== undefined && (
                                    <span className="text-muted-foreground/60">
                                        （{period.startAge === period.endAge ? `${period.startAge}岁` : `${period.startAge}-${period.endAge}岁`}）
                                    </span>
                                )}
                            </span>
                        </button>
                        {!collapsed && hasEvents && (
                            <div className="flex flex-col gap-2">{list.map(eventNode)}</div>
                        )}
                    </div>
                );
            })}

            {/* 重排盘后年份落不进任何大运段的记录：单列出来，不静默丢弃 */}
            {grouped.orphan.length > 0 && (
                <div className="mb-5 last:mb-0">
                    <div className="relative mb-2 flex items-center">
                        <span className="absolute -left-[21px] top-1/2 h-[9px] w-[9px] -translate-y-1/2 rounded-full border-2 border-dashed border-muted-foreground/60 bg-card" />
                        <span className="text-[12px] text-muted-foreground">
                            以下记录的年份不在当前大运范围内（可能修改过出生时间）
                        </span>
                    </div>
                    <div className="flex flex-col gap-2">{grouped.orphan.map(eventNode)}</div>
                </div>
            )}
        </div>
    );

    const hasMoreDayun = visibleCount < afterBirth.length;
    /** 「减少大运」的下限：不能把有记录或当前年份所在的段收起来 */
    const dayunFloor = useMemo(
        () => minDayunCount(afterBirth, events, currentYear),
        [afterBirth, events, currentYear],
    );

    const footer = (
        <div className="flex w-full items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
                {onlyWithEvents ? (
                    /* 只看有记事时，段数由记录决定，增减控件没有意义 */
                    <button
                        type="button"
                        onClick={toggleOnlyWithEvents}
                        className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 text-[13px] font-medium text-primary transition-colors hover:bg-primary/20 focus-ring cursor-pointer"
                    >
                        <ListFilter className="h-4 w-4" />
                        只看有记事
                    </button>
                ) : (
                    <>
                        {/* 大运段数可增可减，但只从最后一端起（改了出生时间或看得更远时才需要） */}
                        <div className="flex h-10 shrink-0 items-stretch overflow-hidden rounded-lg border border-border bg-secondary">
                            <button
                                type="button"
                                onClick={() => setVisibleCount((n) => Math.max(dayunFloor, n - 1))}
                                disabled={visibleCount <= dayunFloor}
                                aria-label="减少一段大运"
                                className="flex w-10 items-center justify-center text-foreground transition-colors hover:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-40 focus-ring cursor-pointer"
                            >
                                <Minus className="h-4 w-4" />
                            </button>
                            <span className="flex items-center border-x border-border px-1.5 font-mono text-[13px] tabular-nums text-muted-foreground">
                                {visibleCount}/{afterBirth.length}
                            </span>
                            <button
                                type="button"
                                onClick={() => setVisibleCount((n) => Math.min(afterBirth.length, n + 1))}
                                disabled={!hasMoreDayun}
                                aria-label="增加一段大运"
                                className="flex w-10 items-center justify-center text-foreground transition-colors hover:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-40 focus-ring cursor-pointer"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={toggleOnlyWithEvents}
                            disabled={events.length === 0}
                            className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 text-[13px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 focus-ring cursor-pointer"
                        >
                            <ListFilter className="h-4 w-4" />
                            只看有记事
                        </button>
                    </>
                )}
            </div>
            <button type="button" onClick={onClose} className="modal-btn primary shrink-0 focus-ring">
                完成
            </button>
        </div>
    );

    if (isMobile) {
        // 5 列网格在窄屏要留够格宽，移动端内边距收窄到 12px
        return (
            <SubPage isOpen onClose={onClose} title="生平记事" bodyClassName="px-3 py-4" footer={footer}>
                {bodyContent}
            </SubPage>
        );
    }

    return (
        <BaseModal
            isOpen
            onClose={onClose}
            title="生平记事"
            maxWidth="max-w-[520px]"
            bodyClassName="max-h-[64vh] overflow-y-auto p-5"
            footer={footer}
        >
            {bodyContent}
        </BaseModal>
    );
}
