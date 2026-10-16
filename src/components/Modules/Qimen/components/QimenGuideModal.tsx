/**
 * QimenGuideModal - 盘面元素说明（环绕版式，取自 design-demos/qimen-guide 方案 A）
 * 宫位卡直接复用盘面 PalaceCell（与外层宫格渲染完全一致：长生/十神/宫位元数据开关、
 * 击刑入墓状态标识、值符值使与动态马空高亮全部同源），12 条解释按就近原则环绕四周，
 * 悬停/点选条目 → 卡内对应元素主色描边高亮；解释条按行等高、左右两列均分对齐。
 * 内容区 <480px（手机竖屏）时降级为「卡在上 + 单列列表」，交互相同仅不环绕。
 * 移动端不以弹窗呈现：改用 SubPage 二级页面，宫位卡钉在页头下固定不动，说明卡片单独滚动。
 * 日干/时干经 getJiaDunStem 甲遁六仪映射后比对，与盘面 PalaceCell 高亮逻辑一致。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { BookOpen } from 'lucide-react';
import BaseModal from '../../../UI/BaseModal';
import SubPage from '../../../UI/SubPage';
import { useLayoutMode } from '../../../../hooks/useLayoutMode';
import PalaceCell from './PalaceCell';
import { getJiaDunStem, getGanChangShengNote } from '../../../../lib/csp-qimen/qimenUtils';
import { MEN_YINYANG, XING_YINYANG } from '../../../../lib/csp-qimen/constants';
import type { QimenPalace } from '../QimenChart';

interface QimenGuideModalProps {
    open: boolean;
    onClose: () => void;
    /** 当前选中宫位实时数据；不传时回退乾宫静态示例 */
    palace?: QimenPalace | null;
    /** 值符星/值使门（PalaceCell 值符/值使高亮用），与外层盘面同源 */
    zhiFu?: string;
    zhiShi?: string;
    /** 四柱干支（日干/时干在卡内高亮用），如 { day: '壬子', hour: '庚戌' } */
    siZhu?: { year: string; month: string; day: string; hour: string };
    /** 动态马/空（随局信息面板选中的年/月/日/时柱切换），与盘面显示同源 */
    dynamicMaKong?: { kongPositions: number[]; maPosition: number };
    /** 盘面显示开关，与外层宫格保持一致（默认对齐两端初始状态：长生+宫位开、十神关） */
    showChangSheng?: boolean;
    showShiShen?: boolean;
    showPalaceMeta?: boolean;
}

/** 乾宫静态示例（palace 未传时回退；寄宫干为示意值） */
const FALLBACK_PALACE: QimenPalace = {
    position: 6,
    gongName: '乾',
    tianPan: '辛',
    diPan: '戊',
    men: '开门',
    xing: '天心',
    shen: '白虎',
    anGan: '壬',
    maKong: '马',
    xingWang: '相丨月休',
    menWang: '旺丨月囚',
    jiGongTianPan: '己',
    jiGongDiPan: '己',
    jiGongTianPanCS: '衰旺',
    jiGongDiPanCS: '冠沐',
    tianPanShiErCS: '衰',
    diPanShiErCS: '冠',
    menPoPath: { from: '艮', to: '乾', final: '离' },
    palaceMeta: { number: '6149', wangShuai: '休', panType: '内盘' },
};

type GuideZone = 'top' | 'left' | 'right' | 'bottom';

/** 辅助行（歌诀 / 规则 / 长生注记）：左侧细线小字，src 为可选出处前缀 */
interface GuideNote {
    src?: string;
    body: ReactNode;
}

interface GuideItem {
    id: string;
    n: number;
    zone: GuideZone;
    title: string;
    desc: string;
    notes?: GuideNote[];
}

