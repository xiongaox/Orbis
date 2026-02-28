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
