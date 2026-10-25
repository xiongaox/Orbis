
import { Solar } from 'lunar-typescript';
import type { BaziApiResponse, PillarData, DynamicYunPillar, FetchBaziParams, ShenShaInfo, ExtraInfo, YunInfo, DaYunPeriod, LiuNian, XiaoYun } from '../../types/bazi';
import {
    TIAN_GAN,
    DI_ZHI,
    TIAN_GAN_WU_XING,
    DI_ZHI_WU_XING,
    DI_ZHI_CANG_GAN,
    SHI_SHEN,
    NA_YIN,
    SHI_ER_ZHANG_SHENG,
    KONG_WANG,
} from '../../lib/xuan-bazi/maps';

interface BaziMethodHost {
    [key: string]: unknown;
    getDayGan: () => string;
    getYun: (gender: number) => {
        getStartSolar: () => { getYear: () => number; getMonth: () => number; getDay: () => number };
        getStartYear: () => number;
        getStartMonth: () => number;
        getStartDay: () => number;
        getStartHour?: () => number;
        isForward: () => boolean;
        getDaYun: () => unknown[];
    };
    getYearGan: () => string;
    getTimeGan: () => string;
    getTimeZhi: () => string;
    getTaiYuan: () => string;
    getMingGong: () => string;
    getShenGong: () => string;
}

// 获取五行的辅助函数
function getElement(char: string): string {
    return TIAN_GAN_WU_XING[char] || DI_ZHI_WU_XING[char] || '';
}

// 获取空亡的辅助函数
function getXunKong(ganZhi: string): string {
    return KONG_WANG[ganZhi] || '';
}

function buildPillar(bazi: BaziMethodHost, pillarType: string, gender?: 'male' | 'female'): PillarData {
    const labelMap: Record<string, string> = { 'year': '年柱', 'month': '月柱', 'day': '日柱', 'time': '时柱' };
    const capType = pillarType.charAt(0).toUpperCase() + pillarType.slice(1);

    const getMethod = (methodName: string) => {
        const method = bazi[methodName];
        if (typeof method !== 'function') {
            return () => '';
        }
        return (method as (...args: unknown[]) => unknown).bind(bazi);
    };

    const getPillar = getMethod(`get${capType}`);
    const getGan = getMethod(`get${capType}Gan`);
    const getZhi = getMethod(`get${capType}Zhi`);

    // 安全调用帮助函数，如果方法存在才调用
    const safeCall = (methodName: string, arg?: unknown) => {
        const method = bazi[methodName];
        return typeof method === 'function' ? (method as (this: BaziMethodHost, arg?: unknown) => unknown).call(bazi, arg) : null;
    };

    const ganZhiStr = String(getPillar() || '');
    const tiangan = String(getGan() || '');
    const dizhi = String(getZhi() || '');
    const dayGan = bazi.getDayGan();

    let tianganShiShen = '';
    if (pillarType === 'day') {
        // 根据性别显示"元男"或"元女"
        tianganShiShen = gender === 'male' ? '元男' : '元女';
    } else {
        tianganShiShen = SHI_SHEN[dayGan + tiangan] || '';
    }

    const hideGans = DI_ZHI_CANG_GAN[dizhi] || [];
    const zanggan = hideGans.map((gan: string) => ({
        gan,
        shiShen: SHI_SHEN[dayGan + gan] || '',
        element: getElement(gan)
    }));

    const dizhiShiShen = zanggan.map((zg: { shiShen: string }) => zg.shiShen);

    const naYin = String(safeCall(`get${capType}NaYin`) || NA_YIN[ganZhiStr] || '');
    const kongWang = String(safeCall(`get${capType}XunKong`) || getXunKong(ganZhiStr));
    const diShi = String(safeCall(`get${capType}DiShi`) || SHI_ER_ZHANG_SHENG[dayGan + dizhi] || '');
    const ziZuo = SHI_ER_ZHANG_SHENG[tiangan + dizhi] || '';

    return {
        label: labelMap[pillarType],
        ganZhi: ganZhiStr,
        tiangan,
        dizhi,
        tianganElement: getElement(tiangan),
        dizhiElement: getElement(dizhi),
        tianganShiShen,
        dizhiShiShen,
        zanggan,
        diShi,
        ziZuo,
        naYin,
        kongWang,
    };
}


