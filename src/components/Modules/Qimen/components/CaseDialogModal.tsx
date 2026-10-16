/**
 * 案例正文弹窗（奇门案例区入口打开）。
 *
 * 定位：新建弹窗只管名称/时间/分类，正文全部收进这里，所以它要在「边看盘边补记」的
 * 场景下反复打开——历史按时间线只读成行，底部一条常驻输入条 + 三档模式。
 * 桌面端因此走右侧抽屉而不是居中弹窗：居中会把左边的盘面整个盖住，没法对着盘写断法。
 *
 * 三档模式按「谁在说」命名：求测人 / 测算师 / 断法（断法是测算师给出的结论，
 * 单独成一档是为了让它带主色标记、并始终贴在自己那条测算师回答之后）。
 *
 * 三条硬规则（2026-10 定稿）：
 * 1. 断法挂在自己的回答之后，渲染上单独用主色虚框标记；
 * 2. 提交求测人的话后自动切到「测算师」，手边还有别的要记时可以自己点回去；
 * 3. 新记录按 locateLine 定位插入（测算师的话进最后一个求测人问题之后、
 *    断法进缺断法的那条回答之后），不做 append，
 *    否则断法会长在一条还没被回答的问题后面。
 *
 * 数据仍然落在 description / feedback / analysis 三个字段，见 caseDialog.ts。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Pencil, Plus, SquarePen, Trash2 } from 'lucide-react';
import {
    dialogFieldsFromLines,
    dialogLinesFromCase,
    groupLines,
    locateLine,
    suggestNextKind,
    type CaseDialogKind,
    type CaseDialogLine,
} from '../../../Common/caseDialog';
import { qimenCaseService, type QimenCase } from '../../../../services/qimenCaseService';
import SubPage from '../../../UI/SubPage';
import BaseModal from '../../../UI/BaseModal';
import { useLayoutMode } from '../../../../hooks/useLayoutMode';
import { KIND_STYLE, MODE_LABEL } from './caseDialogStyle';

interface CaseDialogModalProps {
    isOpen: boolean;
    /** 从摘要卡的编辑入口打开时聚焦输入框，省掉再点一下的步骤 */
    autoFocusComposer?: boolean;
    caseData: QimenCase | null;
    mode: CaseDialogKind;
    onModeChange: (mode: CaseDialogKind) => void;
    onClose: () => void;
    onCaseUpdated: (updatedCase: QimenCase) => void;
}

