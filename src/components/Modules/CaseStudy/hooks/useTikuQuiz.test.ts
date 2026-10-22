import { describe, expect, it } from 'vitest';
import { tallyTiku, type TikuAnswerState } from './useTikuQuiz';
import type { TikuQuestion } from '../../../../lib/caseStudy/tikuParser';

const questions = [
    { id: 'q1', answer: 'B' },
    { id: 'q2', answer: 'C' },
    { id: 'q3', answer: 'A' },
] as TikuQuestion[];

const state = (picked: string | null, revealed: boolean): TikuAnswerState => ({ picked, revealed });

describe('tallyTiku', () => {
    it('交卷模式下已选与已揭示分开计，交卷前不能泄露答对数', () => {
        const answers = { q1: state('B', false), q2: state('D', false) };
        expect(tallyTiku(questions, answers)).toEqual({
            answered: 2, revealed: 0, right: 0, total: 3,
        });
    });

    it('交卷后按揭示状态统计答对数，未作答的题算错', () => {
        const answers = {
            q1: state('B', true),
            q2: state('D', true),
            q3: state(null, true),
        };
        expect(tallyTiku(questions, answers)).toEqual({
            answered: 2, revealed: 3, right: 1, total: 3,
        });
    });

    it('逐题模式下选完即揭示，答对数随作答实时更新', () => {
        const answers = { q1: state('B', true) };
        expect(tallyTiku(questions, answers)).toEqual({
            answered: 1, revealed: 1, right: 1, total: 3,
        });
    });
});
