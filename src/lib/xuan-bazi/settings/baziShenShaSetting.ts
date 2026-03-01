/**
 * baziShenShaSetting - 应用底层设施
 *
 * 模块定位：
 * - 所在层级：应用底层设施
 * - 主要目标：封装第三方库或核心底层能力
 *
 * 关键职责：
 * - 提供核心逻辑实现或数据处理能力
 * - 处理数据流转与异常边界
 * - 向上层提供稳定可复用能力
 *
 * 主要导出：
 * - `BaZiShenShaSetting`, `createDefaultShenShaSetting`
 *
 * 依赖关系：
 * - 上游依赖：无显式外部模块依赖
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

/**
 * 神煞设置接口
 */
export interface BaZiShenShaSetting {
    // ========== 贵人类 ==========
    /** 太极贵人（0:显示。1:关闭） */
    taiJiGuiRen: number;
    /** 天乙贵人（0:显示。1:关闭） */
    tianYiGuiRen: number;
    /** 福星贵人（0:显示。1:关闭） */
    fuXingGuiRen: number;
    /** 文昌贵人（0:显示。1:关闭） */
    wenChangGuiRen: number;
    /** 天厨贵人（0:显示。1:关闭） */
    tianChuGuiRen: number;
    /** 月德贵人（0:显示。1:关闭） */
    yueDeGuiRen: number;
    /** 德秀贵人（0:显示。1:关闭） */
    deXiuGuiRen: number;
    /** 天德贵人（0:显示。1:关闭） */
    tianDeGuiRen: number;
    /** 天官贵人（0:显示。1:关闭） */
    tianGuanGuiRen: number;
    /** 三奇贵人（0:显示。1:关闭） */
    sanQiGuiRen: number;

    // ========== 特殊日类 ==========
    /** 十恶大败（0:显示。1:关闭） */
    shiEDaBai: number;
    /** 阴注阳受（0:显示。1:关闭） */
    yinZhuYangShou: number;
    /** 阴差阳错（0:显示。1:关闭） */
    yinChaYangCuo: number;
    /** 天德合（0:显示。1:关闭） */
    tianDeHe: number;
    /** 月德合（0:显示。1:关闭） */
    yueDeHe: number;
    /** 四废日（0:显示。1:关闭） */
    siFeiRi: number;
    /** 六秀日（0:显示。1:关闭） */
    liuXiuRi: number;
    /** 十灵日（0:显示。1:关闭） */
    shiLingRi: number;
    /** 魁罡日（0:显示。1:关闭） */
    kuiGangRi: number;
    /** 八专日（0:显示。1:关闭） */
    baZhuanRi: number;
    /** 九丑日（0:显示。1:关闭） */
    jiuChouRi: number;

    // ========== 煞类 ==========
    /** 孤鸾煞（0:显示。1:关闭） */
    guLuanSha: number;
    /** 红艳煞（0:显示。1:关闭） */
    hongYanSha: number;
    /** 勾绞煞（0:显示。1:关闭） */
    gouJiaoSha: number;
    /** 冲天煞（0:显示。1:关闭） */
    chongTianSha: number;
    /** 童子煞（0:显示。1:关闭） */
    tongZiSha: number;

    // ========== 星类 ==========
    /** 华盖（0:显示。1:关闭） */
    huaGai: number;
    /** 国印（0:显示。1:关闭） */
    guoYin: number;
    /** 金舆（0:显示。1:关闭） */
    jinYu: number;
    /** 羊刃（0:显示。1:关闭） */
    yangRen: number;
    /** 飞刃（0:显示。1:关闭） */
    feiRen: number;
    /** 流霞（0:显示。1:关闭） */
    liuXia: number;
    /** 禄神（0:显示。1:关闭） */
    luShen: number;
    /** 驿马（0:显示。1:关闭） */
    yiMa: number;

    // ========== 空亡类 ==========
    /** 天罗地网（0:显示。1:关闭） */
    tianLuoDiWang: number;
    /** 空亡（0:显示。1:关闭） */
    kongWang: number;
    /** 截空（0:显示。1:关闭） */
    jieKong: number;

