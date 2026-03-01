/**
 * duanfaData - 应用底层设施
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
 * - `DuanFaFile`, `DuanFaOutlineItem`, `DUANFA_FILES`, `generateOutlineFromMd`
 *
 * 依赖关系：
 * - 上游依赖：无显式外部模块依赖
 * - 下游影响：由依赖方的业务逻辑或视图组装调用
 */

// ====== 类型定义 ======

/** 断法文件元信息 */
export interface DuanFaFile {
    id: string;       // 文件名（不含扩展名）
    name: string;     // 显示名称（中文）
    content: string;  // Markdown 内容
}

/** 大纲项（从 MD 标题提取） */
export interface DuanFaOutlineItem {
    id: string;
    title: string;
    level: number;  // 1 = #, 2 = ##, etc.
}

// ====== 文件名到中文名称映射 ======
// (已移除：现在文件名直接是中文)

// ====== 数据加载 ======

// 使用 Vite 的 import.meta.glob 加载所有 MD 文件
const rawMdFiles = import.meta.glob('../../data/cases/qimen/duanfa/*.md', {
    query: '?raw',
    import: 'default',
    eager: true
}) as Record<string, string>;

/** 所有断法文件列表 */
export const DUANFA_FILES: DuanFaFile[] = Object.entries(rawMdFiles).map(([path, content]) => {
    // 从路径提取文件名
    const filename = path.split('/').pop()?.replace('.md', '') || 'unknown';
    // 文件名本身就是中文名称
    const name = filename;

    return {
        id: filename,
        name,
        content: content as string,
    };
}).sort((a, b) => {
    // 按中文名称排序 (拼音顺序)
    return a.name.localeCompare(b.name, 'zh-CN');
});

// ====== 大纲生成 ======

/**
 * 从 Markdown 内容提取标题生成大纲
 * 注意：跳过第一个 # 标题（因为它会在页面标题单独显示）
 */
export function generateOutlineFromMd(content: string): DuanFaOutlineItem[] {
    // 兼容 Windows CRLF 和 Unix LF
    const lines = content.split(/\r?\n/);
    const outline: DuanFaOutlineItem[] = [];
    let counter = 0;


    for (const line of lines) {
        const match = line.match(/^(#{1,3})\s+(.+)$/);
        if (match) {
            const level = match[1].length;
            const title = match[2].trim();

            // (已移除跳过第一个一级标题的逻辑，应用户要求展示 H1)
            // if (level === 1 && !skippedFirst) {
            //     skippedFirst = true;
            //     continue;
            // }

            outline.push({
                id: `duanfa-heading-${counter}`,
                title,
                level,
            });
            counter++;
        }
    }

    return outline;
}
