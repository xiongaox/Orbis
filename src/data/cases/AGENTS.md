# CASES DATA KNOWLEDGE BASE

## OVERVIEW
`src/data/cases` 是大规模静态案例语料库（Markdown），按术数域与作者/日主主题分层组织。

## STRUCTURE
```text
cases/
├── bazi/   # 八字案例语料
└── qimen/  # 奇门案例语料与断法
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| 八字案例主语料 | `bazi/` | 按作者/日主/主题分层 |
| 奇门案例与断法 | `qimen/` | 含分类文章与专题 |
| 前端读取入口 | `src/components/Modules/CaseStudy` | 展示与筛选消费层 |
| 解析层入口 | `src/lib/caseStudy/parsers.ts` | 从 Markdown 提取结构化信息 |

## CONVENTIONS
- 文件名尽量表达主题与检索关键词，保持中文可读性。
- 新增语料优先放入正确术数域与子目录，不跨域混放。
- 内容结构变更要同步检查解析器兼容性（`parsers.ts`）。

## ANTI-PATTERNS
- 不要把结构化配置（常量/索引）直接混入语料目录。
- 不要随意变更既有目录语义（作者层、日主层、专题层）。
- 不要新增无法被现有解析策略识别的格式而不更新解析逻辑。

## MAINTENANCE NOTES
- 该目录体量大，尽量做增量变更，避免大规模重命名。
- 内容变更后优先做 CaseStudy 页面手动回归（筛选、检索、渲染）。
- 若引入新语法模板，先在少量样本验证解析稳定性再批量迁移。
