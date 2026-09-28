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
 *
 * 安卓 WebView 既没有 <a download>（blob: 不触发下载），也没有可用的 navigator.share：
 * 走 MainActivity 注入的 window.OrbisNative 桥，用 MediaStore 把文件直接写进
 * 系统「下载」目录（Android 10+ 免存储权限）；桥失败时错误会抛给调用方展示。
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
  const mime = extension === 'json' ? 'application/json;charset=utf-8;' : 'text/plain;charset=utf-8;';
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

  if (isTauri() && isAndroid) {
    // 首选：原生桥直接落盘系统「下载」目录。错误不静默吞掉，抛给调用方展示。
    //
    // ⚠️ 必须以注入对象为接收者调用（bridge.fn(...)）。Android 的 Java bridge
    // 不允许解绑调用：const f = bridge.fn; f(...) 会抛
    // "Java bridge method can't be invoked on a non-injected object"（真机实测）。
    const bridge = (window as unknown as {
      OrbisNative?: { exportToDownloads: (id: string, name: string, content: string, mime: string) => void };
    }).OrbisNative;
    if (bridge) {
      await new Promise<void>((resolve, reject) => {
        const requestId = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const host = window as unknown as {
          __orbisExportResult?: (id: string, ok: boolean, detail: string) => void;
        };
        const timer = window.setTimeout(() => {
          host.__orbisExportResult = undefined;
          reject(new Error('导出超时，请重试'));
        }, 20000);
        host.__orbisExportResult = (id, ok, detail) => {
          if (id !== requestId) return;
          window.clearTimeout(timer);
          host.__orbisExportResult = undefined;
          if (ok) resolve(); else reject(new Error(detail || '导出失败'));
        };
        bridge.exportToDownloads(requestId, finalName, content, mime);
      });
      return 'saved';
    }

    // 兜底一：Web Share（文件）——部分 WebView 支持
    try {
      const file = new File([content], finalName, { type: mime });
      if (
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file], title: finalName });
        return 'saved';
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // 其他错误继续走兜底落盘
    }

    // 兜底二：写入应用数据目录（应用私有空间，无需存储权限）
    const { appDataDir } = await import('@tauri-apps/api/path');
    const dir = await appDataDir();
    const sep = dir.endsWith('/') || dir.endsWith('\\') ? '' : '/';
    await invoke('write_text_file', { path: `${dir}${sep}exports/${finalName}`, content });
    return 'saved';
  }

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