export default function CaseDialogModal({
    isOpen,
    autoFocusComposer = false,
    caseData,
    mode,
    onModeChange,
    onClose,
    onCaseUpdated,
}: CaseDialogModalProps) {
    const [lines, setLines] = useState<CaseDialogLine[]>(() => groupLines(dialogLinesFromCase(caseData)));
    // 移动端走二级页壳（SubPage），桌面端走居中弹窗
    const { isMobile } = useLayoutMode();

    const [draft, setDraft] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    /** 回顾补记时钉住的回答行号：这条断法要挂到它下面 */
    const [analysisTargetId, setAnalysisTargetId] = useState<string | null>(null);
    /** 正在行内编辑的记录下标与草稿（一次只编辑一条） */
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingText, setEditingText] = useState('');
    /** 选中的记录：底部操作栏据此出现，行内不再挂按钮 */
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    /** 编辑框：进入编辑时聚焦，高度跟着内容长 */
    const editRef = useRef<HTMLTextAreaElement | null>(null);
    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const listRef = useRef<HTMLDivElement | null>(null);

    // 打开时按当前案例重建（弹窗常驻挂载，仅靠初始值会残留上一个案例的内容）
    useEffect(() => {
        if (!isOpen) return;
        const restored = groupLines(dialogLinesFromCase(caseData));
        setLines(restored);
        setDraft('');
        setError(null);
        setAnalysisTargetId(null);
        setEditingIndex(null);
        setEditingText('');
        setSelectedIndex(null);
        // 打开后按记录的问/答进度给出该记哪一种
        onModeChange(suggestNextKind(restored));
        // onModeChange 是布局层的 setState，引用稳定，不随记录变化
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, caseData]);

    // 返回手势不在这里注册：两套壳（BaseModal / SubPage）都已接入返回栈，
    // 自己再注册会让一次返回连退两层。

    /** 轮数：提问的条数 */
    const turnCount = useMemo(() => lines.filter((line) => line.kind === 'q').length, [lines]);

    /** 保存：记录流整段写回三个字段 */
    const persist = async (nextLines: CaseDialogLine[]) => {
        if (!caseData) return;
        setIsSaving(true);
        setError(null);
        try {
            const { description, feedback, analysis, dialog_lines } = dialogFieldsFromLines(nextLines);
            const updated = await qimenCaseService.updateCase(caseData.id, {
                description, feedback, analysis, dialog_lines,
            });
            onCaseUpdated(updated);
        } catch (err) {
            console.error('保存案例正文失败:', err);
            setError('保存失败，请重试');
        } finally {
            setIsSaving(false);
        }
    };

    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            const list = listRef.current;
            if (list) list.scrollTop = list.scrollHeight;
        });
    };

    // 打开时直接落在最新一条：不再折叠早期记录，长案例要能一眼看到当前进度
    useEffect(() => {
        if (!isOpen) return;
        scrollToBottom();
        if (autoFocusComposer) inputRef.current?.focus();
    }, [isOpen, autoFocusComposer]);

    // 输入框随内容增高：两行以上就长高，到 max-h 才内部滚动。
    // 高度先归零再量 scrollHeight，否则删字时高度不会缩回去。
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }, [draft]);

    const handleSend = async () => {
        const text = draft.trim();
        if (!text) return;

        // 按语义插入，而不是追加到末尾；断法可以带明确的回答目标（回顾补记）
        const at = locateLine(lines, mode, analysisTargetId);
        const newLine: CaseDialogLine = mode === 'r' && analysisTargetId
            ? { kind: mode, text, answerId: analysisTargetId }
            : { kind: mode, text };
        const nextLines = [...lines.slice(0, at), newLine, ...lines.slice(at)];
        const grouped = groupLines(nextLines);
        setLines(grouped);
        setDraft('');
        setAnalysisTargetId(null);
        scrollToBottom();

        // 提交提问后自动跳到回答，方便接着记；断法之后回到提问
        if (mode === 'q') onModeChange('a');
        else if (mode === 'r') onModeChange('q');

        await persist(grouped);
    };

    /** 给某条回答补断法：切到断法模式并把目标钉在这条回答上 */
    const startAnalysisFor = (answerId: string) => {
        setAnalysisTargetId(answerId);
        onModeChange('r');
        inputRef.current?.focus();
    };

    /** 点行选中：再点一次取消；编辑中不允许切换选中 */
    const selectLine = (index: number) => {
        if (editingIndex !== null) return;
        setSelectedIndex((current) => (current === index ? null : index));
    };

    /** 开始编辑某条记录：把原文填进草稿 */
    const startEdit = (index: number) => {
        setSelectedIndex(null);
        setAnalysisTargetId(null);
        setEditingText(lines[index]?.text ?? '');
        setEditingIndex(index);
    };

    // 编辑框随内容自动增高（上限由 max-h 兜住）。
    // 每次输入都量高度，但聚焦与光标只在新开编辑时做——
    // 否则在中间插字时每次按键都会被拽到末尾。
    useEffect(() => {
        const el = editRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }, [editingText, editingIndex]);

    useEffect(() => {
        const el = editRef.current;
        if (editingIndex === null || !el) return;
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
    }, [editingIndex]);

    /** 提交编辑：只换文字，保留 kind 与断法归属 */
    const commitEdit = async () => {
        const index = editingIndex;
        if (index === null) return;
        const text = editingText.trim();
        setEditingIndex(null);
        setEditingText('');
        setSelectedIndex(null);
        if (!text || text === lines[index]?.text) return;

        const nextLines = lines.map((line, i) => (i === index ? { ...line, text } : line));
        const grouped = groupLines(nextLines);
        setLines(grouped);
        await persist(grouped);
    };

    const handleDelete = async (index: number) => {
        // 删掉正在编辑的那条时一并收起草稿，避免下标指向别的记录
        if (editingIndex === index) { setEditingIndex(null); setEditingText(''); }
        setSelectedIndex(null);
        const grouped = groupLines(lines.filter((_, i) => i !== index));
        setLines(grouped);
        await persist(grouped);
    };

    if (!isOpen || !caseData) return null;

        const bodyContent = (
            <>
                <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
                    {lines.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            还没有记录，先记下求测人问的第一句
                        </p>
                    ) : (
                        <div>
                            {/* 不做折叠：列表本身可滚动，多此一个「展开更早的 N 条」只会挡在正文前面 */}
                            <ol className="space-y-2">
                                {lines.map((line, absoluteIndex) => {
                                    const style = KIND_STYLE[line.kind];
                                    // 聊天式左右分栏：求测人在左，测算师与断法都在右（同一方发言）
                                    const isMine = line.kind !== 'q';
                                    return (
                                        <li
                                            key={`${line.kind}-${absoluteIndex}`}
                                            onClick={() => selectLine(absoluteIndex)}
                                            className={`flex cursor-pointer flex-col rounded-lg px-2 py-1.5 transition-colors ${isMine ? 'items-end' : 'items-start'} ${selectedIndex === absoluteIndex ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/40'}`}
                                        >
                                            <span className={`mb-1 flex items-center gap-1.5 text-[13px] ${style.label}`}>
                                                <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                                                {MODE_LABEL[line.kind]}
                                                <span className="font-mono text-[11.5px] text-muted-foreground/60">#{absoluteIndex + 1}</span>
                                            </span>
                                            <div className={`max-w-[85%] ${editingIndex === absoluteIndex ? 'w-full' : ''}`}>
                                                {editingIndex === absoluteIndex ? (
                                                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                                        {/* 高度跟着内容长（含自动换行），不再按换行符算 rows，
                                                            否则一整段话只剩两行、正文要竖着翻 */}
                                                        <textarea
                                                            ref={editRef}
                                                            value={editingText}
                                                            onChange={(e) => setEditingText(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void commitEdit(); }
                                                                if (e.key === 'Escape') { setEditingIndex(null); setEditingText(''); }
                                                            }}
                                                            className="max-h-56 min-h-[76px] w-full resize-none overflow-y-auto rounded-lg border border-primary/50 bg-muted/30 px-3 py-2 text-[13.5px] leading-relaxed text-foreground"
                                                        />
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => { setEditingIndex(null); setEditingText(''); }}
                                                                className="rounded-md px-3 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-ring"
                                                            >
                                                                取消
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => void commitEdit()}
                                                                disabled={isSaving || !editingText.trim()}
                                                                className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[12.5px] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 focus-ring"
                                                            >
                                                                <Check className="h-3.5 w-3.5" />保存
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className={`whitespace-pre-wrap px-3 py-2 text-[13.5px] leading-relaxed ${style.text} ${style.box}`}>
                                                        {line.text}
                                                    </p>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>
                    )}
                </div>
    
                {/* 选中某条记录时才出现的操作栏：行内不再常驻按钮，
                    所以正文不会被挤窄，也不会每行重复三颗图标。 */}
                {selectedIndex !== null && lines[selectedIndex] && (
                    <div className="flex shrink-0 items-center gap-1 border-t border-border bg-muted/30 px-4 py-2">
                        <span className="flex-1 whitespace-nowrap text-[12px] text-muted-foreground">
                            已选中 {MODE_LABEL[lines[selectedIndex].kind]}
                            <span className="ml-1 font-mono text-foreground/70">#{selectedIndex + 1}</span>
                        </span>
                        {lines[selectedIndex].kind === 'a' && (
                            <button
                                type="button"
                                onClick={() => startAnalysisFor(lines[selectedIndex].id ?? '')}
                                disabled={isSaving}
                                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[12.5px] text-foreground transition-colors hover:bg-muted focus-ring disabled:opacity-40"
                            >
                                <Plus className="h-3.5 w-3.5" />补断法
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => startEdit(selectedIndex)}
                            disabled={isSaving}
                            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[12.5px] text-foreground transition-colors hover:bg-muted focus-ring disabled:opacity-40"
                        >
                            <Pencil className="h-3.5 w-3.5" />编辑
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleDelete(selectedIndex)}
                            disabled={isSaving}
                            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[12.5px] text-destructive transition-colors hover:bg-destructive/10 focus-ring disabled:opacity-40"
                        >
                            <Trash2 className="h-3.5 w-3.5" />删除
                        </button>
                    </div>
                )}
            </>
        );

        const footerContent = (
            <div className="flex w-full flex-col">
                {/* 下间距与外壳 footer 上间距按端对齐：移动端 SubPage py-3 → pb-2 + 输入区 pt-1 = 12px，
                    桌面 BaseModal p-4 → pb-4 + pt-1 = 20px；曾统一只有 8px，
                    选中断法（primary 边框）且输入框聚焦（focus:border-primary/50）时两条同色边框视觉粘连 */}
                <div className={`flex shrink-0 gap-2 ${isMobile ? 'pb-2' : 'pb-4'}`}>
                        {(['q', 'a', 'r'] as CaseDialogKind[]).map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => { onModeChange(item); setAnalysisTargetId(null); inputRef.current?.focus(); }}
                                className={`flex-1 rounded-lg border py-1.5 text-[12.5px] transition-colors focus-ring ${mode === item
                                    ? item === 'r'
                                        ? 'border-primary bg-primary/10 font-medium text-primary'
                                        : 'border-primary bg-primary/10 text-primary'
                                    : item === 'r'
                                        ? 'border-dashed border-primary/40 text-primary/70 hover:text-primary'
                                        : 'border-border text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {MODE_LABEL[item]}
                            </button>
                        ))}
                    </div>
                    {mode === 'r' && analysisTargetId && (
                        <p className="shrink-0 px-4 pt-2 text-[11.5px] text-primary">
                            断法将挂在：{lines.find((line) => line.id === analysisTargetId)?.text.slice(0, 20) ?? ''}
                            <button type="button" onClick={() => setAnalysisTargetId(null)} className="ml-2 underline hover:no-underline">取消</button>
                        </p>
                    )}
                    {/* 输入区不画分割线：与模式按钮之间只靠留白分开，
                        避免按钮被上下两条线夹住显得局促。
                        输入框独占整行，操作按钮另起一行贴右下，不与输入争宽度。
                        注意别在外面再包一层描边——全局样式会给聚焦的 textarea 画 focus-ring，
                        嵌套会套成双层框。 */}
                    <div className="shrink-0 space-y-2 pt-1">
                        <textarea
                            ref={inputRef}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    void handleSend();
                                }
                            }}
                            placeholder={mode === 'q' ? '求测人问了什么？' : mode === 'a' ? '你的回答…' : analysisTargetId ? '写下这一问的断法…' : '这一局的断法…'}
                            className="max-h-40 min-h-[72px] w-full resize-none overflow-y-auto rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50"
                        />
                        <div className="flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate text-[11.5px] text-muted-foreground">
                                共 {turnCount} 轮
                            </span>
                            <div className="flex shrink-0 items-center gap-2">
                                {error && <span className="mr-1 text-[11.5px] text-destructive">{error}</span>}
                                <button
                                    type="button"
                                    onClick={() => { setDraft(''); setAnalysisTargetId(null); }}
                                    disabled={isSaving || !draft.trim()}
                                    className="rounded-lg border border-border px-4 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 focus-ring"
                                >
                                    取消
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleSend()}
                                    disabled={isSaving || !draft.trim()}
                                    aria-label={`提交${MODE_LABEL[mode]}`}
                                    className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 focus-ring"
                                >
                                    {isSaving ? '保存中…' : '记录'}
                                </button>
                            </div>
                        </div>
                    </div>
            </div>
        );

    // 移动端：统一二级页壳（返回手势由 SubPage 接管 + 统一页头），整页推入而不是浮层；
    // 桌面端：右侧抽屉。写断法要对照左边的盘面，居中弹窗会把盘面整个盖住。
    if (isMobile) {
        return (
            <SubPage
                isOpen={isOpen}
                onClose={onClose}
                title="案例详情"
                bodyClassName="overflow-hidden flex flex-col"
                footer={footerContent}
            >
                {bodyContent}
            </SubPage>
        );
    }

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="案例详情"
            titleIcon={<SquarePen className="h-5 w-5" />}
            bodyClassName="overflow-hidden flex flex-col"
            footer={footerContent}
            responsiveDrawer
            // 与右侧宫位详情栏（QimenDesktopLayout 的 w-72 xl:w-80 2xl:w-96）同宽：
            // 更宽就会盖住九宫盘的右列，写断法时反而看不见要对照的宫位。
            // 宽度必须带 md: 前缀——抽屉外壳同时挂着 w-full，无前缀的 w-72 与它同级，
            // 谁生效取决于 Tailwind 的产出顺序，不可靠；带响应式前缀的规则落在
            // @media 块里、排在所有基础工具类之后，才能稳定压过 w-full。
            // 这个 BaseModal 只在非移动端渲染（isMobile 已提前走 SubPage），md: 及以上始终成立。
            drawerWidth="md:w-72 xl:w-80 2xl:w-96 md:max-w-[85vw]"
        >
            {bodyContent}
        </BaseModal>
    );
}
