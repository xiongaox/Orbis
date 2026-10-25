/**
 * 关键职责（B6）：
 * - 案例卡共享静态展示区：四柱迷你排盘、姓名行、性别印章/分类 chip/记事徽标、日期行
 *   的派生逻辑与渲染，供案例库卡（SortableCaseCard，variant="library"）与
 *   侧栏卡（CaseCard，variant="sidebar"）共用。
 * - 手势/滑动外壳（REVEAL_PX、长按守卫、右滑操作按钮等）仍在各自卡壳里，本组件不含交互。
 *
 * 数值铁律：两卡所有字号/柱宽/间距按原值逐字保留，禁止「顺手统一」。侧栏档数值
 * 依然受 CaseCard.tsx 头部「排版约束」注释约束（224px 宽度、日期短横线格式、
 * 四柱 @container 分档），改动前必读。
 * 差异以 variant 联合类型表达：library = 中文日期、单标签、大号印章/四柱、
 * 记事徽标在姓名行；sidebar = 短横线日期、全量标签、小号印章/四柱（容器查询分档）、
 * 岁数在底行、AI 研判状态按钮。
 */
import type { MouseEvent as ReactMouseEvent } from 'react';
import { getBaziPillarsFromDateString, getAgeFromBirth } from '../../../../../utils/lunarUtil';
import { getElementTextColor } from '../../../../../lib/xuan-bazi/maps';
import { useCasePrivacy } from '../../../../../contexts/CasePrivacyContext';
import { cn } from '../../../../../lib/utils';

/** AI 研判任务状态（见 aiTaskStatusService）：研判中 / 未读研判，展示为姓名后的小状态按钮 */
export type CaseCardAiStatus = 'running' | 'unread';

export type CaseCardBodyVariant = 'library' | 'sidebar';

interface CaseCardBodyProps {
    variant: CaseCardBodyVariant;
    name: string;
    isMale: boolean;
    /** 四柱推导数据源（案例库卡为 caseData.birth_date；侧栏卡为 item.birthDate ?? item.date） */
    pillarSource: string;
    /** 出生日期解析源（解析失败时回退 dateFallback） */
    birthDate: string;
    dateFallback: string;
    tags: string[];
    /** 仅案例库卡：当前浏览分组标签，命中时优先展示而非第一个标签 */
    preferredTag?: string | null;
    lifeEventCount: number;
    /** 仅侧栏卡：AI 研判状态按钮 */
    aiStatus?: CaseCardAiStatus | null;
    /** AI 状态按钮对应案例 id（onOpenAiResearch 的入参） */
    aiTargetId?: string;
    onOpenAiResearch?: (id: string) => void;
    /** AI 状态按钮点击回调（卡壳传入，负责 stopPropagation 等卡壳语义） */
    onAiButtonClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}

