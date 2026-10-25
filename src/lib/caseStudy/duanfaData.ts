
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

