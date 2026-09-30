
export const ZODIAC_IMAGES = [
    'rat.svg', 'ox.svg', 'tiger.svg', 'rabbit.svg', 'dragon.svg', 'snake.svg',
    'horse.svg', 'goat.svg', 'monkey.svg', 'rooster.svg', 'dog.svg', 'pig.svg'
];

// 生肖中文名 → ASCII 文件名（不含扩展名）。
// 代码统一引用 ASCII 路径：Tauri/WKWebView 对非 ASCII 资源路径的编码处理
// 在部分平台会导致 404 裂图，浏览器端则正常。
// public/zodiac 下同时保留中文名副本（马.svg 等），用于兼容仍缓存着
// 旧代码的客户端（其引用的是 /zodiac/马.svg），避免再出现裂图。
const ZODIAC_FILE_BY_NAME: Record<string, string> = {
    '鼠': 'rat', '牛': 'ox', '虎': 'tiger', '兔': 'rabbit', '龙': 'dragon', '蛇': 'snake',
    '马': 'horse', '羊': 'goat', '猴': 'monkey', '鸡': 'rooster', '狗': 'dog', '猪': 'pig'
};

/**
 * 根据生肖中文名获取头像地址；未知生肖回退为鼠
 */
export function getZodiacAvatarUrl(zodiac?: string | null): string {
    const file = (zodiac && ZODIAC_FILE_BY_NAME[zodiac]) || 'rat';
    return `/zodiac/${file}.svg`;
}

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