export default function CaseCardBody({
    variant,
    name,
    isMale,
    pillarSource,
    birthDate,
    dateFallback,
    tags,
    preferredTag,
    lifeEventCount,
    aiStatus,
    aiTargetId,
    onOpenAiResearch,
    onAiButtonClick,
}: CaseCardBodyProps) {
    // 隐藏开关由案例库头部统一控制（跨模块共享），这里只读状态
    const { isPrivacyMode } = useCasePrivacy();

    // ---- 两卡共享的派生逻辑 ----
    // 四柱：年 月 日 时（每柱天干 + 地支）
    const pillars = getBaziPillarsFromDateString(pillarSource);
    const pillarPairs = pillars.length === 8
        ? [0, 2, 4, 6].map(i => [pillars[i], pillars[i + 1]] as const)
        : [];
    // 仅日干使用五行色，其余干支统一压暗
    const dayGan = pillarPairs[2]?.[0] ?? '';
    const dayGanColor = getElementTextColor(dayGan);

    const birth = new Date(birthDate);
    const hasBirth = !Number.isNaN(birth.getTime());
    const pad = (n: number) => String(n).padStart(2, '0');
    // 岁数：复用领域层虚岁算法（当年 - 出生年 + 1），两卡同一来源
    const age = getAgeFromBirth(birthDate);
    const displayTime = hasBirth ? `${pad(birth.getHours())}:${pad(birth.getMinutes())}` : '';

    if (variant === 'library') {
        // ---- 案例库卡（SortableCaseCard）：单行横排，左列姓名/日期 + 右侧大号四柱 ----
        // 日期：中文「1996年12月31日」（该卡宽度充裕，无侧栏的截断约束）
        const displayDate = hasBirth
            ? `${birth.getFullYear()}年${birth.getMonth() + 1}月${birth.getDate()}日`
            : dateFallback;
        // 标签：正浏览某分组且案例属于该分组时，优先展示该分组标签
        const displayTag = preferredTag && tags.includes(preferredTag) ? preferredTag : tags[0];

        return (
            <>
                {/* 左侧：姓名 / 性别 / 分类 / 出生日期时辰 */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                        <span className={`truncate text-sm font-medium text-foreground ${isPrivacyMode ? 'select-none blur-[6px]' : ''}`}>{name}</span>
                        {/* 印章 / 分类 / 记事条数共用一个 tight 栈：三者间距压到 4px */}
                        <div className="flex shrink-0 items-center gap-1">
                            {/* 性别印章：专用性别色实底容器，同分类 chip 一套度量（demo shared.css .seal） */}
                            <span className={`inline-flex h-[21px] w-5 shrink-0 items-center justify-center rounded-md text-xs leading-none ${isMale
                                ? 'bg-[var(--gender-male-bg)] text-[var(--gender-male)]'
                                : 'bg-[var(--gender-female-bg)] text-[var(--gender-female)]'
                                }`}>
                                {isMale ? '乾' : '坤'}
                            </span>
                            {tags.length > 0 && (
                                <span className="inline-flex h-5 shrink-0 items-center rounded-[5px] bg-primary/10 px-1.5 text-[13px] leading-none text-primary">
                                    {displayTag}
                                </span>
                            )}
                            {/* 生平记事条数：与左侧分类 chip 同一规格（primary/10 透明底 + primary 文字） */}
                            {lifeEventCount > 0 && (
                                <span
                                    title={`生平记事 ${lifeEventCount} 条`}
                                    className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-[5px] bg-primary/10 px-1.5 font-mono text-[13px] leading-none text-primary"
                                >
                                    {lifeEventCount}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                        <span>{displayDate}</span>
                        {displayTime && <span className="tabular-nums">{displayTime}</span>}
                        {age !== null && (<><span className="h-[3px] w-[3px] rounded-full bg-border" /><span>{age}岁</span></>)}
                    </div>
                </div>

                {/* 右侧：四列迷你排盘（干上支下），日干保留五行色，其余压暗 */}
                <div className="flex shrink-0 gap-[3px]">
                    {pillarPairs.map(([gan, zhi], i) => (
                        <div key={i} className="flex w-6 flex-col items-center font-serif leading-tight">
                            <span className={`text-[19px] font-semibold ${i === 2 ? dayGanColor : 'text-foreground/55'}`}>{gan}</span>
                            <span className="text-[19px] font-semibold text-foreground/55">{zhi}</span>
                        </div>
                    ))}
                </div>
            </>
        );
    }

    // ---- 侧栏卡（CaseCard）：上区左「姓名/印章+分类」+ 右侧四柱顶对齐，底行横跨整卡 ----
    // 日期必须用短横线格式（1996-12-31）：中文「年月日」写法在 224px 侧栏里与出生时辰
    // 同排时会顶满整行（实测 75.6px / 可用 75.6px，零余量），字号无法再放大。
    const displayDate = hasBirth
        ? `${birth.getFullYear()}-${pad(birth.getMonth() + 1)}-${pad(birth.getDate())}`
        : dateFallback;

    return (
        <>
            {/* 上区：左「姓名 / 印章+分类」与右侧四柱顶对齐。
                姓名完整展示，仅当超出左列宽度时由 CSS truncate 按实际空间省略
                （研判状态按钮 shrink-0，不会被长名挤出卡外） */}
            <div className="flex min-w-0 items-start justify-between gap-[7px] @[206px]:gap-[5px]">
                <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-[4px]">
                        <span className={`block truncate text-[14px] font-semibold leading-[17px] text-foreground ${isPrivacyMode ? 'select-none blur-[6px]' : ''}`}>
                            {name}
                        </span>
                        {aiStatus && onOpenAiResearch && onAiButtonClick && aiTargetId !== undefined && (
                            <button
                                type="button"
                                onClick={(event) => { onAiButtonClick(event); onOpenAiResearch(aiTargetId); }}
                                title={aiStatus === 'running' ? 'AI 研判进行中，点击查看' : '有未读的 AI 研判结果，点击查看'}
                                className={`shrink-0 h-[16px] px-[4px] rounded-[4px] text-[9.5px] leading-none inline-flex items-center transition-colors cursor-pointer ${aiStatus === 'running'
                                    ? 'border border-primary/40 bg-primary/10 text-primary animate-pulse'
                                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                    }`}
                            >
                                {aiStatus === 'running' ? '研判中' : '未读研判'}
                            </button>
                        )}
                    </div>
                    <div className="mt-[4px] flex min-w-0 flex-wrap items-center gap-[4px]">
                        {/* 性别印章：第二行行首 */}
                        <span className={`inline-flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-[4px] text-[10.5px] leading-none ${isMale
                            ? 'bg-[var(--gender-male-bg)] text-[var(--gender-male)]'
                            : 'bg-[var(--gender-female-bg)] text-[var(--gender-female)]'
                            }`}>
                            {isMale ? '乾' : '坤'}
                        </span>
                        {/* 标签全量展示，多标签依次排列 */}
                        {tags.length > 0 && tags.map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex h-[17px] shrink-0 items-center rounded-[4px] bg-primary/10 px-[3px] text-[10.5px] leading-none text-primary"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
                {/* 右侧：四柱迷你排盘（干上支下 4 列）。
                    紧凑档（内容 <206px）：柱宽 15px、柱间距 3px —— 干支 16px 字形压 15px 列，
                    224px 侧栏下这是实测扫描出的最优解，再放大柱间距或日期字号都会让日期截断。
                    宽容器档（≥206px）：柱宽 16px、柱间距 5px，见 CaseCard 头注释「四柱在宽容器下放宽呼吸感」。 */}
                {pillarPairs.length > 0 && (
                    <div className="flex shrink-0 gap-[3px] font-serif leading-tight @[206px]:gap-[5px]">
                        {pillarPairs.map(([gan, zhi], i) => (
                            <div key={i} className="flex w-[15px] shrink-0 flex-col items-center @[206px]:w-[16px]">
                                <span className={`text-[16px] font-semibold ${i === 2 ? dayGanColor : 'text-foreground/55'}`}>{gan}</span>
                                <span className="text-[16px] font-semibold text-foreground/55">{zhi}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {/* 底行：岁数（左）+ 出生日期·时辰（右对齐）。底行横跨整卡宽度，
                最坏内容约 137px vs 可用 181px+（360dp 小屏），日期不受左列宽度约束。
                日期仍是唯一可省略项，其余节点 shrink-0。 */}
            <div className="mt-[4px] flex min-w-0 items-center gap-[4px] text-[12.5px] text-muted-foreground">
                {age !== null && <span className="shrink-0 tabular-nums">{age}岁</span>}
                {lifeEventCount > 0 && (
                    <span
                        title={`生平记事 ${lifeEventCount} 条`}
                        className={cn(
                            // 与分类 chip 同一套：primary/10 透明底 + primary 文字，仅字号与高度更小
                            'inline-flex h-[15px] min-w-[15px] shrink-0 items-center justify-center rounded-[4px] bg-primary/10 px-[4px] font-mono text-[9.5px] leading-none text-primary',
                            age === null && 'ml-[2px]',
                        )}
                    >
                        {lifeEventCount}
                    </span>
                )}
                <div className="ml-auto flex min-w-0 items-center gap-[1px]">
                    <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{displayDate}</span>
                    {displayTime && (
                        <>
                            <span className="h-[3px] w-[3px] shrink-0 rounded-full bg-border" />
                            <span className="shrink-0 tabular-nums">{displayTime}</span>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
