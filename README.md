# 玄枢录（Orbis）- 八字排盘与案例管理

面向命理分析的前端应用，聚焦八字排盘与案例管理，提供大运/流年/流月与神煞解读展示，并预留奇门、六爻、紫微等入口。

## 功能
- 四柱盘面展示：天干地支、藏干、主星、星运、空亡、纳音
- 大运/流年/流月面板联动展示
- 神煞列表与解读面板
- 案例列表与搜索（单工作区本地存储）
- 收藏、阅读进度与 AI 配置的本地保存
- 预留多盘型入口（奇门/六爻/紫微等）
- WebDAV 快照备份与恢复

## 技术栈
- React 19 + TypeScript + Vite
- Tailwind CSS
- lunar-typescript（农历/八字计算）
- WebDAV（可选备份目标）

## 快速开始
1) 安装依赖
```bash
npm install
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
- `src/services/localPrivateStore.ts` 本地私有数据存储（Tauri SQLite / 浏览器 IndexedDB）

## 说明
- 所有私有数据保存在单一本地工作区；Tauri 使用 SQLite，浏览器使用 IndexedDB。
- WebDAV 仅作为备份与恢复目标，不参与业务读写。
