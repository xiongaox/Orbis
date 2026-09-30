/**
 * 模块定位：
 * - 主要目标：把安卓系统返回（全面屏边缘侧滑 / 返回键）桥接为「关闭最上层浮层」
 *
 * 关键职责：
 * - 维护浮层关闭回调的 LIFO 栈，返回事件只弹栈顶一个（一次侧滑关一层）
 * - 栈非空时才注册 Tauri app 插件的 back-button 监听，此时系统返回被转发给 JS 且不退出应用；
 *   栈清空后立即注销监听，交还系统默认行为（WebView 无历史则按默认退出）
 * - 桌面端与纯浏览器环境为 no-op：Escape 关闭已由各浮层组件自行处理
 *
 * 使用方式：浮层组件在打开时 pushBackHandler(onClose)，关闭/卸载时 popBackHandler(onClose)。
 
*/
import { isTauri } from '@tauri-apps/api/core';
import { onBackButtonPress } from '@tauri-apps/api/app';

type BackHandler = () => void;

const stack: BackHandler[] = [];
let unlisten: (() => void) | null = null;
let registering = false;

const isAndroidApp = () =>
  isTauri() && /android/i.test(navigator.userAgent);

async function ensureListener() {
  if (unlisten || registering || !isAndroidApp()) return;
  registering = true;
  try {
    const listener = await onBackButtonPress(() => {
      const top = stack[stack.length - 1];
      if (top) top();
    });
    // 注册期间栈可能已被清空：立即注销，避免返回事件被永久截留导致无法退出应用
    if (stack.length > 0) {
      unlisten = () => { void listener.unregister(); };
    } else {
      void listener.unregister();
    }
  } finally {
    registering = false;
  }
}

/** 浮层打开时调用；同一回调可重复入栈（嵌套同组件场景），按引用后进先出弹出 */
export function pushBackHandler(handler: BackHandler): void {
  if (!isAndroidApp()) return;
  stack.push(handler);
  void ensureListener();
}

/** 浮层关闭/卸载时调用；按引用移除，栈空后注销系统监听 */
export function popBackHandler(handler: BackHandler): void {
  const index = stack.lastIndexOf(handler);
  if (index >= 0) stack.splice(index, 1);
  if (stack.length === 0 && unlisten) {
    unlisten();
    unlisten = null;
  }
}
