import { describe, it, expect } from 'vitest';
import {
  calculateWangShuaiDashboard,
  calculateYueyuanWangShuai,
  parseAiVerdict,
} from './yueyuanWangShuaiSkill';
import type { BaziApiResponse } from '../../../types/bazi';

describe('calculateWangShuaiDashboard 逻辑自洽性验证', () => {
  it('应当正确处理“建禄单禄遭克泄重局合泄且天干合绊”断为身弱的命例', () => {
    // 乾造：戊寅 癸亥 壬戌 丙午 (或者丙寅)
    // 壬水生亥月，寅午戌三合火局，戊癸合
    const mockBazi = {
      solarDate: '1998-11-20 12:00',
      lunarDate: '戊寅年十月初二日午时',
      gender: '乾造',
      pillars: [
        {
          label: '年柱',
          ganZhi: '戊寅',
          tiangan: '戊',
          dizhi: '寅',
          tianganElement: '土',
          dizhiElement: '木',
          tianganShiShen: '七杀',
          dizhiShiShen: ['食神', '偏财', '七杀'],
          zanggan: [
            { gan: '甲', shiShen: '食神', element: '木' },
            { gan: '丙', shiShen: '偏财', element: '火' },
            { gan: '戊', shiShen: '七杀', element: '土' },
          ],
          diShi: '病',
          naYin: '城头土',
          kongWang: '申酉',
        },
        {
          label: '月柱',
          ganZhi: '癸亥',
          tiangan: '癸',
          dizhi: '亥',
          tianganElement: '水',
          dizhiElement: '水',
          tianganShiShen: '劫财',
          dizhiShiShen: ['比肩', '食神'],
          zanggan: [
            { gan: '壬', shiShen: '比肩', element: '水' },
            { gan: '甲', shiShen: '食神', element: '木' },
          ],
          diShi: '临官',
          naYin: '大海水',
          kongWang: '子丑',
        },
        {
          label: '日柱',
          ganZhi: '壬戌',
          tiangan: '壬',
          dizhi: '戌',
          tianganElement: '水',
          dizhiElement: '土',
          tianganShiShen: '日主',
          dizhiShiShen: ['七杀', '正印', '正财'],
          zanggan: [
            { gan: '戊', shiShen: '七杀', element: '土' },
            { gan: '辛', shiShen: '正印', element: '金' },
            { gan: '丁', shiShen: '正财', element: '火' },
          ],
          diShi: '冠带',
          naYin: '大海水',
          kongWang: '子丑',
        },
        {
          label: '时柱',
          ganZhi: '丙午',
          tiangan: '丙',
          dizhi: '午',
          tianganElement: '火',
          dizhiElement: '火',
          tianganShiShen: '偏财',
          dizhiShiShen: ['正财', '正官'],
          zanggan: [
            { gan: '丁', shiShen: '正财', element: '火' },
            { gan: '己', shiShen: '正官', element: '土' },
          ],
          diShi: '胎',
          naYin: '天河水',
          kongWang: '寅卯',
        },
      ],
    };

    const dashboard = calculateWangShuaiDashboard(mockBazi as unknown as BaziApiResponse, { bodyStrength: '身弱' });

    // 1. 验证得令状态（月令建禄）
    expect(dashboard.fourPillars.deLing.passed).toBe(true);
    expect(dashboard.fourPillars.deLing.tag).toContain('得令');

    // 2. 验证通根情况（1个本气根，且检测到寅亥合泄损益）
    expect(dashboard.fourPillars.deDi.passed).toBe(true);
    expect(dashboard.fourPillars.deDi.roots.length).toBeGreaterThanOrEqual(1);
    expect(dashboard.fourPillars.deDi.roots[0].damageNote).toContain('合木化泄');

    // 3. 验证得助状态（天干比劫被合绊）
    expect(dashboard.fourPillars.deZhu.tag).toBe('得助受羁');

    // 4. 验证三合火局被成功提取
    expect(dashboard.heavyPatterns).toContain('地支寅午戌三合火局');

    // 5. 验证能量天平（克泄耗力量显著压倒生扶力量）
    expect(dashboard.energyBalance.kePercent).toBeGreaterThan(50);
    expect(dashboard.energyBalance.shengPercent).toBeLessThan(50);

    // 6. 验证定调与裁决
    expect(dashboard.finalVerdict).toBe('身弱');
    expect(dashboard.refereeSummary).toContain('单禄难抗重财大势');
    expect(dashboard.godsGuide.fuyongXi.length).toBeGreaterThan(0);

    // 7. 验证新版一站式导出函数 calculateYueyuanWangShuai
    const fullResult = calculateYueyuanWangShuai(mockBazi as unknown as BaziApiResponse);
    expect(fullResult.bodyStrength).toBe('身弱');
    expect(fullResult.formalPattern).toBe('建禄格');
    expect(fullResult.joyGods).toEqual(expect.arrayContaining(['金', '水']));
    expect(fullResult.luckyDirections).toEqual(expect.arrayContaining(['西方', '北方']));
    expect(fullResult.physicsLog.length).toBe(9);
    // 序号由渲染层按下标输出，日志正文只保留【步骤标题】
    expect(fullResult.physicsLog[0]).toContain('【提纲月令】');
    expect(fullResult.physicsLog[6]).toContain('【月令定格】');
    expect(fullResult.physicsLog.some((line) => /【\d+\./.test(line))).toBe(false);
  });

  it('《子平真诠》月令定格规则验证', () => {
    // 1. 阳干羊刃格：甲木生于卯月
    const yangRenBazi = {
      pillars: [
        { tiangan: '丙', dizhi: '午' },
        { tiangan: '辛', dizhi: '卯', diShi: '帝旺' },
        { tiangan: '甲', dizhi: '子' },
        { tiangan: '戊', dizhi: '辰' },
      ],
    } as unknown as BaziApiResponse;
    const yangRenRes = calculateYueyuanWangShuai(yangRenBazi);
    expect(yangRenRes.formalPattern).toBe('羊刃格');

    // 2. 阴干逢帝旺不称羊刃：乙木生于寅月（寅中藏甲丙戊，透丙火伤官）
    const yinDiWangBazi = {
      pillars: [
        { tiangan: '丙', dizhi: '戌' },
        { tiangan: '庚', dizhi: '寅', diShi: '帝旺', zanggan: [{ gan: '甲', shiShen: '劫财' }, { gan: '丙', shiShen: '伤官' }, { gan: '戊', shiShen: '正财' }] },
        { tiangan: '乙', dizhi: '丑' },
        { tiangan: '丁', dizhi: '亥' },
      ],
    } as unknown as BaziApiResponse;
    const yinRes = calculateYueyuanWangShuai(yinDiWangBazi);
    expect(yinRes.formalPattern).not.toBe('羊刃格');
    expect(yinRes.formalPattern).toBe('伤官格');

    // 3. 藏干透出定格：庚金生于辰月（辰藏戊乙癸，时干透癸水伤官）
    const touGanBazi = {
      pillars: [
        { tiangan: '甲', dizhi: '子' },
        { tiangan: '戊', dizhi: '辰', zanggan: [{ gan: '戊', shiShen: '偏印' }, { gan: '乙', shiShen: '正财' }, { gan: '癸', shiShen: '伤官' }] },
        { tiangan: '庚', dizhi: '午' },
        { tiangan: '癸', dizhi: '未' },
      ],
    } as unknown as BaziApiResponse;
    const touGanRes = calculateYueyuanWangShuai(touGanBazi);
    // 辰中本气戊透于月干，取偏印格
    expect(touGanRes.formalPattern).toBe('偏印格');
  });

  it('应当杜绝单一显示“中和”，精确区分“中和偏弱”与“中和偏强”', () => {
    // 辛金生巳月，年干月干透己土，地支双巳双未（失令但有印，生扶43% 克泄57%）
    const zhongHePianRuoBazi = {
      pillars: [
        { tiangan: '己', dizhi: '巳', tianganShiShen: '偏印', zanggan: [{ gan: '丙', shiShen: '正官' }, { gan: '戊', shiShen: '正印' }, { gan: '庚', shiShen: '劫财' }] },
        { tiangan: '己', dizhi: '巳', tianganShiShen: '偏印', zanggan: [{ gan: '丙', shiShen: '正官' }, { gan: '戊', shiShen: '正印' }, { gan: '庚', shiShen: '劫财' }] },
        { tiangan: '辛', dizhi: '未', tianganShiShen: '日主', zanggan: [{ gan: '己', shiShen: '偏印' }, { gan: '丁', shiShen: '七杀' }, { gan: '乙', shiShen: '偏财' }] },
        { tiangan: '乙', dizhi: '未', tianganShiShen: '偏财', zanggan: [{ gan: '己', shiShen: '偏印' }, { gan: '丁', shiShen: '七杀' }, { gan: '乙', shiShen: '偏财' }] },
      ],
    } as unknown as BaziApiResponse;

    const res = calculateYueyuanWangShuai(zhongHePianRuoBazi);
    expect(res.bodyStrength).not.toBe('中和');
    expect(res.bodyStrength).toBe('中和偏弱');
    expect(res.dashboardData.verdictLevel).toBe('中和偏弱');
  });

  describe('parseAiVerdict 智能提炼 AI 定调解析器', () => {
    it('能够准确解析 DeepSeek / Gemini 风格的推演输出', () => {
      const rawAiOutput = `🌟 最优假设与旺衰定调
定调结论：中和偏强，印比成势，官印相生，日主得生得助；但偏强程度不大，因月令官星当令、辰根被合水折损，整体接近“中和偏强”而略偏强。

核验条件变量如下：
- 得令：否。日主己土生寅月，寅为木旺之地，官星当令，己土处于死地，先天失令。
- 得地：有，但质量分化。日支巳为日主坐支，已土在巳为帝旺...
`;

      const result = parseAiVerdict(rawAiOutput);
      expect(result).not.toBeNull();
      expect(result?.verdict).toBe('中和偏强');
      expect(result?.verdictType).toBe('strong');
      expect(result?.reason).toContain('印比成势，官印相生，日主得生得助');
      expect(result?.tags).toContain('官印相生');
      expect(result?.tags).toContain('印比成势');
    });

    it('能够准确解析规范 Markdown 结构输出', () => {
      const rawAiOutput = `### 🌟 最优假设与旺衰定调
- **定调结论**：【中和偏弱】
- **核心论据**：月令财星当权，满盘克泄交加，日主通根受损难任重财
- **条件变量核验**：得令为否，得地微弱...
`;

      const result = parseAiVerdict(rawAiOutput);
      expect(result).not.toBeNull();
      expect(result?.verdict).toBe('中和偏弱');
      expect(result?.verdictType).toBe('weak');
      expect(result?.reason).toBe('月令财星当权，满盘克泄交加，日主通根受损难任重财');
    });

    it('能够容错处理特殊从格命局', () => {
      const rawAiOutput = `### 🌟 最优假设与旺衰定调
- **定调结论**：【从杀格】
- **核心断语**：局中杀势滔天无半点印比，日主虚浮无依，格成真从杀格
`;

      const result = parseAiVerdict(rawAiOutput);
      expect(result).not.toBeNull();
      expect(result?.verdict).toBe('从杀格');
      expect(result?.verdictType).toBe('special');
      expect(result?.reason).toContain('局中杀势滔天无半点印比');
    });

    it('能够精准提取喜忌五行，且喜忌绝对互斥、绝不会将排比句中的五行全盘当作忌神', () => {
      const rawAiOutput = `### 🌟 最优假设与旺衰定调
- **定调结论**：【中和偏弱】
- **核心论据**：辛金生巳月失令，年月双透己印，日主身弱。

### 💡 用神取用与喜忌方向
- **喜用五行**：土、金（印星生身、比劫帮扶）
- **忌仇五行**：木、火（忌木生火克身，忌火克金；若原局土燥、金脆、水荡则需兼顾）
`;
      const result = parseAiVerdict(rawAiOutput);
      expect(result).not.toBeNull();
      expect(result?.joyGods).toEqual(['土', '金']);
      expect(result?.jiGods).toEqual(['木', '火']);
      expect(result?.jiGods).not.toContain('土');
      expect(result?.jiGods).not.toContain('金');
    });

    it('能够精准优先解析大模型自主输出的 json:verdict 结构化卡片块', () => {
      const rawAiOutput = `\`\`\`json:verdict
{
  "verdict": "中和偏弱",
  "reason": "辛金生巳月失令，但年月双透己土偏印，官印相生；然金根微弱，时透乙木耗身，定中和偏弱。",
  "joyGods": ["土", "金"],
  "jiGods": ["木", "火"],
  "tags": ["官印相生", "印比成势"]
}
\`\`\`

### 🌟 最优假设与旺衰定调
- **定调结论**：【中和偏弱】
...
`;
      const result = parseAiVerdict(rawAiOutput);
      expect(result).not.toBeNull();
      expect(result?.verdict).toBe('中和偏弱');
      expect(result?.verdictType).toBe('weak');
      expect(result?.reason).toBe('辛金生巳月失令，但年月双透己土偏印，官印相生；然金根微弱，时透乙木耗身，定中和偏弱。');
      expect(result?.joyGods).toEqual(['土', '金']);
      expect(result?.jiGods).toEqual(['木', '火']);
      expect(result?.tags).toEqual(['官印相生', '印比成势']);
    });

    it('对于空内容安全返回 null', () => {
      expect(parseAiVerdict('')).toBeNull();
      expect(parseAiVerdict('   ')).toBeNull();
    });
  });
});
