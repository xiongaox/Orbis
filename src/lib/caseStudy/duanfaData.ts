/**
 * 奇门断法数据加载模块 - MD 版本
 * 加载 notes/断法/MD/ 目录下的 Markdown 文件
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

const FILE_NAME_MAP: Record<string, string> = {
    'chu_xing_chu_guo': '出行出国',
    'duan_ying_qi': '断应期',
    'gao_ji_mi_duan': '高级秘断',
    'gong_zuo_shi_ye': '工作事业',
    'guan_si_su_song': '官司诉讼',
    'ji_bing_shen_ti': '疾病身体',
    'lian_ai_hun_yin': '恋爱婚姻',
    'qiu_xue_kao_shi': '求学考试',
    'sheng_yi_cai_yun': '生意财运',
    'shi_wu_shi_ren': '失物失人',
    'yang_zhai_feng_shui': '阳宅风水',
    'yin_zhai_feng_shui': '阴宅风水',
    'za_xiang_zhan': '杂项占',
};

// ====== 数据加载 ======

// 使用 Vite 的 import.meta.glob 加载所有 MD 文件
const rawMdFiles = import.meta.glob('../../../notes/断法/MD/*.md', {
    query: '?raw',
    import: 'default',
    eager: true
}) as Record<string, string>;

/** 所有断法文件列表 */
export const DUANFA_FILES: DuanFaFile[] = Object.entries(rawMdFiles).map(([path, content]) => {
    // 从路径提取文件名
    const filename = path.split('/').pop()?.replace('.md', '') || 'unknown';
    const name = FILE_NAME_MAP[filename] || filename;

    return {
        id: filename,
        name,
        content: content as string,
    };
}).sort((a, b) => {
    // 按中文名称排序
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
    let skippedFirst = false;

    for (const line of lines) {
        const match = line.match(/^(#{1,3})\s+(.+)$/);
        if (match) {
            const level = match[1].length;
            const title = match[2].trim();

            // 跳过第一个一级标题
            if (level === 1 && !skippedFirst) {
                skippedFirst = true;
                continue;
            }

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
