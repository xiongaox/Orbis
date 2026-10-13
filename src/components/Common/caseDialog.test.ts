import { describe, expect, it } from 'vitest';
import {
    dialogFieldsFromLines,
    dialogLinesFromCase,
    groupLines,
    locateLine,
    suggestNextKind,
    type CaseDialogKind,
    type CaseDialogLine,
} from './caseDialog';

/** 只取三个文本字段做断言：dialog_lines 是界面的顺序流，另有专门用例覆盖 */
const textFieldsOf = (lines: CaseDialogLine[]) => {
    const { description, feedback, analysis } = dialogFieldsFromLines(lines);
    return { description, feedback, analysis };
};

describe('案例正文与三个字段的互转', () => {
    it('旧案例整段文本还原成「提问 + 回答 + 断法」，追加记录后仍能写回', () => {
        // 旧字段语义：description=追问、feedback=回答、analysis=断法
        const legacy = {
            description: '想问下个月能否顺利调动到总公司？',
            feedback: '已成功调动',
            analysis: '值符落宫…',
        };

        // id 由载入时按行号生成，这里只比对语义字段
        expect(dialogLinesFromCase(legacy).map(({ kind, text }) => ({ kind, text }))).toEqual([
            { kind: 'q', text: '想问下个月能否顺利调动到总公司？' },
            { kind: 'a', text: '已成功调动' },
            { kind: 'r', text: '值符落宫…' },
        ]);

        const lines: CaseDialogLine[] = [
            ...dialogLinesFromCase(legacy),
            { kind: 'q', text: '入职后发展如何？' },
            { kind: 'a', text: '会上任关键岗。' },
            { kind: 'r', text: '入职三月内换岗。' },
        ];

        expect(textFieldsOf(lines)).toEqual({
            description: '想问下个月能否顺利调动到总公司？\n\n入职后发展如何？',
            feedback: '已成功调动\n\n会上任关键岗。',
            analysis: '值符落宫…\n\n入职三月内换岗。',
        });
    });

    it('空案例拆出空记录，且不产出任何字段内容', () => {
        const lines = dialogLinesFromCase(null);
        expect(lines).toEqual([]);
        expect(textFieldsOf(lines)).toEqual({ description: '', feedback: '', analysis: '' });
    });

    it('段落数不齐时，多出的断语与反馈并入末尾而不是被丢掉', () => {
        const lines = dialogLinesFromCase({
            description: '第一问\n\n第二问',
            analysis: '断一\n\n断二\n\n断三',
            feedback: '回答一',
        });

        expect(textFieldsOf(lines)).toEqual({
            description: '第一问\n\n第二问',
            analysis: '断一\n\n断二\n\n断三',
            feedback: '回答一',
        });
    });
});

