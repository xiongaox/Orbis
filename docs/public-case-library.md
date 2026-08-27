# 公共案例库（Cloudflare D1 + R2）

公共案例与用户私有数据严格分离：src/data/cases 是可重复导入的源语料，运行时目录与元数据存放在 Cloudflare D1 orbis，Markdown 正文存放在 R2 orbis 的 case-library/ 前缀。用户笔记、学习进度、认证资料和 WebDAV 备份仍保留在本地私有存储，绝不导入公共案例库。

## 部署顺序

~~~bash
npm run cases:migrate
npm run cases:import
npm run cases:deploy
CASE_LIBRARY_URL=https://<worker-url> npm run cases:verify
~~~

导入器对同一案例 ID 使用 D1 upsert、对同一 R2 key 覆写相同来源的 Markdown，因此可以安全重跑。导入失败时不会执行目录 seed SQL，防止未上传成功的正文进入可查询目录。导入报告写入被 Git 忽略的 .wrangler/case-library-import/report.json。

## API 契约

所有接口只读、同源调用，成功时为 JSON 或 Markdown；失败时统一为：

~~~json
{ "error": { "code": "not_found", "message": "案例不存在。" } }
~~~

| 接口 | 用途 |
| --- | --- |
| GET /api/public/cases?page&pageSize&domain&author&category&q | D1 目录、元数据与分页 |
| GET /api/public/cases/:id/content | 根据目录 ID 流式读取 R2 Markdown |
| GET /api/public/cases/authors/:authorKey/profile | 读取作者介绍 Markdown |

目录最大 pageSize 为 250；边缘实例按来源 IP 实施每分钟 120 次的轻量读取限流。接口不提供浏览器侧写入权限；任何未来的管理写入必须使用 CASE_LIBRARY_ADMIN_TOKEN 或 Cloudflare Access，并与公共只读路由隔离。
