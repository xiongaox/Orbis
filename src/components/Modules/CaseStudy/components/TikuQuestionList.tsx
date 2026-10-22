import type { TikuQuestion, TikuVolume } from '../../../../lib/caseStudy/tikuParser';

/** 题干：首行是问句，其余行是补充说明 */
function Stem({ stem }: { stem: string }) {
    const [first, ...rest] = stem.split('\n');
    return (
        <>
            <h3 className="font-serif text-[16px] lg:text-[17px] font-semibold text-foreground leading-relaxed">
                {first}
            </h3>
            {rest.length > 0 && (
                <p className="text-[13px] text-muted-foreground leading-relaxed mt-1">
                    {rest.join(' ')}
                </p>
            )}
        </>
    );
}

interface TikuQuestionListProps {
    volume: TikuVolume;
    answers: Record<string, { picked: string | null; revealed: boolean }>;
    onPick: (questionId: string, key: string) => void;
}

/** 命例卷下的题目列表：点选项就地批改 */
export default function TikuQuestionList({ volume, answers, onPick }: TikuQuestionListProps) {
    return (
        <div className="divide-y divide-border/40">
            {volume.questions.map((q) => (
                <QuestionBlock
                    key={q.id}
                    question={q}
                    state={answers[q.id]}
                    onPick={onPick}
                />
            ))}
        </div>
    );
}

function QuestionBlock({
    question,
    state,
    onPick,
}: {
    question: TikuQuestion;
    state?: { picked: string | null; revealed: boolean };
    onPick: (questionId: string, key: string) => void;
}) {
    const revealed = !!state?.revealed;
    const picked = state?.picked ?? null;
    const correct = picked === question.answer;

    return (
        <div className="py-4 first:pt-4 last:pb-4">
            <div className="flex items-baseline gap-2 mb-2">
                <span className="flex-shrink-0 font-mono text-[15px] font-semibold text-muted-foreground">
                    Q{question.no}
                </span>
                <div className="flex-1 min-w-0">
                    <Stem stem={question.stem} />
                </div>
            </div>

            <div className="flex flex-col gap-0.5">
                {question.options.map((opt) => {
                    const isPicked = picked === opt.key;
                    const isAnswer = revealed && opt.key === question.answer;
                    const isWrongPick = revealed && isPicked && !isAnswer;
                    // 未作答就交卷：正确答案也用红色标出，提示这题丢了
                    const unanswered = revealed && !picked;
                    const isMissed = isAnswer && unanswered;
                    const isWrong = isWrongPick || isMissed;
                    const dimmed = revealed && !isPicked && !isAnswer;

                    return (
                        <button
                            key={opt.key}
                            type="button"
                            onClick={() => onPick(question.id, opt.key)}
                            disabled={revealed}
                            className={`flex items-start gap-2.5 px-2.5 py-2 text-left rounded-lg transition-colors ${
                                isWrong
                                    ? 'bg-destructive/10'
                                    : isAnswer || isPicked
                                        ? 'bg-primary/10'
                                        : 'hover:bg-muted/40'
                            } ${dimmed ? 'opacity-45' : ''}`}
                        >
                            {/* 24px 圆圈与 15px×leading-relaxed 的选项首行（约 24.4px）中心对齐；选中/答对为主题色填充，错选与漏答为红色 */}
                            <span
                                className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full border font-mono text-sm font-semibold ${
                                    isWrong
                                        ? 'bg-destructive border-destructive text-destructive-foreground'
                                        : isAnswer || isPicked
                                            ? 'bg-primary border-primary text-primary-foreground'
                                            : 'border-border text-muted-foreground'
                                }`}
                            >
                                {opt.key}
                            </span>
                            <span className="flex-1 text-[15px] leading-relaxed text-foreground">
                                {opt.text}
                            </span>
                        </button>
                    );
                })}
            </div>

            {revealed && (
                <div
                    className={`mt-2 px-3 py-2 rounded-lg text-[13px] leading-relaxed flex items-center gap-2 ${
                        correct
                            ? 'bg-primary/10 text-primary border border-primary/25'
                            : 'bg-destructive/10 text-destructive border border-destructive/25'
                    }`}
                >
                    <span className="font-bold">
                        {correct ? '回答正确' : picked ? '回答错误' : '未作答'}
                    </span>
                    <span>
                        正确答案是 {question.answer}
                        {!correct && picked && `，你的答案是 ${picked}`}
                    </span>
                </div>
            )}
        </div>
    );
}
