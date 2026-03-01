/**
 * userUtil - 应用源码层
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
 * - `ZODIAC_IMAGES`, `getZodiacIndexByYear`, `getUserAvatar`
 *
 * 依赖关系：
 * - 上游依赖：无显式外部模块依赖
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

export const ZODIAC_IMAGES = [
    '鼠.svg', '牛.svg', '虎.svg', '兔.svg', '龙.svg', '蛇.svg',
    '马.svg', '羊.svg', '猴.svg', '鸡.svg', '狗.svg', '猪.svg'
];

/**
 * 根据年份计算生肖索引 (1900年是鼠年)
 */
export function getZodiacIndexByYear(year: number) {
    const offset = year - 1900;
    // Handle negative offset if year < 1900 (though picker is 1900+)
    const index = offset % 12;
    return index < 0 ? index + 12 : index;
}

/**
 * 根据邮箱获取固定的随机头像
 * 如果提供了 birthYear，则使用对应的生肖头像
 */
export function getUserAvatar(email?: string, birthYear?: number) {
    if (birthYear) {
        const index = getZodiacIndexByYear(birthYear);
        return `/zodiac/${ZODIAC_IMAGES[index]}`;
    }

    if (!email) return `/zodiac/${ZODIAC_IMAGES[0]}`;
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
        hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % ZODIAC_IMAGES.length;
    return `/zodiac/${ZODIAC_IMAGES[index]}`;
}
