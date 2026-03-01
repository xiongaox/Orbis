/**
 * yunInfoUtils - 应用源码层
 *
 * 模块定位：
 * - 所在层级：应用源码层
 * - 主要目标：提供纯函数工具和辅助模块
 *
 * 关键职责：
 * - 提供核心逻辑实现或数据处理能力
 * - 处理数据流转与异常边界
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `calcJiaoYunInfo`
 *
 * 依赖关系：
 * - 上游依赖：无显式外部模块依赖
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

/** 十天干 */
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;

/** 二十四节气近似日期（用于推算交运节气） */
const JIEQI_APPROX = [
    { name: '小寒', m: 1, d: 5 }, { name: '大寒', m: 1, d: 20 },
    { name: '立春', m: 2, d: 4 }, { name: '雨水', m: 2, d: 19 },
    { name: '惊蛰', m: 3, d: 5 }, { name: '春分', m: 3, d: 20 },
    { name: '清明', m: 4, d: 4 }, { name: '谷雨', m: 4, d: 20 },
    { name: '立夏', m: 5, d: 5 }, { name: '小满', m: 5, d: 21 },
    { name: '芒种', m: 6, d: 5 }, { name: '夏至', m: 6, d: 21 },
    { name: '小暑', m: 7, d: 7 }, { name: '大暑', m: 7, d: 22 },
    { name: '立秋', m: 8, d: 7 }, { name: '处暑', m: 8, d: 23 },
    { name: '白露', m: 9, d: 7 }, { name: '秋分', m: 9, d: 23 },
    { name: '寒露', m: 10, d: 8 }, { name: '霜降', m: 10, d: 23 },
    { name: '立冬', m: 11, d: 7 }, { name: '小雪', m: 11, d: 22 },
    { name: '大雪', m: 12, d: 7 }, { name: '冬至', m: 12, d: 21 },
] as const;

/**
 * 根据起运日期计算交运描述
 * @param startSolarDate 起运阳历日期字符串，格式如 "2027年12月18日"
 * @returns 交运描述，如 "交运：逢丁、壬年 大雪后11天 交大运"；解析失败返回 null
 */
export function calcJiaoYunInfo(startSolarDate: string): string | null {
    const match = startSolarDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (!match) return null;

    const year = parseInt(match[1]);
    const month = parseInt(match[2]);
    const day = parseInt(match[3]);

    // 计算起运年干 & 配对干
    const idx = (year - 4) % 10;
    const stemIdx = idx < 0 ? idx + 10 : idx;
    const stem = TIAN_GAN[stemIdx];
    const pairStem = TIAN_GAN[(stemIdx + 5) % 10];

    // 查找起运日期最近的前一个节气
    const targetDate = new Date(year, month - 1, day);
    let bestJieqi = '冬至';
    let bestDate = new Date(year - 1, 11, 21);

    for (const jq of JIEQI_APPROX) {
        const d = new Date(year, jq.m - 1, jq.d);
        if (targetDate >= d) {
            bestDate = d;
            bestJieqi = jq.name;
        } else {
            break;
        }
    }

    const diffDays = Math.ceil(
        Math.abs(targetDate.getTime() - bestDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return `交运：逢${stem}、${pairStem}年 ${bestJieqi}后${diffDays}天 交大运`;
}
