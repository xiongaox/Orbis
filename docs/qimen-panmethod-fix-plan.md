# 奇门盘式（阴盘/茅山）修复方案

**日期：** 2026-10-01
**状态：** P1/P2/P3/P6 已实施（2026-10-01，P4/P5 经确认跳过/条件触发），内核已升级至 v1.5.5
**前置分析：** 三方案对比实证（本项目 WASM 内核 vs 上游 v1.5.4 原生编译 vs 上游 v1.5.5 原生编译），验证脚本与二进制留存于 `/tmp/csp-test/`（临时目录，本方案已固化关键内容）。

## 实施记录（2026-10-01）

- ✅ P1：`qimenService.ts` 三处修复 + 月将解析已合入；解析验证：置润「秋分下元」不变、阴盘「自动定局」+月将「辰」、手动局「手动定局」（顺带修复了手动定局同样会显示「手动定局下元」的问题）。
- ✅ P2：`QimenHeader.tsx` / `QimenPadInfoPanel.tsx` 茅山下架、当前盘式改全量映射显示、阴盘信息位月将替换马星。兼容层未动。
- ✅ P6：**JSON 结构化输出已落地**。`csp_wasm.cpp` 重写为 `runJson` 绑定（nlohmann 直接序列化 `QimenData`，字段语义对齐上游 print.cpp/jsonExport.cpp；宫位 pos=pos2gua[g]+1，天盘寄干随天芮、地盘寄干在坤二宫，寄干=中宫地盘干 dp[8]）。TS 侧 `parseCspJson` 替代原文本正则解析，`stripAnsiCodes`/`parseCspOutput`（约 200 行）退役，中宫地盘干改用内核直出数据、前端按局数推算逻辑（`getZhongGongDiPan`）删除。
- ✅ P3：**内核已升级 v1.5.5 @ a032876 并部署**。新旧内核 78 用例 × 74 字段语义对比：宫位内容（神/星/门/天盘/地盘/暗干）100% 一致；39 处定局标签差异为本次修复语义（自动/手动定局不再误标下元）；12 处差异为 v1.5.5 修正了九宫格空亡/马星宫位标记（2027-01-05 时空戌亥/马星亥应落乾六宫，v1.5.4 漏标，v1.5.5 正确；UI 空/马标记一直由前端用时柱独立计算，不受影响）。`public/wasm/UPSTREAM_VERSION` 锚定当前内核；emcc 6 兼容项全部固化在 build 脚本注释。
- 🛠️ 事故记录（P6 上线当日）：乾六宫（pos6）整宫无数据。根因：JSON 宫位按内核 g 序输出（中宫排最后），`parseCspJson` 将中宫 pos5 写入共享槽 idx4 后**覆盖了 pos6 乾宫数据**——旧文本解析中中宫是空单元格不写入，故无此问题。修复：中宫跳过写入（地盘走 `zhongGongDiPan`）。教训：此前的对比验收只验了 JSON 数据层、未验 TS 消费路径的写入顺序；已补「消费路径全链路验证」（复刻 parseCspJson 循环 + convertToQimenResult 读取公式，5 日期 × 4 盘式 × 9 宫全字段一致）。
- ✅ 回归工具：`scripts/qimen-kernel-regression.mjs` 已改为 JSON 结构化指纹（值符/值使/定局标签/月将/五不遇时/四柱/九宫全字段），基线 `scripts/qimen-kernel-baseline.json`（78 用例，v1.5.5）。升级内核后 `--check` 验收。
- 产物体积：csp_qimen.js 96KB → 46KB（v1.5.5 tyme4cpp 瘦身 + 移除 stdout 捕获层）。

---

## 一、诊断结论回顾（实证依据）

用同一时间参数对三个独立实现做了逐盘式对比（含 2026-09~10 共 14 天扫盘），结论：

| 盘式 | 判定 | 根因 | 归属层 |
|------|------|------|--------|
| 置润 (type 1) | ✅ 正常 | — | — |
| 阴盘 (type 2) | ⚠️ 盘面对、显示坏 | `[自动定局]` 无三元语义，解析层硬拼出「自动定局下元」 | **本项目 TS 解析层** |
| 拆补 (type 3) | ✅ 正常 | 与置润 14 天中 9 天相同是数学必然（符头三元一致），5 天分歧全部符合各自定局规则 | 无需修复 |
| 茅山 (type 4) | ❌ 永远输出下元局 | `QimenV4::cal_yuan()` 无符号比较 bug：`int - uint32_t` 回绕后 `< 0` 永假 | **上游 csp 源码**，v1.5.0 至 v1.5.5 均存在 |

