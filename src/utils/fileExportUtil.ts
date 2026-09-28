/**
 * fileExportUtil - 跨端文本文件导出
 *
 * 模块定位：
 * - 所在层级：工具层
 * - 主要目标：为 Markdown / JSON 等文本产物提供统一的「保存到本地」能力
 *
 * 关键职责：
 * - 桌面端（Tauri/WKWebView 不支持 <a download>）：原生保存对话框 + 原生写盘
 * - 浏览器端：回退至 Blob 触发下载
 *
 * 为什么独立成文件：此前该逻辑内联在 aiChatHistoryService 中，
 * 备份配置导出等新场景若各自复制一份，桌面端/浏览器端双分支很容易漏改一边。
 */
import { isTauri, invoke } from '@tauri-apps/api/core';

export type ExportOutcome = 'saved' | 'cancelled' | 'downloaded';

export interface ExportTextOptions {
  /** 不含扩展名的主体名（非法字符会被替换为下划线）。 */
  filename: string;
  content: string;
  /** 扩展名，不含点，如 'json' / 'md'。 */
  extension: string;
  /** 桌面端保存对话框中的类型描述，如 'JSON'。 */
  typeLabel: string;
}

/**
 * 导出文本文件（跨端）。
 * @returns 'saved' 已保存到所选路径 | 'cancelled' 用户取消 | 'downloaded' 已触发浏览器下载
 */
export async function exportTextFile({
  filename,
  content,
  extension,
  typeLabel,
}: ExportTextOptions): Promise<ExportOutcome> {
  const safeName = filename.replace(/[\\/:*?"<>|]/g, '_');
  const suffix = `.${extension}`;
  const finalName = safeName.endsWith(suffix) ? safeName : `${safeName}${suffix}`;

  if (typeof window !== 'undefined' && isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const path = await save({
      defaultPath: finalName,
      filters: [{ name: typeLabel, extensions: [extension] }],
    });
    if (!path) return 'cancelled';
    await invoke('write_text_file', { path, content });
    return 'saved';
  }

  const mime = extension === 'json' ? 'application/json;charset=utf-8;' : 'text/plain;charset=utf-8;';
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = finalName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return 'downloaded';
}
