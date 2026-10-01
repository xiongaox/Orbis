# CASES DATA KNOWLEDGE BASE

## OVERVIEW
`src/data/cases` 是案例语料的本地还原目录。语料明文**已迁出 Orbis 主仓**,
源库为私有仓 `orbis-lore`(明文源 `corpus/` + 加密包 `dist/cases_v1.enc`),
本目录除 README/AGENTS 外均被 gitignore,不入任何提交。

## STRUCTURE
```text
cases/
├── bazi/      # 八字案例语料(还原产物,不入库)
├── qimen/     # 奇门案例与断法语料(还原产物,不入库)
├── README.md  # 迁移与还原说明(入库)
└── AGENTS.md  # 本文件(入库)
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| 语料源库 | orbis-lore 仓 `corpus/` | 私有仓,明文源的唯一权威 |
| 还原命令 | `npm run cases:unpack` | 解密 `cases_v1.enc` 到本目录 |
| 前端读取入口 | `src/components/Modules/CaseStudy` | 展示与筛选消费层 |
| 解析层入口 | `src/lib/caseStudy/parsers.ts` | 从 Markdown 提取结构化信息 |

## CONVENTIONS
- 文件名尽量表达主题与检索关键词，保持中文可读性。
- 新增语料优先放入正确术数域与子目录，不跨域混放。
- 在本目录增改语料后，必须同步回 orbis-lore 的 `corpus/` 并重跑 `npm run cases:pack`，
  保持「源库 ↔ 本地还原 ↔ 加密包」三方一致。
- 内容结构变更要同步检查解析器兼容性（`parsers.ts`）。

## ANTI-PATTERNS
- 不要把本目录语料（除 README/AGENTS）提交到 Orbis 仓库或任何公开远端。
- 不要把结构化配置（常量/索引）直接混入语料目录。
- 不要随意变更既有目录语义（作者层、日主层、专题层）。
- 不要新增无法被现有解析策略识别的格式而不更新解析逻辑。

## MAINTENANCE NOTES
- 该目录体量大，尽量做增量变更，避免大规模重命名。
- 内容变更后优先做 CaseStudy 页面手动回归（筛选、检索、渲染）。
- 若引入新语法模板，先在少量样本验证解析稳定性再批量迁移。
