import { describe, expect, it } from 'vitest';
import { parseTikuEdition, parseTikuBirthTime, splitNumberedItems, parseTikuBirthPlace, stripBirthPlace } from './tikuParser';

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

    it('坤造与乾造也识别性别与生日，不能落成「命例信息缺失」', () => {
        const kun = `提纲
- 坤造：公历1961年11月4日巳时，马来西亚出生
- 八字：辛丑 戊戌 辛丑 癸巳
- 命题提供者：马来西亚-张翊萱老师

Q26：命主的结婚年份？
A 1978年
B 1979年
Q26正确答案是：B
`;
        const ed = parseTikuEdition('全球算命师大赛_第17届_2026.md', kun);
        expect(ed!.volumes[0].gender).toBe('女命');
        expect(ed!.volumes[0].birth).toBe('公历1961年11月4日巳时，马来西亚出生');
        expect(ed!.volumes[0].birthTime).toEqual({
            year: 1961, month: 11, day: 4, hour: 10, minute: 0,
        });
    });

    it('一生描述 / 发生事项 等补充信息随卷保留，不当作未知字段丢弃', () => {
        const withSupplements = `提纲
- 女命：公历1970年08月14日 香港出生
- 八字：庚戌 甲申 丙寅 **
- 命题提供者：香港-傅梓量老师
- 一生描述：1、大学毕业； 2、父母健在。
- 发生事项：4、1972壬子年2岁时得气管炎。

Q16：请问此命当天出生是在哪一个时辰呢？
A 01:00—03:00丑时
B 03:00—05:00寅时
Q16正确答案是：A
`;
        const ed = parseTikuEdition('全球算命师大赛_第04届_2013.md', withSupplements);
        const volume = ed!.volumes[0];
        expect(volume.supplements.map((s) => s.label)).toEqual(['一生描述', '发生事项']);
        expect(volume.supplements[1].text).toContain('气管炎');
        // 备注不是补充信息，两者分开存放
        expect(volume.notes).toEqual([]);
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

describe('splitNumberedItems', () => {
    it('按「1、2、3、」拆成逐条，且不切进年份数字', () => {
        const items = splitNumberedItems(
            '1、大学毕业； 2、父母健在； 3、1972壬子年2岁时得气管炎； 4、1997年11月8日注册。',
        );
        expect(items).toHaveLength(4);
        expect(items[2]).toContain('1972壬子年2岁时得气管炎');
        expect(items[3]).toContain('1997年11月8日注册');
    });

    it('没有序号时原样返回一条', () => {
        expect(splitNumberedItems('身体暂时未有大问题')).toEqual(['身体暂时未有大问题']);
    });

    it('空文本返回空数组', () => {
        expect(splitNumberedItems('   ')).toEqual([]);
    });
});

describe('parseTikuBirthPlace / stripBirthPlace', () => {
    it('地名在末尾的写法', () => {
        const birth = '公历1982年6月12日 早上6点50分 香港出生';
        expect(parseTikuBirthPlace(birth)).toBe('香港');
        expect(stripBirthPlace(birth, '香港')).toBe('公历1982年6月12日 早上6点50分');
    });

    it('地名在开头的写法', () => {
        const birth = '台湾高雄 公历1999年8月14日 15点30分（申时）';
        expect(parseTikuBirthPlace(birth)).toBe('台湾高雄');
        expect(stripBirthPlace(birth, '台湾高雄')).toBe('公历1999年8月14日 15点30分（申时）');
    });

    it('没有地名时留空，且不改动原文', () => {
        const birth = '公历1955年03月25日 寅时';
        expect(parseTikuBirthPlace(birth)).toBe('');
        expect(stripBirthPlace(birth, '')).toBe(birth);
    });
});
