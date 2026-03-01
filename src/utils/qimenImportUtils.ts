/**
 * qimenImportUtils - 应用源码层
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
 * - `parseQimenImportData`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `qimenCaseService`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { QIMEN_CATEGORIES } from '../services/qimenCaseService';
import type { CreateQimenCaseInput, QimenCategory } from '../services/qimenCaseService';

/**
 * 奇门案例导入工具
 */

// 用户可能使用的中文键名映射
const FIELD_MAPPING: Record<string, keyof CreateQimenCaseInput | 'ju_text'> = {
    '公历时间': 'test_date',
    '标题': 'title', // 可选
    '事情描述': 'description',
    '事件反馈': 'feedback',
    '案例断法': 'analysis',
    '分类': 'category',
    '阴阳遁几局': 'ju_text', // 特殊字段，需解析

    // 兼容英文
    'title': 'title',
    'test_date': 'test_date',
    'description': 'description',
    'feedback': 'feedback',
    'analysis': 'analysis',
    'category': 'category',
    'qimen_data': 'qimen_data'
};

// 中文分类名映射
const CATEGORY_NAME_MAP: Record<string, QimenCategory> = {};
QIMEN_CATEGORIES.forEach(cat => {
    CATEGORY_NAME_MAP[cat.name] = cat.id;
    CATEGORY_NAME_MAP[cat.id] = cat.id; // Self mapping
});

/**
 * 解析局数文本
 * 例如："阳遁五局" -> { dun: '阳', ju: 5 }
 */
function parseJuText(text: string): { dun: string; ju: number } | null {
    if (!text) return null;

    const match = text.match(/([阴阳])遁([一二三四五六七八九]|\d+)局/);
    if (!match) return null;

    const dun = match[1];
    const juStr = match[2];

    let ju = parseInt(juStr);
    if (isNaN(ju)) {
        const chineseNums = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
        const idx = chineseNums.indexOf(juStr);
        if (idx !== -1) ju = idx + 1;
    }

    if (!dun || !ju) return null;

    return { dun, ju };
}

/**
 * 解析并验证导入数据
 */
export function parseQimenImportData(jsonData: unknown[] | unknown): CreateQimenCaseInput[] {
    const inputs = Array.isArray(jsonData) ? jsonData : [jsonData];
    const validCases: CreateQimenCaseInput[] = [];

    for (const item of inputs) {
        if (!item || typeof item !== 'object') continue;

        const caseInput: CreateQimenCaseInput = {
            title: '',
            test_date: '',
            category: 'other',
        };

        const record = item as Record<string, unknown>;

        let juText = '';

        // 1. 字段映射
        for (const [key, value] of Object.entries(record)) {
            if (!value) continue;
            // 尝试匹配键名（包含去空）
            const cleanKey = key.trim();
            const mappedKey = FIELD_MAPPING[cleanKey];

            if (mappedKey) {
                if (mappedKey === 'ju_text') {
                    juText = String(value);
                } else {
                    if (mappedKey === 'title' || mappedKey === 'test_date' || mappedKey === 'description' || mappedKey === 'feedback' || mappedKey === 'analysis') {
                        caseInput[mappedKey] = String(value);
                    }
                    if (mappedKey === 'category') {
                        caseInput.category = String(value) as QimenCategory;
                    }
                    if (mappedKey === 'qimen_data' && typeof value === 'object' && value !== null) {
                        caseInput.qimen_data = value as Record<string, unknown>;
                    }
                }
            }
        }

        // 2. 数据处理与校验

        // 处理时间
        if (caseInput.test_date) {
            // 尝试标准化时间格式
            const dateStr = String(caseInput.test_date).replace(' ', 'T'); // "2023-01-01 12:00" -> ISO like
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                caseInput.test_date = date.toISOString();
            } else {
                console.warn('Invalid date format:', caseInput.test_date);
                continue; // 跳过无效时间
            }
        } else {
            // 必须有时间
            continue;
        }

        // 处理分类
        if (caseInput.category) {
            const catId = CATEGORY_NAME_MAP[String(caseInput.category)];
            if (catId) {
                caseInput.category = catId;
            } else {
                caseInput.category = 'other';
            }
        }

        // 处理标题
        if (!caseInput.title && caseInput.description) {
            // 截取前20字
            caseInput.title = String(caseInput.description).substring(0, 20) + (String(caseInput.description).length > 20 ? '...' : '');
        } else if (!caseInput.title) {
            caseInput.title = '未命名案例';
        }

        // 处理局数
        if (juText) {
            const parsed = parseJuText(juText);
            if (parsed) {
                caseInput.qimen_data = {
                    ...((caseInput.qimen_data as Record<string, unknown>) || {}),
                    custom_ju: parsed.ju,
                    custom_dun: parsed.dun
                };
            }
        }

        validCases.push(caseInput);
    }

    return validCases;
}