describe('断法必须跟在自己的回答之后', () => {
    it('回答属于当前这一问，断法紧跟自己的回答', () => {
        // 先记两问，最后一条回答与断法都算在第二问上
        const grouped = groupLines([
            { kind: 'q', text: '第一问' },
            { kind: 'q', text: '第二问' },
            { kind: 'a', text: '第二答' },
            { kind: 'r', text: '第二断' },
        ]);

        expect(grouped.map(({ kind, text }) => ({ kind, text }))).toEqual([
            { kind: 'q', text: '第一问' },
            { kind: 'q', text: '第二问' },
            { kind: 'a', text: '第二答' },
            { kind: 'r', text: '第二断' },
        ]);
    });

    it('第二问还没回答就补第一问的断法：断法仍跟第一答，第二问排到最后', () => {
        // 截图里的真实场景：Q1 → A1 → Q2 → 断法，断法属于 A1
        const grouped = groupLines([
            { kind: 'q', text: '第一问' },
            { kind: 'a', text: '第一答' },
            { kind: 'q', text: '第二问' },
            { kind: 'r', text: '第一断' },
        ]);

        expect(grouped.map(({ kind, text }) => ({ kind, text }))).toEqual([
            { kind: 'q', text: '第一问' },
            { kind: 'a', text: '第一答' },
            { kind: 'r', text: '第一断' },
            { kind: 'q', text: '第二问' },
        ]);
    });

    it('回话式反馈也挂在它所属的那条回答之后', () => {
        const grouped = groupLines([
            { kind: 'q', text: '第一问' },
            { kind: 'a', text: '第一答' },
            { kind: 'q', text: '第二问' },
            { kind: 'r', text: '事后反馈' },
        ]);

        expect(grouped.map((line) => line.kind)).toEqual(['q', 'a', 'r', 'q']);
    });

    it('定位规则：提问进末尾，回答跟最后一个提问，断法跟最后一条回答', () => {
        const lines: CaseDialogLine[] = [
            { kind: 'q', text: 'Q1' },
            { kind: 'a', text: 'A1' },
            { kind: 'q', text: 'Q2' },
        ];
        expect(locateLine(lines, 'q')).toBe(3);
        // 回答属于当前这一问（Q2），落在它之后
        expect(locateLine(lines, 'a')).toBe(3);
        // 断法跟最后一条回答（A1），插在它之后由 groupLines 归位到 Q1 块内
        expect(locateLine(lines, 'r')).toBe(2);
        // 回答紧跟在 Q1 之后（此时还没有断法要避让）
        expect(locateLine([
            { kind: 'q', text: 'Q1' },
            { kind: 'a', text: 'A1' },
        ], 'a')).toBe(1);
    });

    it('下一条建议：提问 → 回答 → 断法 → 提问', () => {
        expect(suggestNextKind([])).toBe('q');
        expect(suggestNextKind([{ kind: 'q', text: 'Q1' }])).toBe('a');
        expect(suggestNextKind([
            { kind: 'q', text: 'Q1' },
            { kind: 'a', text: 'A1' },
        ])).toBe('r');
        expect(suggestNextKind([
            { kind: 'q', text: 'Q1' },
            { kind: 'a', text: 'A1' },
            { kind: 'r', text: 'R1' },
        ])).toBe('q');
        // 只补了断法、还没回答的提问：建议先补回答
        expect(suggestNextKind([
            { kind: 'q', text: 'Q1' },
            { kind: 'a', text: 'A1' },
            { kind: 'r', text: 'R1' },
            { kind: 'q', text: 'Q2' },
        ])).toBe('a');
    });

    it('归位不改内容：往返一次后三个字段逐段相等', () => {
        const source = { description: 'Q1\n\nQ2', analysis: '断1', feedback: '答1' };
        const roundTrip = textFieldsOf(groupLines(dialogLinesFromCase(source)));
        expect(roundTrip).toEqual(source);
    });
});

