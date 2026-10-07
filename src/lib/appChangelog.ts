/**
 * 模块定位：
 * - 应用内「个人中心 → 版本」更新日志的数据源，以天为单位记录转 Tauri 架构（2026-08-25）后的变更
 * - 版本号规则：迁移期每个开发日递增一个 beta 号（v2.0.0-beta → v2.0.1-beta → …，
 *   patch 满进 minor），正式发布跳号至 v2.1.0（避免与 beta 系列的 v2.0.x 混淆）
 * - 版本展示的单一来源仍是 src-tauri/tauri.conf.json 的 version（经 vite define 注入
 *   __APP_VERSION__）；本文件只维护历史沿革，新增开发日时在数组头部插入条目
 */

export interface AppChangelogEntry {
    /** 展示用版本号（含 v 前缀与 -beta 后缀） */
    version: string;
    /** 该版本对应开发日（YYYY-MM-DD） */
    date: string;
    /** 该版本要点，支持「【标签】正文」格式，标签在界面中单独高亮 */
    items: string[];
}

export const APP_CHANGELOG: AppChangelogEntry[] = [
    {
        version: 'v2.1.0',
        date: '2026-10-07',
        items: [
            '【发布】转 Tauri 后首个正式版：Windows x64/x86、macOS M 芯片/Intel、Android arm64 全平台安装包',
            '【新增】GitHub Release 直连下载：安装包带版本号，推 v* 标签自动构建发布',
            '【新增】应用内「检查更新」与「更新日志」：移动端个人中心与桌面端菜单均可一键检查新版本',
            '【新增】安卓云端构建与正式签名，可与已装版本覆盖升级',
            '【优化】安装包英文化：安装路径与主程序统一为 orbis，默认安装到系统 Program Files',
            '【修复】Windows 安装器无 LOGO 图标的问题',
            '【修复】移动端网页底栏被浏览器工具栏遮挡（视口高度改用 dvh 动态适配）',
            '【提示】macOS 版未做 Apple 公证，首次打开若提示「已损坏」，将 orbis.app 拖入应用程序文件夹后，在终端执行 sudo xattr -r -d com.apple.quarantine /Applications/orbis.app，再打开即可',
        ],
    },
    {
        version: 'v2.0.5-beta',
        date: '2026-10-06',
        items: [
            '【新增】移动端导航改版：底部文字墨栏与重选菜单替代侧拉菜单，弹层统一底部弹出',
            '【新增】案例学习排盘补全：神煞行、马星空亡显位、宫位说明二级页',
            '【优化】移动端管理列表化：菜单管理改方案 C，弹层 Portal 到 body，自动备份补跑',
            '【优化】案例列表滚动记忆、月将归位、排盘组件复用与弹层缝隙修复',
            '【优化】备份文件管理底栏两端分布布局，移动端支持全选删除',
            '【清理】移除云端部署遗产：package.json 收敛 wrangler 脚本，历史抹除 supabase/workers 路径',
        ],
    },
    {
        version: 'v2.0.4-beta',
        date: '2026-10-05',
        items: [
            '【优化】奇门旺衰对齐真奇门，支持寄干、击刑、入墓',
            '【新增】奇门盘面元素说明弹窗落地：环绕版式实时渲染所选宫位，双向高亮联动',
            '【优化】万年历日历格行高调整',
        ],
    },
    {
        version: 'v2.0.3-beta',
        date: '2026-10-01',
        items: [
            '【新增】iOS 云构建链路打通：Xcode 16.4 归档、伪造 Tauri 选项通道，产出未签名 ipa',
            '【优化】iOS 与本地构建流程沉淀至 build-env 技能文档',
        ],
    },
    {
        version: 'v2.0.2-beta',
        date: '2026-09-27',
        items: [
            '【部署】tauri 分支不再发布 Cloudflare，配置兜底为 orbis-verify',
        ],
    },
    {
        version: 'v2.0.1-beta',
        date: '2026-08-28',
        items: [
            '【修复】Tauri 开发端案例库跨域读取',
            '【新增】搭建 Cloudflare 公共案例库迁移链路',
        ],
    },
    {
        version: 'v2.0.0-beta',
        date: '2026-08-25',
        items: [
            '【架构】接入 Tauri 本地化基础设施：由 Vite 网页版（Supabase 数据库 + Vercel/Cloudflare 云端部署）转向本地应用；网页访问偏慢、Supabase 低频访问会冻结数据库，本地化后彻底摆脱云端依赖',
            '【优化】Tauri 默认窗口尺寸调整',
        ],
    },
];

/** 语义化版本比较：candidate 是否严格新于 current（只比数字三元组，忽略预发布后缀） */
export function isNewerVersion(candidate: string, current: string): boolean {
    const parse = (v: string) =>
        v
            .trim()
            .replace(/^v/i, '')
            .split('-')[0]
            .split('.')
            .map((n) => Number.parseInt(n, 10) || 0);
    const [c1 = 0, c2 = 0, c3 = 0] = parse(candidate);
    const [b1 = 0, b2 = 0, b3 = 0] = parse(current);
    if (c1 !== b1) return c1 > b1;
    if (c2 !== b2) return c2 > b2;
    return c3 > b3;
}