关键实证：
1. 本项目 WASM 内核与上游 v1.5.4 输出**逐字一致**（4 盘式 × 多日期），集成层无偏差。
2. v1.5.5 与 v1.5.4 输出**完全相同**（6 日期 × 4 盘式验证）→ 升级内核零盘面风险，但也**不能修复茅山**。
3. 茅山 bug 机制（`qimen/src/qm_v4.cpp`）：

```cpp
constexpr uint32_t five_day = 3600 * 24 * 5;   // 无符号
constexpr uint32_t ten_day  = five_day * 2;    // 无符号
auto diff = data_.dt_->subtract(*dt);          // 有符号 int（秒）
if (diff - five_day < 0) return 3;             // int 提升为 uint32_t，回绕后永假
if (diff - ten_day  < 0) return 2;             // 同上，永假
return 1;                                      // 永远返回「下元」
```

表现：距交节 0~10 天内本应返回上元(3)/中元(2)，实际恒为下元(1)。只有真实答案恰好是下元（距交节 ≥10 天）时才碰巧正确。
4. 阴盘显示 bug 位置：`parseCspOutput()` 对值符行 `[自动定局][阴遁六局]` 的 match[3]（「自动定局」）走默认三元推断，`sanYuan` 兜底为 `'下'`，最终 `header.jieQi` 拼成「自动定局下元」，在 `JuInfoCard.tsx:38` 与 AI 提示弹窗中展示。

---

## 二、P1：阴盘解析修复（本项目，立即执行）

### 改动文件：`src/lib/csp-qimen/qimenService.ts`

**改动点 1 — 值符行解析（`parseCspOutput`，约 271-278 行）**

现状：
```ts
result.jieQi = match[3].replace('上元', '').replace('中元', '').replace('下元', '');
result.sanYuan = match[3].includes('上元') ? '上' : match[3].includes('中元') ? '中' : '下';
```

目标（识别上游的定局标签，置空三元）：
```ts
// 上游输出 [自动定局]/[手动定局] 时无三元语义（阴盘/手动局），直接原样展示
if (match[3] === '自动定局' || match[3] === '手动定局') {
    result.jieQi = match[3];
    result.sanYuan = '';
} else {
    result.jieQi = match[3].replace('上元', '').replace('中元', '').replace('下元', '');
    result.sanYuan = match[3].includes('上元') ? '上' : match[3].includes('中元') ? '中' : '下';
}
```

**改动点 2 — header 拼接（`convertToQimenResult`，约 580 行）**

现状：
```ts
jieQi: parsed.jieQi + parsed.sanYuan + '元', // Combine for display: "小寒下元"
```

目标（三元为空时不产生悬空的「元」字）：
```ts
jieQi: parsed.sanYuan ? `${parsed.jieQi}${parsed.sanYuan}元` : parsed.jieQi,
```

修复后效果：`JuInfoCard` 显示「自动定局 阴遁六局」而非「自动定局下元 阴遁六局」；置润/拆补显示不变（回归面为零）。

**改动点 3（可选增强）— 阴盘月将解析**

阴盘输出在干支第二行携带 `(月将:辰)(时家阴盘)`（上游 print.cpp 特有）。当前完全未解析。

- `CspParsedData` 增加可选字段 `yueJiang?: string`；
- `parseCspOutput` 主循环内增加（与 `干支：`/`旬空：` 判定并列）：
```ts
// 阴盘特有：月将（地支）
const yueJiangMatch = line.match(/月将[：:]([子丑寅卯辰巳午未申酉戌亥])/);
if (yueJiangMatch) result.yueJiang = yueJiangMatch[1];
```
- `QimenHeader` 接口增加可选 `yueJiang?: string`，`convertToQimenResult` 透传；
- 展示位置建议：`JuInfoCard` 或 header 信息栅格中，仅当 `yueJiang` 非空（即阴盘）时显示「月将: X」。
- **注**：此项涉及 UI 展示位，实施前按仓库规范先读根目录 `DESIGN.md`；若想控制改动面可先跳过，仅做改动点 1/2。

### 验证
- `npx tsc -b`、`npm run lint`、`npm run build`；
- 人工验收：切到阴盘看 JuInfoCard 文案；切回置润/拆补确认「秋分下元」类文案不变。

---

## 三、P2：茅山隐藏（本项目，立即执行）

### 隐藏策略

