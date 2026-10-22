import { describe, expect, it } from 'vitest';
import { parseTikuEdition, parseTikuBirthTime } from './tikuParser';

const md = `# 全球算命师大赛 第17届（2026）

提纲
- 男命：公历1982年6月12日 早上6点50分 香港出生
- 命题提供者：香港-林千博师傅（子平八字）

Q1：此命学历如何？性格如何？
A 小学
B 中五
C 大学
D 博士
Q1正确答案是：B

---

提纲
- 男命：公历1982年6月12日 早上6点50分 香港出生
- 命题提供者：香港-林千博师傅（子平八字）

Q2：此命的婚姻如何？
A 一直单身
B 婚姻美满
C 已经离婚
D 离婚后再婚
Q2正确答案是：C
`;

describe('parseTikuEdition', () => {
    it('同一命例的多道题聚成一张卷，命例信息只留一份', () => {
        const ed = parseTikuEdition('全球算命师大赛_第17届_2026.md', md);
        expect(ed).not.toBeNull();
        expect(ed!.volumes).toHaveLength(1);
        expect(ed!.volumes[0].questions.map((q) => q.no)).toEqual([1, 2]);
        expect(ed!.volumes[0].questions[0].answer).toBe('B');
        expect(ed!.volumes[0].questions[0].options).toHaveLength(4);
        expect(ed!.volumes[0].provider).toBe('香港-林千博师傅（子平八字）');
    });

    it('缺公历的命例给出 null 出生时间，不臆造时间', () => {
        const ed = parseTikuEdition('全球算命师大赛_第17届_2026.md', md);
        expect(ed!.volumes[0].birthTime).toEqual({
            year: 1982, month: 6, day: 12, hour: 6, minute: 50,
        });
    });
});

describe('parseTikuBirthTime', () => {
    it('解析「公历…日 早上6点50分」', () => {
        expect(parseTikuBirthTime('公历1982年6月12日 早上6点50分 香港出生'))
            .toEqual({ year: 1982, month: 6, day: 12, hour: 6, minute: 50 });
    });

    it('只有地支时辰时取该时辰起点', () => {
        expect(parseTikuBirthTime('公历1994年11月04日 辰时 香港出生'))
            .toEqual({ year: 1994, month: 11, day: 4, hour: 8, minute: 0 });
    });

    it('年份缺位的原稿不排盘', () => {
        expect(parseTikuBirthTime('公历192年09月29日 寅时')).toBeNull();
    });

    it('缺公历的文本不排盘', () => {
        expect(parseTikuBirthTime('')).toBeNull();
    });
});
