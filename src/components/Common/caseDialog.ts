/**
 * 案例正文的数据转换：三段文本 ⇄「提问 / 回答 / 断法」记录流。
 *
 * 之所以要这一层：日常断局是在聊天里一问一答，界面按记录流组织更贴合实际使用；
 * 而既有数据、导入导出、备份与列表卡片都按 description / feedback / analysis 三个字段工作，
 * 因此不做数据迁移，只在读写两端转换——旧案例的整段文本打开即可继续追加。
 *
 * 结构上的硬约束：**断法一定挂在某条回答之后**。
 * 记录流按时间顺序排列，但渲染与落库都以「回答紧跟其提问、断法紧跟其回答」为准，
 * 因此 uiLines 会先按 q/a/r 归位（见 groupLines），再交给界面；
 * 输入任何一条时都用 locateLine 找落点，而不是简单地 append 到末尾，
 * 否则断法会插到一条还没被回答的提问后面（语义上说不通）。
 */
export type CaseDialogKind = 'q' | 'a' | 'r';

export interface CaseDialogLine {
    kind: CaseDialogKind;
    text: string;
    /** 行标识：界面上给某条回答补断法时用它指定目标（载入时按序号生成即可） */
    id?: string;
    /** 仅断法使用：明确挂到哪条回答（回答的 id）后，回顾补记才不会挂错 */
    answerId?: string;
}

/** 兼容旧值形态：字段既可能是字符串，也可能是历史上的字符串数组 */
function toDialogText(value: string | string[] | null | undefined): string {
    if (Array.isArray(value)) return value.filter((item) => typeof item === 'string' && item.trim()).join('\n\n');
    return typeof value === 'string' ? value : '';
}

/**
 * 按段落拆成「问 / 回答 / 断法」记录流。
 *
 * 优先读 `dialog_lines`：那是界面写回的顺序流，断法挂在谁下面一目了然。
 * 没有它（旧案例、导入导出、外部工具写入）才退回三段文本的还原——
 * 三个字段各自按空行分段，段落数不齐时多余的提问继续排下去，
 * 多余的断法与回答并入末尾（旧数据正是「整段描述 + 整段断法/反馈」的形态）。
 *
 * 之所以要存顺序流：三段文本只记 kind，不记归属，
 * 「答1 答2 断法2」回读时无法判断断法属于谁，位置必然丢。
 */
export function dialogLinesFromCase(source: {
    description?: string | string[];
    feedback?: string | string[];
    analysis?: string | string[];
    dialog_lines?: CaseDialogLine[];
} | null | undefined): CaseDialogLine[] {
    if (Array.isArray(source?.dialog_lines) && source.dialog_lines.length) {
        return source.dialog_lines.map((line, index) => ({ ...line, id: `${line.kind}-${index}` }));
    }

    const split = (value: string | string[] | undefined) => toDialogText(value)
        .split(/\n{2,}/)
        .map((text) => text.trim())
        .filter(Boolean);

    const questions = split(source?.description);
    // feedback 存的是「回答」，analysis 存的是「断法」，别被字段名顺序带偏
    const answers = split(source?.feedback);
    const analysis = split(source?.analysis);

    const questionCount = Math.max(questions.length, 1);
    const lines: CaseDialogLine[] = [];
    for (let index = 0; index < questionCount; index += 1) {
        if (questions[index]) lines.push({ kind: 'q', text: questions[index] });
        if (answers[index]) lines.push({ kind: 'a', text: answers[index] });
        if (analysis[index]) lines.push({ kind: 'r', text: analysis[index] });
    }

    // 提问用尽后仍有余量：并入末尾，保证一个字都不丢
    if (answers.length > questionCount || analysis.length > questionCount) {
        answers.slice(questionCount).forEach((text) => lines.push({ kind: 'a', text }));
        analysis.slice(questionCount).forEach((text) => lines.push({ kind: 'r', text }));
    }

    // 给每行配稳定 id：界面据此指定断法挂到哪条回答上
    return lines.map((line, index) => ({ ...line, id: `${line.kind}-${index}` }));
}

/**
 * 写回：三个文本字段（给列表卡片、导出、备份、外部工具看的）
 * 加上 `dialog_lines`（给界面自己读的完整顺序与归属）。
 * 丢掉 answerId 会让断法位置在下次打开时丢失，所以两个都要写。
 */
export function dialogFieldsFromLines(lines: CaseDialogLine[]): {
    description: string;
    feedback: string;
    analysis: string;
    dialog_lines: CaseDialogLine[];
} {
    const join = (kind: CaseDialogKind) => lines
        .filter((line) => line.kind === kind)
        .map((line) => line.text.trim())
        .filter(Boolean)
        .join('\n\n');

    // 字段语义固定为：提问 → description、回答 → feedback、断法 → analysis。
    // 注意 'a' 是「回答」、'r' 是「断法」，与字面顺序相反，改这里务必对照 MODE_LABEL。
    return {
        description: join('q'),
        feedback: join('a'),
        analysis: join('r'),
        // id 是载入时按行号现生成的，存进去只会误导下次读取，这里一并剥掉
        dialog_lines: lines.map(({ kind, text, answerId }) => (
            answerId ? { kind, text, answerId } : { kind, text }
        )),
    };
}

/**
 * 把记录流按「提问 → 回答 → 断法」归位。
 *
 * 三条归属规则（决定断法长在哪）：
 * - 回答挂到**最早的、还没有回答的**提问下。这样「先记两问再补第一问的回答」
 *   不会把回答错挂到第二问；
 * - 断法挂到**它前面最近的那条回答**之后（哪怕中间又插了新的提问）——
 *   「Q1 A1 Q2 断法」里的断法属于 A1，不该跑到 Q2 后面；
 * - 提问前面没有可挂的回答时，才退到当前提问下兜底，保证不丢字。
 */
