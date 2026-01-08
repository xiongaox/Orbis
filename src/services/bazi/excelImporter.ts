/**
 * Excel 导入工具
 * 解析 Excel 文件并转换为案例数据
 */
import * as XLSX from 'xlsx';
import { Solar } from 'lunar-typescript';
import type { CaseTag, CreateCaseInput } from '../baziCaseService';
import { calculateBazi } from './caseHelper';
import { CASE_TAGS } from '../baziCaseService';

// Excel 模板列定义
export interface ExcelRow {
    姓名?: string;
    性别: string;
    八字?: string;
    出生日期?: string;
    日历类型?: string;
    出生地点?: string;
    分类标签?: string;
    备注?: string;
}

// 解析结果
export interface ParseResult {
    success: boolean;
    data: CreateCaseInput[];
    errors: Array<{ row: number; message: string }>;
}

/**
 * 解析 Excel 文件
 */
export function parseExcelFile(file: File): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                // 获取第一个工作表
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // 转换为 JSON
                const rows = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);

                const result = parseRows(rows);
                resolve(result);
            } catch (error) {
                reject(new Error('Excel 文件解析失败：' + (error as Error).message));
            }
        };

        reader.onerror = () => {
            reject(new Error('文件读取失败'));
        };

        reader.readAsArrayBuffer(file);
    });
}

/**
 * 解析行数据
 */
function parseRows(rows: ExcelRow[]): ParseResult {
    const data: CreateCaseInput[] = [];
    const errors: Array<{ row: number; message: string }> = [];

    rows.forEach((row, index) => {
        const rowNum = index + 2; // Excel 行号（从1开始，第1行是表头）

        try {
            const caseInput = parseRow(row, rowNum);
            if (caseInput) {
                data.push(caseInput);
            }
        } catch (error) {
            errors.push({
                row: rowNum,
                message: (error as Error).message,
            });
        }
    });

    return {
        success: errors.length === 0,
        data,
        errors,
    };
}

/**
 * 解析单行数据
 */
function parseRow(row: ExcelRow, _rowNum: number): CreateCaseInput | null {
    // 跳过空行
    if (!row.性别 && !row.八字 && !row.出生日期) {
        return null;
    }

    // 验证性别
    const gender = parseGender(row.性别);
    if (!gender) {
        throw new Error('性别必填，请填写 男/女');
    }

    // 八字和出生日期二选一
    let birthDate: string;
    let baziData: Record<string, unknown> | undefined;

    if (row.八字 && row.八字.trim()) {
        // 使用八字，需要反推出生日期（或使用默认日期）
        const bazi = row.八字.trim();
        if (!validateBazi(bazi)) {
            throw new Error(`八字格式错误：${bazi}，应为"甲子 丙寅 己巳 戊辰"格式`);
        }
        // 使用八字时，设置一个占位日期（八字本身包含所有信息）
        birthDate = new Date().toISOString();
        baziData = { rawBazi: bazi, source: 'manual' };
    } else if (row.出生日期) {
        // 使用出生日期计算八字
        const parsedDate = parseDate(row.出生日期, row.日历类型);
        if (!parsedDate) {
            throw new Error(`出生日期格式错误：${row.出生日期}`);
        }
        birthDate = parsedDate.toISOString();
        baziData = calculateBazi(birthDate, gender) as Record<string, unknown>;
    } else {
        throw new Error('八字或出生日期必填一项');
    }

    // 解析标签
    const tags = parseTags(row.分类标签);

    // 生成名称
    const name = row.姓名?.trim() || `导入案例${Date.now()}`;

    return {
        name,
        gender,
        birth_date: birthDate,
        tags,
        notes: row.备注?.trim() || undefined,
        bazi_data: baziData,
    };
}

/**
 * 解析性别
 */
