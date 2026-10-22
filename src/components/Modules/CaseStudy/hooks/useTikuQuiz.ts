import { useCallback, useMemo, useState } from 'react';
import type { TikuQuestion } from '../../../../lib/caseStudy/tikuParser';

/** 每道题的作答状态 */
export interface TikuAnswerState {
    picked: string | null;
    revealed: boolean;
}

/** 答题进度统计：已选 / 已揭示 / 答对，分开计数——交卷模式下两者并不相等 */
export function tallyTiku(
    questions: TikuQuestion[],
    answers: Record<string, TikuAnswerState>,
) {
    let answered = 0;
    let revealed = 0;
    let right = 0;
    for (const q of questions) {
        const a = answers[q.id];
        if (a?.picked) answered += 1;
        if (a?.revealed) {
            revealed += 1;
            if (a.picked === q.answer) right += 1;
        }
    }
    return { answered, revealed, right, total: questions.length };
}

/**
 * 答题模式：
 * - instant：选完立即批改，逐题出对错（研读复盘用）
 * - exam：只记录选择，全部答完交卷后才出答案与总分（模拟大赛，单张命例卷）
 * - edition：整届模考——本届全部命例卷连着做，做完整届统一交卷评分
 */
export type TikuQuizMode = 'instant' | 'exam' | 'edition';

/**
 * 答题状态：按题记录选择与是否已揭示答案。
 * 不写存储——题库只是研读辅助，切走即重置是可接受的行为；
 * 若后续要跨会话保留进度，再换成 readingProgress 那套存储。
 *
 * questions 是默认题集（逐题 / 交卷模式下的当前命例卷）；
 * editionQuestions 是整届题集（整届模考用），传入后才启用 edition 模式。
 */
export function useTikuQuiz(questions: TikuQuestion[], editionQuestions?: TikuQuestion[]) {
    const [answers, setAnswers] = useState<Record<string, TikuAnswerState>>({});
    const [mode, setMode] = useState<TikuQuizMode>('instant');
    const [submitted, setSubmitted] = useState(false);

    // 整届模考作用于全届题目，其余模式作用于当前命例卷
    const active = mode === 'edition' && editionQuestions ? editionQuestions : questions;

    // 换题集（切命例 / 切届）时清空，避免旧的作答串到新题集上
    const activeIds = useMemo(() => active.map((q) => q.id).join(','), [active]);
    const [lastIds, setLastIds] = useState(activeIds);
    if (lastIds !== activeIds) {
        setLastIds(activeIds);
        setAnswers({});
        setSubmitted(false);
    }

    const pick = useCallback(
        (questionId: string, key: string) => {
            setAnswers((prev) => {
                // 已揭示答案的题不再改选，避免答案被覆盖后与批改结果不一致
                if (prev[questionId]?.revealed) return prev;
                // 立即模式选完就揭示；考试模式只记选择，等交卷
                return { ...prev, [questionId]: { picked: key, revealed: mode === 'instant' } };
            });
        },
        [mode],
    );

    /** 考试 / 整届模式交卷：一次性揭示全部题目（含未作答的题，便于对答案） */
    const submit = useCallback(() => {
        setSubmitted(true);
        setAnswers((prev) => {
            const next: Record<string, TikuAnswerState> = {};
            for (const q of active) {
                const state = prev[q.id];
                next[q.id] = { picked: state?.picked ?? null, revealed: true };
            }
            return next;
        });
    }, [active]);

    const reset = useCallback(() => {
        setAnswers({});
        setSubmitted(false);
    }, []);

    /** 切模式时清空作答：两种模式的批改时机不同，混着用会出现半揭示状态 */
    const changeMode = useCallback((next: TikuQuizMode) => {
        setMode(next);
        setAnswers({});
        setSubmitted(false);
    }, []);

    const stats = useMemo(() => tallyTiku(active, answers), [active, answers]);

    return { answers, mode, changeMode, submitted, pick, submit, reset, stats };
}
