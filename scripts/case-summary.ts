/**
 * case-summary - 案例列表摘要（列表项时间）抽取规则（作者端共享）
 *
 * 被 pack-cases.ts / build-case-previews.ts / import-case-library.ts 共用：
 * 三者的 summary 必须逐字一致，否则试读条目与激活后的完整条目会显示成两种格式。
 *
 * 输出统一为「YYYY/MM/DD HH:mm」纯时间，不带时区、日主、奇门局数：
 *   八字  命主生辰: 1999/08/20 20:00 (GMT+8)  →  1999/08/20 20:00
 *   奇门  **公元**：2008年2月20日18时10分43秒 阳3局  →  2008/02/20 18:10
 */

export type CaseDomain = 'bazi' | 'qimen';

/** 补零到固定位数 */
function pad(value: number, width: number): string {
    return String(value).padStart(width, '0');
}

/** 组装统一格式，任一分量缺失则返回 null（交由调用方回退为未知文案） */
function format(year: string, month: string, day: string, hour: string, minute: string): string {
    return pad(Number(year), 4) + '/' + pad(Number(month), 2) + '/' + pad(Number(day), 2)
        + ' ' + pad(Number(hour), 2) + ':' + pad(Number(minute), 2);
}

export function extractCaseSummary(content: string, domain: CaseDomain): string {
    if (domain === 'qimen') {
        // 公元行尾部带「阴四局 / 阳8局」，秒与分都可能缺省
        const raw = content.match(/(?:\*\*)?公元(?:\*\*)?[：:]\s*([^\n]+)/)?.[1]?.trim();
        if (!raw) return '未知时间';
        const parts = raw.match(/(\d{4})年(\d{1,2})月(\d{1,2})日(\d{1,2})时(?:(\d{1,2})分)?/);
        if (!parts) return '未知时间';
        return format(parts[1], parts[2], parts[3], parts[4], parts[5] ?? '0');
    }
    // 八字行尾部带时区 (GMT+8)，小时可能不补零
    const raw = content.match(/命主生辰[：:]\s*([^\n]+)/)?.[1]?.trim();
    if (!raw) return '未知八字';
    const parts = raw.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/);
    if (!parts) {
        const dateOnly = raw.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
        return dateOnly ? format(dateOnly[1], dateOnly[2], dateOnly[3], '0', '0') : '未知八字';
    }
    return format(parts[1], parts[2], parts[3], parts[4], parts[5]);
}