    // ========== 将星桃花类 ==========
    /** 劫煞（0:显示。1:关闭） */
    jieSha: number;
    /** 将星（0:显示。1:关闭） */
    jiangXing: number;
    /** 桃花（0:显示。1:关闭） */
    taoHua: number;
    /** 亡神（0:显示。1:关闭） */
    wangShen: number;

    // ========== 丧吊类 ==========
    /** 吊客（0:显示。1:关闭） */
    diaoKe: number;
    /** 披麻（0:显示。1:关闭） */
    piMa: number;
    /** 天喜（0:显示。1:关闭） */
    tianXi: number;
    /** 红鸾（0:显示。1:关闭） */
    hongLuan: number;
    /** 丧门（0:显示。1:关闭） */
    sangMen: number;
    /** 灾煞（0:显示。1:关闭） */
    zaiSha: number;

    // ========== 孤寡类 ==========
    /** 孤辰（0:显示。1:关闭） */
    guChen: number;
    /** 寡宿（0:显示。1:关闭） */
    guaXiu: number;
    /** 元辰（0:显示。1:关闭） */
    yuanChen: number;

    // ========== 其他 ==========
    /** 血刃（0:显示。1:关闭） */
    xueRen: number;
    /** 天医（0:显示。1:关闭） */
    tianYi: number;
    /** 词馆（0:显示。1:关闭） */
    ciGuan: number;
    /** 学堂（0:显示。1:关闭） */
    xueTang: number;
    /** 天赦（0:显示。1:关闭） */
    tianShe: number;
    /** 天转（0:显示。1:关闭） */
    tianZhuan: number;
    /** 地转（0:显示。1:关闭） */
    diZhuan: number;
    /** 拱禄（0:显示。1:关闭） */
    gongLu: number;
    /** 金神（0:显示。1:关闭） */
    jinShen: number;
    /** 六厄（0:显示。1:关闭） */
    liuE: number;
}

/**
 * 创建默认神煞设置（所有神煞默认显示）
 */
export function createDefaultShenShaSetting(): BaZiShenShaSetting {
    return {
        // 贵人类
        taiJiGuiRen: 0,
        tianYiGuiRen: 0,
        fuXingGuiRen: 0,
        wenChangGuiRen: 0,
        tianChuGuiRen: 0,
        yueDeGuiRen: 0,
        deXiuGuiRen: 0,
        tianDeGuiRen: 0,
        tianGuanGuiRen: 0,
        sanQiGuiRen: 0,
        // 特殊日类
        shiEDaBai: 0,
        yinZhuYangShou: 0,
        yinChaYangCuo: 0,
        tianDeHe: 0,
        yueDeHe: 0,
        siFeiRi: 0,
        liuXiuRi: 0,
        shiLingRi: 0,
        kuiGangRi: 0,
        baZhuanRi: 0,
        jiuChouRi: 0,
        // 煞类
        guLuanSha: 0,
        hongYanSha: 0,
        gouJiaoSha: 0,
        chongTianSha: 0,
        tongZiSha: 0,
        // 星类
        huaGai: 0,
        guoYin: 0,
        jinYu: 0,
        yangRen: 0,
        feiRen: 0,
        liuXia: 0,
        luShen: 0,
        yiMa: 0,
        // 空亡类
        tianLuoDiWang: 0,
        kongWang: 0,
        jieKong: 0,
        // 将星桃花类
        jieSha: 0,
        jiangXing: 0,
        taoHua: 0,
        wangShen: 0,
        // 丧吊类
        diaoKe: 0,
        piMa: 0,
        tianXi: 0,
        hongLuan: 0,
        sangMen: 0,
        zaiSha: 0,
        // 孤寡类
        guChen: 0,
        guaXiu: 0,
        yuanChen: 0,
        // 其他
        xueRen: 0,
        tianYi: 0,
        ciGuan: 0,
        xueTang: 0,
        tianShe: 0,
        tianZhuan: 0,
        diZhuan: 0,
        gongLu: 0,
        jinShen: 0,
        liuE: 0,
    };
}
