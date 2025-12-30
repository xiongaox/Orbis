# 玄枢录（Orbis）- 八字排盘与案例管理

面向命理分析的前端应用，聚焦八字排盘与案例管理，提供大运/流年/流月与神煞解读展示，并预留奇门、六爻、紫微等入口。

## 功能
- 四柱盘面展示：天干地支、藏干、主星、星运、空亡、纳音
- 大运/流年/流月面板联动展示
- 神煞列表与解读面板
- 案例列表与搜索（当前为本地存储）
- 预留多盘型入口（奇门/六爻/紫微等）
- 可选 Supabase 配置（用于后续云端数据）

## 技术栈
- React 19 + TypeScript + Vite
- Tailwind CSS
- lunar-typescript（农历/八字计算）
- Supabase JS（可选）

## 快速开始
1) 安装依赖
```bash
npm install
```

2) 配置环境变量（可选）
```bash
cp .env.example .env
```
Windows 可用：
```powershell
Copy-Item .env.example .env
```

3) 启动开发
```bash
npm run dev
```

## 常用脚本
- `npm run dev` 启动开发服务器
- `npm run build` 生产构建
- `npm run preview` 本地预览构建产物
- `npm run lint` 代码检查

## 目录速览
- `src/components/Bazi` 八字盘面与相关面板
- `src/components/Sidebar` 案例列表与筛选
- `src/services/caseService.ts` 本地案例存储与迁移
- `src/utils/baziUtils.ts` 八字计算与神煞逻辑
- `src/lib/supabaseClient.ts` 可选 Supabase 客户端

## 说明
- 当前案例数据默认存储在 `localStorage`，并包含演示种子数据。
- Supabase 仅在配置了 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY` 后启用。
