/**
 * baziImportUtils - 应用源码层
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
 * - `parseBaziImportData`
 *
 * 依赖关系：
 * - 上游依赖：内部模块 `baziCaseService`
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

import { CASE_TAGS } from '../services/baziCaseService';
import type { CaseTag, CreateCaseInput } from '../services/baziCaseService';

/**
 * 八字案例导入工具
 */

// 字段映射
const FIELD_MAPPING: Record<string, keyof CreateCaseInput> = {
    '姓名': 'name',
    '性别': 'gender',
    '出生时间': 'birth_date',
    '标签': 'tags',
    '备注': 'notes',

    // 兼容英文
    'name': 'name',
    'gender': 'gender',
    'birth_date': 'birth_date',
    'tags': 'tags',
    'notes': 'notes'
};

const GENDER_MAP: Record<string, 'male' | 'female'> = {
    '男': 'male',
    '女': 'female',
    '乾造': 'male',
    '坤造': 'female',
    'male': 'male',
    'female': 'female'
};

/**
 * 解析并验证导入数据
 */
export function parseBaziImportData(jsonData: unknown[] | unknown): CreateCaseInput[] {
    const inputs = Array.isArray(jsonData) ? jsonData : [jsonData];
    const validCases: CreateCaseInput[] = [];

    for (const item of inputs) {
        if (!item || typeof item !== 'object') continue;

        const caseInput: CreateCaseInput = {
            name: '',
            gender: 'male',
            birth_date: '',
            tags: [],
            notes: ''
        };

        const record = item as Record<string, unknown>;

        // 1. 字段映射
        for (const [key, value] of Object.entries(record)) {
            if (value === undefined || value === null || value === '') continue;

            const cleanKey = key.trim();
            const mappedKey = FIELD_MAPPING[cleanKey];

            if (mappedKey) {
                if (mappedKey === 'gender') {
                    const g = String(value).trim();
                    if (GENDER_MAP[g]) {
                        caseInput.gender = GENDER_MAP[g];
                    }
                } else if (mappedKey === 'tags') {
                    // 用户要求“标签只支持一个”，因此只取第一个有效标签
                    let firstTag = '';
                    if (Array.isArray(value) && value.length > 0) {
                        firstTag = String(value[0]);
                    } else if (typeof value === 'string') {
                        // 分割并取第一个
                        const parts = value.split(/[,，\s]+/).filter(t => t.trim().length > 0);
                        if (parts.length > 0) firstTag = parts[0];
                    }

                    if (firstTag) {
                        caseInput.tags = [(CASE_TAGS.includes(firstTag as CaseTag) ? firstTag : '其他') as CaseTag];
                    }
                } else {
                    if (mappedKey === 'name' || mappedKey === 'birth_date' || mappedKey === 'notes') {
                        caseInput[mappedKey] = String(value);
                    }
                }
            }
        }

        // 2. 数据处理与校验

        // 必须有姓名
        if (!caseInput.name) {
            caseInput.name = '未命名';
        }

        // 处理时间
        if (caseInput.birth_date) {
            // 尝试标准化时间格式
            const dateStr = String(caseInput.birth_date).replace(' ', 'T');
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                caseInput.birth_date = date.toISOString();
            } else {
                console.warn('Invalid date format:', caseInput.birth_date);
                continue; // 跳过无效时间
            }
        } else {
            // 必须有时间
            continue;
        }

        // 过滤无效标签 (可选: 也可以允许任意标签，这里保留所有非空字符串)
        // 如果系统严格限制标签，可以在这里过滤 CASE_TAGS
        // 目前 baziCaseService 中 CASE_TAGS 是 const, 但 interface 中 CaseTag 是 union type.
        // 假设允许自由标签或者做了兼容

        validCases.push(caseInput);
    }

    return validCases;
}