function parseGender(value?: string): 'male' | 'female' | null {
    if (!value) return null;
    const v = value.trim().toLowerCase();
    if (v === '男' || v === 'male' || v === 'm' || v === '乾') return 'male';
    if (v === '女' || v === 'female' || v === 'f' || v === '坤') return 'female';
    return null;
}

/**
 * 验证八字格式
 */
function validateBazi(bazi: string): boolean {
    // 允许的格式：甲子 丙寅 己巳 戊辰 或 甲子丙寅己巳戊辰
    const parts = bazi.split(/[\s,，]+/).filter(Boolean);
    if (parts.length !== 4) {
        // 尝试按每2个字符分割
        if (bazi.replace(/\s/g, '').length === 8) {
            return true;
        }
        return false;
    }
    return parts.every(p => p.length === 2);
}

/**
 * 解析日期
 * 支持：字符串、数字（Excel 日期序列号）、Date 对象
 */
function parseDate(dateValue: string | number | Date, calendarType?: string): Date | null {
    const isLunar = calendarType?.trim() === '农历';

    // 如果已经是 Date 对象
    if (dateValue instanceof Date) {
        return dateValue;
    }

    // 如果是数字（Excel 日期序列号）
    if (typeof dateValue === 'number') {
        // Excel 日期序列号：从 1900-01-01 开始的天数
        // 注意：Excel 错误地认为 1900 是闰年，所以要减 1
        const excelEpoch = new Date(1899, 11, 30);
        const date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
        return date;
    }

    // 转换为字符串
    const dateStr = String(dateValue);

    // 尝试多种格式
    const formats = [
        /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})$/,  // 1990-03-15 14:30
        /^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{1,2})$/, // 1990/03/15 14:30
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/,  // 1990-03-15
        /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, // 1990/03/15
        /^(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2})?:?(\d{1,2})?$/, // 1990年3月15日 14:30
    ];

    for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
            const year = parseInt(match[1], 10);
            const month = parseInt(match[2], 10);
            const day = parseInt(match[3], 10);
            const hour = match[4] ? parseInt(match[4], 10) : 12;
            const minute = match[5] ? parseInt(match[5], 10) : 0;

            if (isLunar) {
                // 农历转公历
                try {
                    Solar.fromYmd(year, month, day);
                    // TODO: 实现农历转公历逻辑
                    return new Date(year, month - 1, day, hour, minute);
                } catch {
                    return null;
                }
            } else {
                return new Date(year, month - 1, day, hour, minute);
            }
        }
    }

    // 尝试直接解析
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
        return date;
    }

    return null;
}

/**
 * 解析标签
 */
function parseTags(tagStr?: string): CaseTag[] {
    if (!tagStr) return [];

    const tags = tagStr.split(/[,，、\s]+/).filter(Boolean);
    return tags.filter(tag => CASE_TAGS.includes(tag as CaseTag)) as CaseTag[];
}

/**
 * 生成 Excel 模板
 */
export function generateTemplate(): Blob {
    const headers = ['姓名', '性别', '八字', '出生日期', '日历类型', '出生地点', '分类标签', '备注'];
    const example = ['张三', '男', '', '1990-03-15 14:30', '公历', '北京', '案例,名人', '示例数据'];
    const example2 = ['李四', '女', '甲子 丙寅 己巳 戊辰', '', '', '上海', '朋友', '使用八字直接输入'];

    const worksheet = XLSX.utils.aoa_to_sheet([headers, example, example2]);

    // 设置列宽
    worksheet['!cols'] = [
        { wch: 10 }, // 姓名
        { wch: 6 },  // 性别
        { wch: 20 }, // 八字
        { wch: 18 }, // 出生日期
        { wch: 10 }, // 日历类型
        { wch: 12 }, // 出生地点
        { wch: 15 }, // 分类标签
        { wch: 20 }, // 备注
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '命造导入模板');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * 下载模板
 */
export function downloadTemplate(): void {
    const blob = generateTemplate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '命造导入模板.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
