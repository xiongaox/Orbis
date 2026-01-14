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

// 获取五行的辅助函数
function getElement(char: string): string {
    return TIAN_GAN_WU_XING[char] || DI_ZHI_WU_XING[char] || '';
}

// 获取空亡的辅助函数
function getXunKong(ganZhi: string): string {
    return KONG_WANG[ganZhi] || '';
}

function buildPillar(bazi: any, pillarType: string, gender?: 'male' | 'female'): PillarData {
    const labelMap: Record<string, string> = { 'year': '年柱', 'month': '月柱', 'day': '日柱', 'time': '时柱' };
    const capType = pillarType.charAt(0).toUpperCase() + pillarType.slice(1);

    const getPillar = bazi[`get${capType}`].bind(bazi);
    const getGan = bazi[`get${capType}Gan`].bind(bazi);
    const getZhi = bazi[`get${capType}Zhi`].bind(bazi);

    // 安全调用帮助函数，如果方法存在才调用
    const safeCall = (methodName: string, arg?: any) => {
        const method = bazi[methodName];
        return typeof method === 'function' ? method.call(bazi, arg) : null;
    };

    const ganZhiStr = getPillar();
    const tiangan = getGan();
    const dizhi = getZhi();
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

    const naYin = safeCall(`get${capType}NaYin`) || NA_YIN[ganZhiStr] || '';
    const kongWang = safeCall(`get${capType}XunKong`) || getXunKong(ganZhiStr);
    const diShi = safeCall(`get${capType}DiShi`) || SHI_ER_ZHANG_SHENG[dayGan + dizhi] || '';
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


export function calculateBazi(params: FetchBaziParams): BaziApiResponse {
    const { year, month, day, hour, minute = 0, gender } = params;
    const currentYear = new Date().getFullYear(); // 如果需要也可以作为参数传递

    // 1. 创建公历和农历对象
    const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
    const lunar = solar.getLunar();
    const bazi = lunar.getEightChar();

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
                const dayun = dayunArr[i];
                if (!dayun) continue;

                // 安全访问帮助函数
                const getSafeResult = (fn: () => any) => {
                    try { return fn(); } catch { return ''; }
                };

                const ganZhi = getSafeResult(() => dayun.getGanZhi());
                const index = typeof dayun.getIndex === 'function' ? dayun.getIndex() : i;
                const startYear = getSafeResult(() => dayun.getStartYear()) || 0;
                const endYear = getSafeResult(() => dayun.getEndYear()) || 0;
                const startAge = getSafeResult(() => dayun.getStartAge()) || 0;
                const endAge = getSafeResult(() => dayun.getEndAge()) || 0;
                const xunKong = getSafeResult(() => dayun.getXunKong ? dayun.getXunKong() : '');

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

    // 扩展大运到20个（支持更长寿命的查看需求）
    while (dayunList.length < 20 && dayunList.length > 0) {
        const last = dayunList[dayunList.length - 1];
        const lastGan = last.tiangan;
        const lastZhi = last.dizhi;

        let nextGan = '', nextZhi = '', nextGanZhi = '';

        if (lastGan && lastZhi) {
            const ganIdx = ganList.indexOf(lastGan as typeof TIAN_GAN[number]);
            const zhiIdx = zhiList.indexOf(lastZhi as typeof DI_ZHI[number]);

            if (yun.isForward()) {
                nextGan = ganList[(ganIdx + 1) % 10];
                nextZhi = zhiList[(zhiIdx + 1) % 12];
            } else {
                nextGan = ganList[(ganIdx - 1 + 10) % 10]; // 处理负数
                nextZhi = zhiList[(zhiIdx - 1 + 12) % 12];
            }
            nextGanZhi = nextGan + nextZhi;
        }

        // 计算十二长生
        const diShi = SHI_ER_ZHANG_SHENG[dayGan + nextZhi] || '';
        const ziZuo = SHI_ER_ZHANG_SHENG[nextGan + nextZhi] || '';

        dayunList.push({
            index: last.index + 1,
            startYear: last.endYear + 1,
            endYear: last.endYear + 10,
            startAge: last.endAge + 1,
            endAge: last.endAge + 10,
            ganZhi: nextGanZhi,
            tiangan: nextGan,
            dizhi: nextZhi,
            diShi,
            ziZuo,
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

        let startGanIdx = ganListSeq.indexOf(startGan as typeof TIAN_GAN[number]);
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

    let xyGanIdx = ganListSeq.indexOf(timePillarGan as typeof TIAN_GAN[number]);
    // 修正: 应该使用标准的 12 地支序列来查找索引
    const zhiListSeq = DI_ZHI;
    let xyZhiIdx = zhiListSeq.indexOf(timePillarZhi as typeof DI_ZHI[number]);


    allLiuNian.forEach(ln => {
        // 根据系统计算偏移量 (从出生或年龄)
        // 假设 1 岁 = 时柱 + 1 步顺/逆
        let shift = ln.age;

        let targetGanIdx, targetZhiIdx;

        if (isXiaoYunForward) {
            targetGanIdx = (xyGanIdx + shift) % 10;
            targetZhiIdx = (xyZhiIdx + shift) % 12;
        } else {
            targetGanIdx = (xyGanIdx - shift) % 10;
            if (targetGanIdx < 0) targetGanIdx += 10;
            targetZhiIdx = (xyZhiIdx - shift) % 12;
            if (targetZhiIdx < 0) targetZhiIdx += 12;
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