**只从「可选下拉项」中移除，不动类型、存储与标签映射**——保证：
- 存量茅山案例卡（`QimenCaseCard` 显示「茅山」短标签）继续正常显示；
- 锁盘快照（`lockedChartStorage` 的 `paiPanMethod`）若为 maoshan，页面仍能正确渲染并显示名称，用户可切换到其他盘式（单向离开，不再可选回来）；
- 未来回加时只需恢复下拉项，无任何数据迁移。

### 改动文件 1：`src/components/Modules/Qimen/components/QimenHeader.tsx`

现状（5-10 行）：`METHODS` 数组含 4 项；第 136 行当前值展示 `METHODS.find(m => m.value === method)?.label`（**隐患**：method=maoshan 时 find 不到 → 显示空白）。

目标：
```ts
// 茅山法上游存在定元 bug（永远输出下元局），修复合入前暂时下架，见
// docs/qimen-panmethod-fix-plan.md P4/P5。类型与标签映射保留，旧案例/锁盘兼容。
const METHOD_OPTIONS = METHODS.filter(m => m.value !== 'maoshan');
const METHOD_LABELS: Record<PaiPanMethod, string> = {
    zhirun: '时家转盘置润',
    yinpan: '时家转盘阴盘',
    chaibu: '时家转盘拆补',
    maoshan: '时家茅山',
};
```
- 下拉渲染（143 行）改用 `METHOD_OPTIONS.map(...)`；
- 当前值展示（136 行）改为 `METHOD_LABELS[method]`（Record 索引必有值，消除 `?.label` 空白隐患）。

### 改动文件 2：`src/components/Modules/Qimen/components/QimenPadInfoPanel.tsx`

同样处理（4-9 行的 `METHODS` 数组 + 对应渲染处），标签沿用该文件现有文案（置润法/阴盘法/拆补法/茅山法）。

### 明确不动的文件（兼容层）

| 文件 | 内容 | 保持原因 |
|------|------|----------|
| `qimenService.ts` | `PaiPanMethod` 类型、`METHOD_TO_TYPE` | 计算与存储契约 |
| `QimenPage.tsx:15-20` | `METHOD_LABELS` 全量映射 | 布局层 methodLabel 传参 |
| `QimenCaseCard.tsx:40` | `METHOD_SHORT`（含 `maoshan: '茅山'`） | 存量案例卡显示 |
| `qimenCaseService.ts:23` | `pai_pan_method` 字段 | 案例数据结构不变 |
| `lockedChartStorage.ts:26` | 快照 `paiPanMethod` | 锁盘兼容 |
| WASM / `csp_wasm.cpp` | type 4 通道 | 回加时零成本，且锁盘快照重算仍需 |

### 验证
- 全量构建三件套（tsc/lint/build）；
- 人工验收：下拉无「时家茅山」项；若有存量茅山案例/锁盘，打开后卡片标签正常、盘面正常、可切换离开。

---

## 四、P3：内核升级 v1.5.5 + 版本锚定 + 回归脚本固化（随 P1/P2 顺带执行）

1. **升级**：`CSP_ROOT` 指向最新上游（a032876，v1.5.5），重跑 `src/lib/csp-qimen/wasm/build_wasm.sh`。wrapper（`csp_wasm.cpp`）无需改动，`CmdParam` 向后兼容。已实证 v1.5.4 → v1.5.5 盘面零变化，案例库无迁移风险；tyme4cpp 瘦身后 WASM 体积预期略降。
2. **版本锚定（防再次考古）**：
   - `build_wasm.sh` 顶部注释记录上游 commit hash 与日期；
   - 构建时传 `-DCSP_VERSION=\"v1.5.5+<短hash>\"` 或构建后把 `git rev-parse HEAD` 写入 `public/wasm/UPSTREAM_VERSION`；
   - （可选）运行时在关于/调试信息中展示内核版本——上游 JSON 导出的 `基本信息.版本` 字段即来源于 `CSP_VERSION`。
3. **回归脚本固化**：把本次三方案对比脚本整理为 `scripts/qimen-kernel-regression.mjs`：对固定日期集（覆盖各节气后 0/2/7/12 天 + 节气交界日）跑 type 1-4，输出值符行快照（JSON 落盘 diff）。用途：每次内核升级前后对比，以及 P5 茅山回加时的验收工具。
4. **风险提示（重要）**：本机 emcc 已升级至 6.0.6-git，实测其 embind 链接存在 `undefined symbol: typeinfo for void` 等错误（8 月构建时的旧版 emcc 无此问题）。重建 WASM 前先试跑 `build_wasm.sh`；若复现，临时方案为脚本追加 `-frtti -fexceptions` 或改走 C-ABI 封装（本次验证已写过一版可参考），并考虑固定 emcc 版本。