describe('截图的会话流程（提交即归位）', () => {
    /** 与弹窗一致：先按 locateLine 落点插入，再 groupLines 归位 */
    const send = (lines: CaseDialogLine[], kind: CaseDialogKind, text: string, answerId?: string) => {
        const at = locateLine(lines, kind, answerId);
        return groupLines([...lines.slice(0, at), { kind, text, answerId }, ...lines.slice(at)]);
    };

    it('问 → 答 → 断法 → 问 → 答 → 断法，断法始终紧跟自己那条回答', () => {
        let lines: CaseDialogLine[] = [];
        lines = send(lines, 'q', '现在有俩人追我');
        lines = send(lines, 'a', '因为都是空亡了');
        lines = send(lines, 'r', '两个都建议先谈着看看');
        lines = send(lines, 'q', '同龄是96年，大三岁是93年');
        lines = send(lines, 'a', '看宫位对得上');
        lines = send(lines, 'r', '后一个更稳');

        expect(lines.map((line) => line.kind)).toEqual(['q', 'a', 'r', 'q', 'a', 'r']);
        // 提问 → description，回答 → feedback，断法 → analysis（与旧的三字段语义一致）
        expect(textFieldsOf(lines)).toEqual({
            description: '现在有俩人追我\n\n同龄是96年，大三岁是93年',
            feedback: '因为都是空亡了\n\n看宫位对得上',
            analysis: '两个都建议先谈着看看\n\n后一个更稳',
        });
    });

    it('问答问答之后写断法：断法跟最后那条回答，不会跑去当第一条回答的断法', () => {
        let lines: CaseDialogLine[] = [];
        lines = send(lines, 'q', '问1');
        lines = send(lines, 'a', '答1');
        lines = send(lines, 'q', '问2');
        lines = send(lines, 'a', '答2');
        // 答1 还没有断法，但这条断法是给答2 的
        lines = send(lines, 'r', '断法2');

        expect(lines.map((line) => line.kind + line.text)).toEqual(
            ['q问1', 'a答1', 'q问2', 'a答2', 'r断法2'],
        );
    });

    it('回顾补记时按 answerId 指定目标，断法挂到指定的那条回答', () => {
        let lines: CaseDialogLine[] = [];
        lines = send(lines, 'q', '问1');
        lines = send(lines, 'a', '答1');
        lines = send(lines, 'q', '问2');
        lines = send(lines, 'a', '答2');
        lines = send(lines, 'r', '断法2');

        const answer1 = lines.find((line) => line.kind === 'a')!;
        lines = send(lines, 'r', '断法1', answer1.id);

        expect(lines.map((line) => line.kind + line.text)).toEqual(
            ['q问1', 'a答1', 'r断法1', 'q问2', 'a答2', 'r断法2'],
        );
    });

    it('存盘再打开：断法归属不丢（三段文本只记 kind，必须靠 dialog_lines）', () => {
        let lines: CaseDialogLine[] = [
            { kind: 'q', text: '问1', id: 'q-0' },
            { kind: 'a', text: '答1', id: 'a-1' },
            { kind: 'q', text: '问2', id: 'q-2' },
            { kind: 'a', text: '答2', id: 'a-3' },
        ];
        const answer2 = lines.find((line) => line.id === 'a-3')!;
        const at = locateLine(lines, 'r', answer2.id);
        lines = groupLines([...lines.slice(0, at), { kind: 'r', text: '断法2', answerId: answer2.id }, ...lines.slice(at)]);
        expect(lines.map((line) => line.kind + line.text)).toEqual(['q问1', 'a答1', 'q问2', 'a答2', 'r断法2']);

        // 模拟落库再读取
        const stored = dialogFieldsFromLines(lines);
        const reopened = groupLines(dialogLinesFromCase(stored));
        expect(reopened.map((line) => line.kind + line.text)).toEqual(['q问1', 'a答1', 'q问2', 'a答2', 'r断法2']);
    });

    it('编辑正文不改 kind 与断法归属', () => {
        const lines: CaseDialogLine[] = [
            { kind: 'q', text: '问1', id: 'q-0' },
            { kind: 'a', text: '答1', id: 'a-1' },
            { kind: 'r', text: '断法1', id: 'r-2', answerId: 'a-1' },
            { kind: 'q', text: '问2', id: 'q-3' },
            { kind: 'a', text: '答2', id: 'a-4' },
        ];
        // 把断法文字改掉（界面只替换 text 字段）
        const edited = lines.map((line, i) => (i === 2 ? { ...line, text: '断法1（改过）' } : line));
        const grouped = groupLines(edited);

        expect(grouped.map((line) => line.kind + line.text)).toEqual(
            ['q问1', 'a答1', 'r断法1（改过）', 'q问2', 'a答2'],
        );
    });

    it('改归属：断法按 answerId 换到另一条回答下', () => {
        // 答1 带着断法，答2 没有；把断法的 answerId 改指答2
        const before: CaseDialogLine[] = [
            { kind: 'q', text: '问1', id: 'q-0' },
            { kind: 'a', text: '答1', id: 'a-1' },
            { kind: 'r', text: '断法', id: 'r-2' },
            { kind: 'q', text: '问2', id: 'q-3' },
            { kind: 'a', text: '答2', id: 'a-4' },
        ];
        const targetIndex = before.findIndex((line) => line.id === 'a-4');
        const moved = { ...before[2], answerId: 'a-4' };
        const rest = before.filter((_, index) => index !== 2);
        const next = groupLines([...rest.slice(0, targetIndex), moved, ...rest.slice(targetIndex)]);

        expect(next.map((line) => line.kind + line.text)).toEqual(
            ['q问1', 'a答1', 'q问2', 'a答2', 'r断法'],
        );
    });

    it('第二问还没回答就补第一问的断法，断法不会掉到第二问后面', () => {
        let lines: CaseDialogLine[] = [
            { kind: 'q', text: '第一问' },
            { kind: 'a', text: '第一答' },
        ];
        lines = send(lines, 'q', '第二问');
        lines = send(lines, 'r', '第一问的断法');

        expect(lines.map((line) => line.text)).toEqual(['第一问', '第一答', '第一问的断法', '第二问']);
    });
});