function buildDynamicPillarDetails(label: string, ganZhi: string, dayGan: string, yunIndex?: number): DynamicYunPillar {
    if (!ganZhi || ganZhi.length < 2) return {} as DynamicYunPillar;

    const gan = ganZhi[0];
    const zhi = ganZhi[1];

    const tianganShiShen = SHI_SHEN[dayGan + gan] || '';

    const hideGans = DI_ZHI_CANG_GAN[zhi] || [];
    const zanggan = hideGans.map((hGan: string) => ({
        gan: hGan,
        shiShen: SHI_SHEN[dayGan + hGan] || '',
        element: getElement(hGan)
    }));

    const diShi = SHI_ER_ZHANG_SHENG[dayGan + zhi] || '';
    const ziZuo = SHI_ER_ZHANG_SHENG[gan + zhi] || '';
    const naYin = NA_YIN[ganZhi] || '';
    const kongWang = getXunKong(ganZhi);

    return {
        label,
        ganZhi,
        tiangan: gan,
        dizhi: zhi,
        tianganElement: getElement(gan),
        dizhiElement: getElement(zhi),
        tianganShiShen,
        zanggan,
        diShi,
        ziZuo,
        naYin,
        kongWang,
        index: yunIndex
    };
}


export function calculateBazi(params: FetchBaziParams): BaziApiResponse {    const { year, month, day, hour, minute = 0, gender } = params;
    const currentYear = new Date().getFullYear(); // 如果需要也可以作为参数传递

    // 1. 创建公历和农历对象
    const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
    const lunar = solar.getLunar();
    const bazi = lunar.getEightChar() as unknown as BaziMethodHost;

    // 设置用于计算大运的性别 (1=男, 0=女)
    // 注意: lunar-javascript 使用 1 代表男, 0 代表女
    const yunGender = gender === 'male' ? 1 : 0;
    const yun = bazi.getYun(yunGender);

    const dayGan = bazi.getDayGan();

    // 2. 构建四柱
    const pillars = [
        buildPillar(bazi, 'year', gender),
        buildPillar(bazi, 'month', gender),
        buildPillar(bazi, 'day', gender),
        buildPillar(bazi, 'time', gender),
    ];

    // 3. 构建起运信息
    const startSolar = yun.getStartSolar();
    const yunInfo: YunInfo = {
        startYear: yun.getStartYear(),
        startMonth: yun.getStartMonth(),
        startDay: yun.getStartDay(),
        startHour: yun.getStartHour ? yun.getStartHour() : 0, // 需要检查 getStartHour 是否存在
        startSolarDate: `${startSolar.getYear()}年${startSolar.getMonth()}月${startSolar.getDay()}日`,
        isForward: yun.isForward(),
    };

    // 4. 构建大运列表
    const dayunArr = yun.getDaYun();
    const dayunList: DaYunPeriod[] = [];

    // 手动扩展大运计算所需的数组
    const ganList = TIAN_GAN;
    const zhiList = DI_ZHI;

    // 将 Java List/Array 转换为 JS 数组（lunar-javascript 通常返回 JS 数组）
    // 第一遍处理库生成的大运
    if (dayunArr && dayunArr.length) {
        for (let i = 0; i < dayunArr.length; i++) {
            try {
                const dayunRaw = dayunArr[i];
                if (!dayunRaw || typeof dayunRaw !== 'object') continue;

                const dayun = dayunRaw as {
                    getGanZhi?: () => string;
                    getIndex?: () => number;
                    getStartYear?: () => number;
                    getEndYear?: () => number;
                    getStartAge?: () => number;
                    getEndAge?: () => number;
                    getXunKong?: () => string;
                };

                // 安全访问帮助函数
                const getSafeResult = (fn: () => unknown): unknown => {
                    try { return fn(); } catch { return ''; }
                };

                const ganZhi = String(getSafeResult(() => dayun.getGanZhi?.()) || '');
                const index = typeof dayun.getIndex === 'function' ? dayun.getIndex() : i;
                const startYear = Number(getSafeResult(() => dayun.getStartYear?.()) || 0);
                const endYear = Number(getSafeResult(() => dayun.getEndYear?.()) || 0);
                const startAge = Number(getSafeResult(() => dayun.getStartAge?.()) || 0);
                const endAge = Number(getSafeResult(() => dayun.getEndAge?.()) || 0);
                const xunKong = String(getSafeResult(() => dayun.getXunKong?.()) || '');

                const tiangan = ganZhi ? ganZhi[0] : '';
                const dizhi = ganZhi && ganZhi.length > 1 ? ganZhi[1] : '';

                // 计算十二长生
                const diShi = SHI_ER_ZHANG_SHENG[dayGan + dizhi] || '';  // 星运
                const ziZuo = SHI_ER_ZHANG_SHENG[tiangan + dizhi] || ''; // 自坐

                dayunList.push({
                    index,
                    startYear,
                    endYear,
                    startAge,
                    endAge,
                    ganZhi: ganZhi || '',
                    tiangan,
                    dizhi,
                    diShi,
                    ziZuo,
                    xunKong,
                });
            } catch (e) {
                console.warn('处理大运项出错:', e);
            }
        }
    }

    // 检查第一个项目是否为起运前阶段 (索引 0 且干支为空)
    // lunar-javascript 通常会为"起运前"的年龄段（如 1 到 3 岁）添加一个索引为 0 的项
    if (dayunList.length > 0) {
        const first = dayunList[0];
        if (first.index === 0 && (!first.ganZhi || first.ganZhi === '')) {
            // 这是库提供的"小运"（起运前）阶段
            first.ganZhi = '小运';
            first.tiangan = '小';
            first.dizhi = '运';
        } else if (first.startAge > 1) {
            // 备用方案：如果库没有提供索引 0，但存在空缺（起运年龄 > 1）
            // 我们手动插入一个。
            const preStartYear = solar.getYear();
            const preEndYear = first.startYear - 1;
            const preEndAge = first.startAge - 1;

            dayunList.unshift({
                index: -1, // 使用 -1 表示这是插入的项
                startYear: preStartYear,
                endYear: preEndYear,
                startAge: 1,
                endAge: preEndAge,
                ganZhi: '小运',
                tiangan: '小',
                dizhi: '运',
                xunKong: '',
            });
        }
    }


    if (dayunList.length === 0) {
        // 备用方案：如果没有大运，可能孩子还没起运？
        // 我们可以从起始年手动迭代或为了安全起见返回空。
        // 目前先保护 while 循环。
    }

    // 统一按顺/逆推一步干支与十二长生
    const stepGanZhi = (gan: string, zhi: string, forward: boolean, step: number) => {
        const ganIdx = ganList.indexOf(gan as typeof TIAN_GAN[number]);
        const zhiIdx = zhiList.indexOf(zhi as typeof DI_ZHI[number]);
        if (ganIdx < 0 || zhiIdx < 0) return null;
        const dir = forward ? 1 : -1;
        const nextGan = ganList[(((ganIdx + dir * step) % 10) + 10) % 10];
        const nextZhi = zhiList[(((zhiIdx + dir * step) % 12) + 12) % 12];
        return {
            tiangan: nextGan,
            dizhi: nextZhi,
            ganZhi: nextGan + nextZhi,
            diShi: SHI_ER_ZHANG_SHENG[dayGan + nextZhi] || '',
            ziZuo: SHI_ER_ZHANG_SHENG[nextGan + nextZhi] || '',
        };
    };

    // 向前补充出生前的大运（用于查看六亲在命主出生前的岁运），带负索引与负年龄。
    // 年份以出生年那一段为锚按十年整块衔接，干支以第一个有效大运为锚逆推，
    // 因此第一段出生前大运落在 [出生年-10, 出生年-1]，与后续年份连续不重叠。
    const PRE_BIRTH_DA_YUN_COUNT = 10;
    const birthYear = solar.getYear();
    const ganZhiAnchor = dayunList.find(
        dy => dy.index >= 1 && TIAN_GAN.includes(dy.tiangan as typeof TIAN_GAN[number])
            && DI_ZHI.includes(dy.dizhi as typeof DI_ZHI[number]),
    );
    if (ganZhiAnchor && dayunList.length > 0) {
        const preList: DaYunPeriod[] = [];
        for (let k = PRE_BIRTH_DA_YUN_COUNT; k >= 1; k--) {
            const stepped = stepGanZhi(ganZhiAnchor.tiangan, ganZhiAnchor.dizhi, yun.isForward(), -k);
            if (!stepped) break;
            const endYear = birthYear - (k - 1) * 10 - 1;
            preList.push({
                index: -k,
                startYear: endYear - 9,
                endYear,
                startAge: endYear - 9 - birthYear,
                endAge: endYear - birthYear,
                xunKong: '',
                ...stepped,
            });
        }
        if (preList.length) dayunList.unshift(...preList);
    }

    // 扩展大运到20个（支持更长寿命的查看需求）
    while (dayunList.length < 20 + PRE_BIRTH_DA_YUN_COUNT && dayunList.length > 0) {
        const last = dayunList[dayunList.length - 1];
        const stepped = last.tiangan && last.dizhi
            ? stepGanZhi(last.tiangan, last.dizhi, yun.isForward(), 1)
            : null;

        dayunList.push({
            index: last.index + 1,
            startYear: last.endYear + 1,
            endYear: last.endYear + 10,
            startAge: last.endAge + 1,
            endAge: last.endAge + 10,
            ganZhi: stepped?.ganZhi ?? '',
            tiangan: stepped?.tiangan ?? '',
            dizhi: stepped?.dizhi ?? '',
            diShi: stepped?.diShi ?? '',
            ziZuo: stepped?.ziZuo ?? '',
            xunKong: '',
        });
    }

    // 5. 当前大运
    let activeDaYun = dayunList.find(dy => currentYear >= dy.startYear && currentYear <= dy.endYear);
    // 如果没找到（例如在起运年龄之前），在大运列表中默认使用第一个（通常索引为 1）
    if (!activeDaYun && dayunList.length > 0) {
        activeDaYun = dayunList[0];
    }

    let currentDaYun: DynamicYunPillar | undefined;
    if (activeDaYun) {
        currentDaYun = buildDynamicPillarDetails('大运', activeDaYun.ganZhi, dayGan, activeDaYun.index);
    }

    // 6. 当前流年
    let currentLiuNianGanZhi = '';
    try {
        const tmpSolar = Solar.fromYmd(currentYear, 6, 15);
        const tmpLunar = tmpSolar.getLunar();
        currentLiuNianGanZhi = tmpLunar.getYearInGanZhi();
    } catch (e) { console.error(e) }

    const currentLiuNian = buildDynamicPillarDetails('流年', currentLiuNianGanZhi, dayGan);

    // 7. 生成完整流年列表 (恢复用于 UI 的逻辑)
    const allLiuNian: LiuNian[] = [];

    // 获取某年干支的帮助函数 (通过 Solar->Lunar)
    const getYearGanZhi = (y: number) => {
        try {
            const tempSolar = Solar.fromYmd(y, 6, 15); // 年中通常比较安全
            return tempSolar.getLunar().getYearInGanZhi();
        } catch { return ''; }
    };

    for (const dy of dayunList) {
        // 每个大运通常是 10 年，但第一个"小运"可能会比较短。
        const duration = dy.endYear - dy.startYear + 1;

        for (let i = 0; i < duration; i++) {
            const year = dy.startYear + i;
            const age = dy.startAge + i;
            const ganZhi = getYearGanZhi(year);
            const tiangan = ganZhi ? ganZhi[0] : '';
            const dizhi = ganZhi && ganZhi.length > 1 ? ganZhi[1] : '';

            // 计算十二长生
            const diShi = SHI_ER_ZHANG_SHENG[dayGan + dizhi] || '';  // 星运：日主在该地支的长生
            const ziZuo = SHI_ER_ZHANG_SHENG[tiangan + dizhi] || ''; // 自坐：天干在自己地支的长生

            // 为该年生成流月 (Flowing Months)

            allLiuNian.push({
                year,
                age,
                ganZhi,
                tiangan,
                dizhi,
                diShi,
                ziZuo,
                dayunIndex: dy.index,
                liuYue: []
            });
        }
    }

    // 高效地重新填充流月
    // 我们可以使用标准的 "年干" -> "月干" 公式 (五虎遁年起月歌)
    // 月支是固定的：寅, 卯, 辰, 巳, 午, 未, 申, 酉, 戌, 亥, 子, 丑 (标准八字月份 1-12)
    const monthZhis = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
    const monthNames = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '腊月']; // 近似值

    // 五虎遁：甲己之年丙作首，乙庚之岁戊为头...
    const getStartMonthGan = (yearGan: string): string => {
        if ('甲己'.includes(yearGan)) return '丙';
        if ('乙庚'.includes(yearGan)) return '戊';
        if ('丙辛'.includes(yearGan)) return '庚';
        if ('丁壬'.includes(yearGan)) return '壬';
        if ('戊癸'.includes(yearGan)) return '甲';
        return '';
    };

    const ganListSeq = TIAN_GAN;

    // 为每个流年填充流月
    allLiuNian.forEach(ln => {
        if (!ln.ganZhi || !ln.tiangan) return;
        const yearGan = ln.tiangan;
        const startGan = getStartMonthGan(yearGan);
        if (!startGan) return;

        const startGanIdx = ganListSeq.indexOf(startGan as typeof TIAN_GAN[number]);
        const lyList = [];

        for (let m = 0; m < 12; m++) {
            const mGan = ganListSeq[(startGanIdx + m) % 10];
            const mZhi = monthZhis[m];
            lyList.push({
                month: monthNames[m],
                index: m,
                ganZhi: mGan + mZhi,
                tiangan: mGan,
                dizhi: mZhi
            });
        }
        ln.liuYue = lyList;
    });

    // 7b. 生成完整小运列表 (Little Luck)
    const allXiaoYun: XiaoYun[] = [];

    // 小运通常根据时柱计算。

    // 检查小运顺逆
    const yearGan = bazi.getYearGan();
    const isYangYear = '甲丙戊庚壬'.includes(yearGan);
    // const genderNum = gender === 'male' ? 1 : 0; // 已经在上面定义

    // 标准规则:
    // 男命: 阳年 -> 顺推, 阴年 -> 逆推
    // 女命: 阳年 -> 逆推, 阴年 -> 顺推
    let isXiaoYunForward = false;
    if (yunGender === 1) { // 男
        isXiaoYunForward = isYangYear;
    } else { // 女
        isXiaoYunForward = !isYangYear;
    }

    const timePillarGan = bazi.getTimeGan();
    const timePillarZhi = bazi.getTimeZhi();

    const xyGanIdx = ganListSeq.indexOf(timePillarGan as typeof TIAN_GAN[number]);
    // 修正: 应该使用标准的 12 地支序列来查找索引
    const zhiListSeq = DI_ZHI;
    const xyZhiIdx = zhiListSeq.indexOf(timePillarZhi as typeof DI_ZHI[number]);


    allLiuNian.forEach(ln => {
        // 根据系统计算偏移量 (从出生或年龄)
        // 假设 1 岁 = 时柱 + 1 步顺/逆；出生前的流年年龄为负，需按 60 甲子取模回绕
        const shift = ln.age;

        const mod = (i: number, m: number) => ((i % m) + m) % m;

        let targetGanIdx, targetZhiIdx;

        if (isXiaoYunForward) {
            targetGanIdx = mod(xyGanIdx + shift, 10);
            targetZhiIdx = mod(xyZhiIdx + shift, 12);
        } else {
            targetGanIdx = mod(xyGanIdx - shift, 10);
            targetZhiIdx = mod(xyZhiIdx - shift, 12);
        }

        const xyGan = ganListSeq[targetGanIdx];
        const xyZhi = zhiListSeq[targetZhiIdx];

        allXiaoYun.push({
            year: ln.year,
            age: ln.age,
            ganZhi: xyGan + xyZhi,
            dayunIndex: ln.dayunIndex
        });
    });

    // 8. 神煞 (简单列表)
    const shenSha: ShenShaInfo = {
        jiShen: lunar.getDayJiShen(),
        xiongSha: lunar.getDayXiongSha(),
    };

    const extra: ExtraInfo = {
        taiYuan: bazi.getTaiYuan(),
        mingGong: bazi.getMingGong(),
        shenGong: bazi.getShenGong(),
    };

    return {
        solarDate: `${solar.getYear()}年${solar.getMonth()}月${solar.getDay()}日 ${solar.getHour().toString().padStart(2, '0')}:${solar.getMinute().toString().padStart(2, '0')}`,
        lunarDate: `${lunar.getYearInGanZhi()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()} ${lunar.getTimeZhi()}时`,
        zodiac: lunar.getYearShengXiao(),
        gender: gender === 'male' ? '乾造' : '坤造',
        pillars,
        yunInfo,
        daYun: dayunList,
        liuNian: allLiuNian,
        currentXiaoYun: allXiaoYun,
        shenSha,
        extra,
        currentDaYun,
        currentLiuNian,
    };
}