export default function QimenGuideModal({
    open,
    onClose,
    palace,
    zhiFu,
    zhiShi,
    siZhu,
    dynamicMaKong,
    showChangSheng = true,
    showShiShen = false,
    showPalaceMeta = true,
}: QimenGuideModalProps) {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isWide, setIsWide] = useState(false);
    const layoutRef = useRef<HTMLDivElement>(null);
    const { isMobile: isMobilePage } = useLayoutMode();
    // 解释条 DOM 登记：移动端点选大卡元素后，把对应条目滚进可视区
    const itemElsRef = useRef<Record<string, HTMLDivElement | null>>({});

    // 无选中宫位时回退乾宫静态示例
    const display = useMemo(() => palace ?? FALLBACK_PALACE, [palace]);
    // 日干/时干为甲时按甲遁六仪映射后再比对（盘面无明甲）
    const dayStem = getJiaDunStem(siZhu?.day?.[0] || '', siZhu?.day?.[1] || '');
    const hourStem = getJiaDunStem(siZhu?.hour?.[0] || '', siZhu?.hour?.[1] || '');

    // 马/空显示与 PalaceCell 同源：局信息面板选中柱的动态值优先，否则用宫位自带标记
    const maKongDisplay = useMemo(() => {
        if (dynamicMaKong) {
            if (display.position === 5) return '';
            const isMa = dynamicMaKong.maPosition === display.position;
            const isKong = dynamicMaKong.kongPositions.includes(display.position);
            if (isMa && isKong) return '〇/马';
            if (isKong) return '〇';
            if (isMa) return '马';
            return '';
        }
        return display.maKong || '';
    }, [dynamicMaKong, display]);

    // 解释条目：标题带实时值，描述为领域规则（与 src/lib/csp-qimen 一致）；
    // 对应元素为空的条目直接不展示（如本宫不占马空、无寄宫干、中宫无三卦），序号按可见顺序重排
    const guideItems = useMemo<GuideItem[]>(() => {
        const p = display;
        const path = p.menPoPath;
        const hasJiGong = !!(p.jiGongTianPan || p.jiGongDiPan);
        // 精简文案：正文只留「是什么＋取象」，歌诀/规则/长生注记走 notes（左侧细线小字行）
        const [xingGong, xingMonth] = (p.xingWang || '丨').split('丨');
        const [menGong, menMonth] = (p.menWang || '丨').split('丨');
        // 九星/八门阴阳注记：禽芮为合星单独说明
        const xingYin = p.xing === '禽芮'
            ? '，禽芮为禽（阳）芮（阴）合星'
            : XING_YINYANG[p.xing] ? `，${p.xing}为${XING_YINYANG[p.xing]}星` : '';
        const menYin = MEN_YINYANG[p.men] ? `${p.men}为${MEN_YINYANG[p.men]}门。` : '';
        // 天干长生注记（天盘干、地盘干两条）：长生位与行度由领域层反查，中宫无小字时为 null
        const csNote = (gan: string): GuideNote | null => {
            const info = getGanChangShengNote(gan, p.position);
            if (!info) return null;
            return {
                body: (
                    <>
                        {gan}（{info.yinYang}）天干，
                        <b className="font-semibold text-primary">
                            长生在{info.zhi}，<span className="text-accent">{info.dir}</span>
                        </b>
                        ；本宫含 {info.zhiList.join('、')} →{' '}
                        {info.states.map((s, i) => `${s}（${info.zhiList[i]}）`).join(' + ')}
                    </>
                ),
            };
        };
        const tianCs = p.tianPan ? csNote(p.tianPan) : null;
        const diCs = p.diPan ? csNote(p.diPan) : null;
        const items: (Omit<GuideItem, 'n'> | null)[] = [
            path ? {
                id: 'sangua', zone: 'top' as const,
                title: `宫顶三卦「${path.from} → ${path.to} → ${path.final}」`,
                desc: `${path.to}为本宫后天卦，${path.from}为${path.to}位先天卦，${path.final}为穿宫卦（${path.to}穿${path.final}）。`,
                notes: [{ body: '飞宫变易时参考，不作主象。' }],
            } : null,
            p.anGan ? {
                id: 'anGan', zone: 'top' as const,
                title: `暗干（${p.anGan}）`,
                desc: '值使门加临时干派生，不入明盘，取象时作暗中的推动因素。',
            } : null,
            maKongDisplay ? {
                id: 'ma', zone: 'top' as const,
                title: `马/空标记（${maKongDisplay}）`,
                desc: '〇＝空亡，马＝驿马，两者同落写作「〇/马」。',
            } : null,
            hasJiGong ? {
                id: 'jiGong', zone: 'left' as const,
                title: `寄宫干（${p.jiGongTianPan || '—'} / ${p.jiGongDiPan || '—'}）与小字`,
                desc: '中宫寄坤宫，左列上格为中宫天盘干、下格为地盘干。',
                notes: [{ body: <>紫框＝<b className="font-semibold text-primary">击刑 / 入墓</b></> }],
            } : null,
            p.shen ? {
                id: 'shen', zone: 'left' as const,
                title: `八神（${p.shen}）`,
                desc: '自值符宫起布，阳遁顺布、阴遁逆布。',
                notes: [{ body: '定吉凶的性质与氛围，不独主吉凶。' }],
            } : null,
            p.xing ? {
                id: 'xing', zone: 'left' as const,
                title: `九星（${p.xing}）与小字「${p.xingWang || '—'}」`,
                desc: `「${xingGong}」＝星对本宫${xingMonth ? `，「${xingMonth}」＝星对月令` : ''}${xingYin}。`,
                notes: [{ src: '《烟波钓叟歌》', body: '与我同行即为相，我生之月诚为旺，废于父母休于财，囚于鬼兮真不旺。' }],
            } : null,
            p.tianPan ? {
                id: 'tianPan', zone: 'right' as const,
                title: `天盘干（${p.tianPan}）与小字「${p.tianPanShiErCS || '—'}」`,
                desc: '值符随时干转动后落在本宫的三奇六仪。',
                notes: tianCs ? [tianCs] : undefined,
            } : null,
            p.men ? {
                id: 'men', zone: 'right' as const,
                title: `八门（${p.men}）与小字「${p.menWang || '—'}」`,
                desc: `「${menGong}」＝门对本宫${menMonth ? `，「${menMonth}」＝门对月令` : ''}。`,
                notes: [{ body: <>门克宫＝<b className="font-semibold text-primary">门迫</b>，以红字门名标出。{menYin}</> }],
            } : null,
            p.diPan ? {
                id: 'diPan', zone: 'right' as const,
                title: `地盘干（${p.diPan}）与小字「${p.diPanShiErCS || '—'}」`,
                desc: '三奇六仪按局数布宫，阳遁顺布、阴遁逆布；排定后不再随天盘转动，是整盘的固定地基。',
                notes: diCs ? [diCs] : undefined,
            } : null,
            p.palaceMeta ? {
                id: 'num', zone: 'bottom' as const,
                title: `底部数字「${p.palaceMeta.number}」`,
                desc: '依次为后天数、先天数、河图生数、河图成数（10 显示作「`10」）。',
            } : null,
            p.palaceMeta ? {
                id: 'wang', zone: 'bottom' as const,
                title: `宫位「【 ${p.palaceMeta.wangShuai} 】」`,
                desc: '本宫五行对月令的旺衰。',
                notes: [{ body: '同我者旺，生我者相，我生者休，我克者囚，克我者死。' }],
            } : null,
            p.palaceMeta ? {
                id: 'panType', zone: 'bottom' as const,
                title: p.palaceMeta.panType,
                desc: '阳遁：坎艮震巽为内盘；阴遁内外对调。',
                notes: [{ body: '中宫寄坤宫，随坤宫。' }],
            } : null,
        ];
        return items
            .filter((item): item is Omit<GuideItem, 'n'> => item !== null)
            .map((item, index) => ({ ...item, n: index + 1 }));
    }, [display, maKongDisplay]);

    // 内容区宽度测量：>=480px 用环绕布局（宫位居中、词条四周环绕），
    // 更窄（手机竖屏）物理上放不下环绕，降级为「卡在上 + 单列列表」
    useEffect(() => {
        if (!open) return undefined;
        const host = layoutRef.current;
        if (!host) return undefined;
        const measure = () => setIsWide(host.clientWidth >= 480);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(host);
        return () => observer.disconnect();
    }, [open]);

    // 关闭时同步清空选中（Escape/遮罩/×/返回键都经 BaseModal 的 onClose 走这里）
    const handleClose = useCallback(() => {
        setActiveId(null);
        onClose();
    }, [onClose]);

    const activate = useCallback((id: string) => {
        setActiveId((prev) => (prev === id ? null : id));
        // 移动端：解释列表在下方滚动区，点选后把对应条目带入可视区
        //（block: nearest 仅在目标不可见时滚动，已可见时不打断阅读位置）
        if (id && isMobilePage) {
            requestAnimationFrame(() => {
                itemElsRef.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        }
    }, [isMobilePage]);

    // 反向选择：点击卡内元素 → 高亮对应词条（再点同一元素取消；空元素条目已隐藏不响应）
    const handleLayoutClick = useCallback((e: ReactMouseEvent) => {
        const el = (e.target as HTMLElement).closest('[data-guide-el]');
        if (!el) return;
        const id = el.getAttribute('data-guide-el');
        if (id && guideItems.some((g) => g.id === id)) activate(id);
    }, [activate, guideItems]);

    // 宫位卡：直接复用盘面 PalaceCell，与外层宫格渲染完全一致；
    // guideInteractive 允许点击卡内元素反向选中词条（按钮本身的选中回调为空操作）；
    // guideLitId 驱动卡内元素随词条高亮
    const palaceCard = (
        <div className="mx-auto flex w-full max-w-[320px] [&>button]:w-full">
            <PalaceCell
                palace={display}
                isSelected={false}
                onSelect={() => {}}
                showChangSheng={showChangSheng}
                showShiShen={showShiShen}
                showPalaceMeta={showPalaceMeta}
                isZhiFu={!!zhiFu && display.xing === zhiFu}
                isZhiShi={!!zhiShi && display.men === zhiShi}
                isDayStem={dayStem !== '' && display.tianPan === dayStem}
                isHourStem={hourStem !== '' && display.tianPan === hourStem}
                isJiGongDayStem={dayStem !== '' && display.jiGongTianPan === dayStem}
                isJiGongHourStem={hourStem !== '' && display.jiGongTianPan === hourStem}
                dynamicMaKong={dynamicMaKong}
                isMobileLayout={!isWide}
                enlarged
                guideLitId={activeId}
                guideInteractive
            />
        </div>
    );

    const renderGuideItem = (g: GuideItem, grow = false) => (
        <div
            key={g.id}
            ref={(el) => { itemElsRef.current[g.id] = el; }}
            onMouseEnter={() => setActiveId(g.id)}
            onClick={() => activate(g.id)}
            className={`cursor-pointer rounded-lg border bg-card px-2.5 py-[7px] transition-colors ${grow ? 'flex-1' : ''} ${
                activeId === g.id
                    ? 'border-primary/50 bg-primary/10'
                    : 'border-border hover:border-primary/50 hover:bg-primary/10'
            }`}
        >
            {/* 移动端 SubPage 字号整体放大一档（标题 14 / 正文 13 / 注记 12.5），桌面弹窗维持原密度 */}
            <div className={`mb-0.5 font-semibold leading-snug text-primary ${isMobilePage ? 'text-[14px]' : 'text-[12.5px]'}`}>{g.n}. {g.title}</div>
            <div className={`leading-relaxed text-foreground/75 ${isMobilePage ? 'text-[13px]' : 'text-[11.5px]'}`}>{g.desc}</div>
            {g.notes?.map((nt, i) => (
                <div key={i} className={`mt-1 border-l-2 border-primary/30 pl-2 leading-relaxed text-foreground/60 ${isMobilePage ? 'text-[12.5px]' : 'text-[11px]'}`}>
                    {nt.src && <span className="text-muted-foreground">{nt.src}：</span>}
                    {nt.body}
                </div>
            ))}
        </div>
    );

    // 移动端：SubPage 二级页面——宫位卡钉在页头下固定不动，说明卡片单独滚动
    if (isMobilePage) {
        return (
            <SubPage
                isOpen={open}
                onClose={handleClose}
                title="盘面元素说明"
                bodyClassName="!overflow-hidden"
            >
                <div ref={layoutRef} onClick={handleLayoutClick} className="flex h-full min-h-0 flex-col">
                    {!palace && (
                        <p className="shrink-0 px-4 pt-3 text-xs text-muted-foreground">
                            当前展示乾宫静态示例；在盘面选中宫位后再次打开，将渲染该宫位的实时数据。
                        </p>
                    )}
                    <div className="shrink-0 px-4 pb-4 pt-3">
                        {palaceCard}
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-5">
                        <div className="flex flex-col gap-2">
                            {guideItems.map((g) => renderGuideItem(g))}
                        </div>
                    </div>
                </div>
            </SubPage>
        );
    }

    return (
        <BaseModal
            isOpen={open}
            onClose={handleClose}
            title="盘面元素说明"
            titleIcon={<BookOpen className="h-5 w-5" />}
            // 弹窗宽度与布局模式解耦：固定上限，窄视口由 w-full 压满；
            // 环绕/单列仅由上方 ResizeObserver 实测内容宽度决定，避免「宽度互相依赖」死锁
            maxWidth="max-w-4xl"
            bodyClassName="p-4"
        >
            {!palace && (
                <p className="mb-3 text-xs text-muted-foreground">
                    当前展示乾宫静态示例；在盘面选中宫位后再次打开，将渲染该宫位的实时数据。
                </p>
            )}
            <div ref={layoutRef} onClick={handleLayoutClick}>
                {isWide ? (
                    // 统一三等分列轨道：上/下行词条与中间行左右列、宫位卡共用同一组列宽，
                    // 全部卡片竖向边缘严格对齐（宫位卡撑满中间列，不再单独定宽）
                    <div className="grid grid-cols-3 grid-rows-[auto_auto_auto] gap-x-4 gap-y-3">
                        <div className="col-span-3 col-start-1 row-start-1 grid auto-rows-fr grid-cols-3 items-stretch gap-x-4">
                            {guideItems.filter((g) => g.zone === 'top').map((g) => renderGuideItem(g))}
                        </div>
                        <div className="col-start-1 row-start-2 flex flex-col gap-2.5">
                            {guideItems.filter((g) => g.zone === 'left').map((g) => renderGuideItem(g, true))}
                        </div>
                        <div className="col-start-2 row-start-2 flex">
                            {palaceCard}
                        </div>
                        <div className="col-start-3 row-start-2 flex flex-col gap-2.5">
                            {guideItems.filter((g) => g.zone === 'right').map((g) => renderGuideItem(g, true))}
                        </div>
                        <div className="col-span-3 col-start-1 row-start-3 grid auto-rows-fr grid-cols-3 items-stretch gap-x-4">
                            {guideItems.filter((g) => g.zone === 'bottom').map((g) => renderGuideItem(g))}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        <div className="flex justify-center">{palaceCard}</div>
                        <div className="flex flex-col gap-2">
                            {guideItems.map((g) => renderGuideItem(g))}
                        </div>
                    </div>
                )}
            </div>
        </BaseModal>
    );
}