---

## 五、P4：向上游提交茅山修复（外部协作，与 P2 并行发起）

**建议 issue/PR 内容**（`qimen/src/qm_v4.cpp` `cal_yuan()`）：

```cpp
// 现状（bug）：int 与 uint32_t 相减回绕，< 0 永假，恒返回下元
if (diff - five_day < 0) return 3;
if (diff - ten_day  < 0) return 2;

// 修复：统一符号
if (diff < static_cast<int>(five_day)) return 3;
if (diff < static_cast<int>(ten_day))  return 2;
```

**复现用例**（附 issue）：时家转盘茅山法，2026-09-25 10:30（秋分交节后约 1.8 天）应为「秋分上元·阴遁七局」，v1.5.4/v1.5.5 实际输出「秋分下元·阴遁四局」；2026-10-15 10:30（寒露后 6.8 天）应为「寒露中元·阴遁九局」，实际「寒露下元·阴遁三局」。距交节 ≥10 天的日期（如 2026-10-20）输出碰巧正确。

**备选**：若上游响应慢，可在本地 fork 维护 patch 分支，`CSP_ROOT` 指向 fork 重建 WASM（不受等待阻塞）。

---

## 六、P5：茅山回加 checklist（条件触发：上游发布含修复的版本）

1. 升级 `CSP_ROOT` → 重建 WASM（走 P3 流程，版本锚定同步更新）；
2. 用 P3 回归脚本验证茅山三元序列：交节后 0-5 天=上元局、5-10 天=中元局、≥10 天=下元局（用当年度节气表选 6+ 个日期）；
3. 恢复 `QimenHeader.tsx` / `QimenPadInfoPanel.tsx` 的 `maoshan` 下拉项（删除 filter 与隐藏注释）；
4. 全量验证（tsc/lint/build + 移动端 debug 包），人工抽查若干茅山盘面与权威排盘工具对照；
5. 本文档状态更新为「已回加」并记录上游修复 commit。

## 七、P6（长期）：JSON 结构化输出替代 stdout 正则解析

上游 v1.5.5 已提供 `JsonExport`（nlohmann），字段语义完整（含本项目尚未消费的**五不遇时、月将、上/下一节气、四柱旬空全 8 组**）。建议后续：
- 在 `csp_wasm.cpp` 新增返回 JSON 字符串的 binding（参照 `jsonExport.cpp` 的字段映射直接 `qm->get_result()` 序列化；**不要**直接调 `JsonExport::exportJson`，它写文件，WASM 下要走文件系统读回，不划算）；
- `qimenService.ts` 中约 400 行正则解析（`parseCspOutput` 主体）退役，改为 `JSON.parse` + 结构转换；
- 收益：上游 `print.cpp` 排版改动（如 4 月 cd8f6a7）不再破坏解析；月将/五不遇时等字段零成本获得。

---

## 八、验证与交付（按仓库 AGENTS.md 规范）

- 静态自检：`npx tsc -b` + `npm run lint`；
- 构建：`npm run build`（Web/桌面）+ 按 `orbis-build-env` skill 构建移动端 **debug** 包（`com.orbis.app.debug`，`adb install -r` 覆盖安装保留数据）；
- UI 效果由用户人工验收；如需预览可另出 `design-demos/` 交互稿。

## 九、风险与回滚

| 项 | 风险 | 回滚 |
|----|------|------|
| P1 解析修复 | 极低：仅改字符串拼接分支，置润/拆补路径不变 | git revert 单提交 |
| P2 茅山隐藏 | 低：存量案例/锁盘兼容层全部保留 | 恢复下拉项即可 |
| P3 内核升级 | 中：emcc 6 兼容性（见 P3.4）；盘面已实证零变化 | 还原 `public/wasm/` 产物 |
| P4 上游 PR | 无本地风险 | — |

## 十、工作量预估

| 阶段 | 预估 |
|------|------|
| P1 阴盘修复（含可选月将） | 0.5~1h |
| P2 茅山隐藏 | 0.5h |
| P3 升级+锚定+回归脚本 | 1~2h（视 emcc 兼容性） |
| P4 上游 issue/PR | 0.5h |
| P5 回加 | 1h（条件触发） |
| P6 JSON 迁移 | 0.5~1 天（单独排期） |