/**
 * 四柱直排：无公历出生时间时（如铁口箓趣味局），由干支四柱 + 性别直接构建命盘。
 * 四柱、十神、藏干、纳音、空亡、地势、胎元均可由本地映射表推出；
 * 大运/流年/小运/神煞依赖真实公历与节气，直排卷置空，由调用方提示。
 */
export function calculateBaziFromPillars(ganZhiList: string[], gender: 'male' | 'female'): BaziApiResponse {
    const parts = ganZhiList.flatMap((gz) => gz.replace(/\s+/g, '').match(/^.{2}$/) ? [gz[0], gz[1]] : ['', '']);
    const [yg, yz, mg, mz, dg, dz, tg, tz] = parts;
    if (!yg || !mg || !dg || !tg) throw new Error('四柱不完整，无法直排');

    // 伪 host：提供四柱干支与分柱干支；十神/纳音/空亡/地势在 buildPillar 内落回本地映射表。
    // getYun 仅满足类型（直排无公历，不推大运）。
    const host: BaziMethodHost = {
        getDayGan: () => dg,
        getYearGan: () => yg,
        getYearZhi: () => yz,
        getMonthGan: () => mg,
        getMonthZhi: () => mz,
        getDayZhi: () => dz,
        getTimeGan: () => tg,
        getTimeZhi: () => tz,
        getYear: () => yg + yz,
        getMonth: () => mg + mz,
        getDay: () => dg + dz,
        getTime: () => tg + tz,
        getTaiYuan: () => '',
        getMingGong: () => '',
        getShenGong: () => '',
        getYun: () => ({
            getStartSolar: () => ({ getYear: () => 0, getMonth: () => 0, getDay: () => 0 }),
            getStartYear: () => 0,
            getStartMonth: () => 0,
            getStartDay: () => 0,
            isForward: () => false,
            getDaYun: () => [],
        }),
    } as BaziMethodHost;

    const pillars = [
        buildPillar(host, 'year', gender),
        buildPillar(host, 'month', gender),
        buildPillar(host, 'day', gender),
        buildPillar(host, 'time', gender),
    ];

    // 胎元：月干进一位、月支进三位
    const ganIdx = TIAN_GAN.indexOf(mg as typeof TIAN_GAN[number]);
    const zhiIdx = DI_ZHI.indexOf(mz as typeof DI_ZHI[number]);
    const taiYuan = ganIdx >= 0 && zhiIdx >= 0
        ? TIAN_GAN[(ganIdx + 1) % 10] + DI_ZHI[(zhiIdx + 3) % 12]
        : '';

    // 起运方向仍可按年干阴阳与性别判定（阳男阴女顺行）；具体起运岁数无公历不可推
    const isYangYear = '甲丙戊庚壬'.includes(yg);
    const yunInfo: YunInfo = {
        startYear: 0,
        startMonth: 0,
        startDay: 0,
        startSolarDate: '—',
        isForward: gender === 'male' ? isYangYear : !isYangYear,
    };

    const ZODIAC: Record<string, string> = {
        子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龙', 巳: '蛇',
        午: '马', 未: '羊', 申: '猴', 酉: '鸡', 戌: '狗', 亥: '猪',
    };

    return {
        solarDate: '干支直排（无公历）',
        lunarDate: '',
        zodiac: ZODIAC[yz] ?? '',
        gender: gender === 'male' ? '乾造' : '坤造',
        pillars,
        yunInfo,
        daYun: [],
        liuNian: [],
        currentXiaoYun: [],
        shenSha: { jiShen: [], xiongSha: [] },
        extra: { taiYuan, mingGong: '', shenGong: '' },
    };
}