export function groupLines(lines: CaseDialogLine[]): CaseDialogLine[] {
    // 断法归属：优先用它自己带的 answerId（回顾补记时由界面指定），
    // 否则落到「前面最近的、还没有断法的那条回答」——保证「问1 答1 问2 答2 断法2」
    // 里的断法挂到答2，而不是因为答1 缺断法就跑去找它。
    const questions: CaseDialogLine[][] = [];
    const answers: { line: CaseDialogLine; owner: number }[] = [];
    let currentQuestion = -1;
    let pendingAnswer = -1;

    const hasAnalysisAfter = (answerIndex: number) => {
        const { owner } = answers[answerIndex];
        return answers.some((item, index) => index > answerIndex && item.owner === owner && item.line.kind === 'r');
    };

    /** 上一条「还没配断法」的回答（往回找），没有则 -1 */
    const previousPending = (from: number) => {
        for (let index = Math.min(from, answers.length - 1); index >= 0; index -= 1) {
            if (answers[index].line.kind === 'a' && !hasAnalysisAfter(index)) return index;
        }
        return -1;
    };

    lines.forEach((line) => {
        if (line.kind === 'q') {
            questions.push([line]);
            currentQuestion = questions.length - 1;
            return;
        }
        if (line.kind === 'a') {
            if (currentQuestion < 0) {
                questions.push([]);
                currentQuestion = questions.length - 1;
            }
            answers.push({ line, owner: currentQuestion });
            pendingAnswer = answers.length - 1;
            return;
        }

        // 断法：显式指定了目标回答就用它，否则找最近的缺断法回答
        let target = -1;
        if (line.answerId) {
            target = answers.findIndex((item) => item.line.id === line.answerId && item.line.kind === 'a');
        }
        if (target < 0) target = pendingAnswer >= 0 ? pendingAnswer : previousPending(answers.length - 1);
        if (target < 0) {
            // 前面还没有任何回答：退到当前提问下兜底，保证不丢字
            if (currentQuestion < 0) {
                questions.push([]);
                currentQuestion = questions.length - 1;
            }
            answers.push({ line, owner: currentQuestion });
            return;
        }

        answers.splice(target + 1, 0, { line, owner: answers[target].owner });
        pendingAnswer = previousPending(target);
    });

    if (!questions.length) questions.push([]);

    // 把每条回答（及其断法）贴到它所属提问的正后方；提问之间保持原有先后
    const answerGroups = questions.map(() => [] as CaseDialogLine[]);
    answers.forEach(({ line, owner }) => {
        const index = Math.min(Math.max(owner, 0), answerGroups.length - 1);
        answerGroups[index].push(line);
    });

    const result: CaseDialogLine[] = [];
    questions.forEach((group, index) => {
        result.push(...group, ...answerGroups[index]);
    });

    return result;
}

/**
 * 找「最近的、还没有配断法的那条回答」在记录流中的下标；没有就返回 -1。
 *
 * 界面靠它决定新断法挂到哪儿——只认最后一条回答会挂错：
 * 「问1 答1 问2 答2」里答2 才是缺断法的那条。
 */
export function findAnswerAwaitingAnalysis(lines: CaseDialogLine[]): number {
    // 从后往前扫，返回第一条「后面还没跟断法」的回答
    for (let index = lines.length - 1; index >= 0; index -= 1) {
        if (lines[index].kind !== 'a') continue;
        let hasAnalysis = false;
        // 只看到下一个提问为止：跨过提问的断法属于别人
        for (let cursor = index + 1; cursor < lines.length && lines[cursor].kind !== 'q'; cursor += 1) {
            if (lines[cursor].kind === 'r') { hasAnalysis = true; break; }
        }
        if (!hasAnalysis) return index;
    }
    return -1;
}

/**
 * 新记录该插到哪里（插入后仍会走 groupLines 归位，这里只需要一个不会错位的落点）。
 * - 提问：末尾（新的一轮）
 * - 回答：最后一个提问之后——它属于当前这一问，不能塞回上一轮
 * - 断法：缺断法的那条回答之后；全都有断法时退到最后一条回答之后
 *
 * answerId 是回顾补记时的显式目标：纯靠「最近的缺断法回答」会猜错——
 * `问1 答1 问2 答2` 之后补写断法 1，会被挂到答2 上（用户报的 bug）。
 * 因此界面在给某条回答补断法时传入该回答的行号。
 */
export function locateLine(lines: CaseDialogLine[], kind: CaseDialogKind, answerId?: string | null): number {
    if (kind === 'q') return lines.length;
    const lastQuestion = lines.map((line) => line.kind).lastIndexOf('q');
    if (kind === 'a') return lastQuestion + 1;
    if (answerId) {
        const matched = lines.findIndex((line) => line.id === answerId && line.kind === 'a');
        if (matched >= 0) return matched + 1;
    }
    const awaiting = findAnswerAwaitingAnalysis(lines);
    if (awaiting >= 0) return awaiting + 1;
    const lastAnswer = lines.map((line) => line.kind).lastIndexOf('a');
    if (lastAnswer >= 0) return lastAnswer + 1;
    return lastQuestion + 1;
}

/**
 * 当前该记哪一种，顺着记录流找第一个不完整的缺口：
 * 提问后给「回答」，回答后给「断法」，断法之后回到「提问」开新的一轮。
 * 只作建议——用户可以随时手点别的模式，界面只在该模式下不去打扰。
 */
export function suggestNextKind(lines: CaseDialogLine[]): CaseDialogKind {
    if (!lines.length) return 'q';
    const last = lines[lines.length - 1];
    if (last.kind === 'q') return 'a';
    if (last.kind === 'a') return 'r';
    return 'q';
}
