/**
 * 八字 API 服务
 */
import type { BaziApiResponse, FetchBaziParams } from '../types/bazi';

// API 基础路径（开发环境使用代理，生产环境直接调用）
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * 获取八字数据
 */
export async function fetchBazi(params: FetchBaziParams): Promise<BaziApiResponse> {
    const { year, month, day, hour, minute = 0, gender } = params;
    const genderNum = gender === 'male' ? 1 : 0;

    const url = `${API_BASE_URL}/api/bazi?year=${year}&month=${month}&day=${day}&hour=${hour}&minute=${minute}&gender=${genderNum}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`八字 API 请求失败: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

/**
 * 从 ISO 日期字符串解析日期时间参数
 */
export function parseBirthDate(birthDateIso: string): Omit<FetchBaziParams, 'gender'> {
    const date = new Date(birthDateIso);
    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
    };
}

/**
 * 健康检查
 */
export async function checkApiHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        return response.ok;
    } catch {
        return false;
    }
}
