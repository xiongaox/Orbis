# 需求与技术实现规格说明书：Orbis 案例学习离线加密包与“一机一码”安全激活系统

> **2026-09-13 实施更新**：加密包实测仅 2.3MB，已改为**随应用内置分发**（`build.rs` 在构建时把
> `dist-cases/cases_v1.enc` 嵌入二进制），取消阿里云 OSS 下载环节。激活命令相应更名为
> `activate_cases`（原 `activate_and_download`），其余验签、一机一密落盘架构不变。
> 另按作者要求增加**双激活通道**：`activate_cases`（一机一码，Ed25519 验签）与
> `activate_with_master_password`（作者管理密码，客户端仅内置 PBKDF2 校验哈希，
> 数据库只落密码的单向派生串，不存明文）。
> **双版本构建**：普通版（`npm run tauri:build`，可跑 GitHub Actions）不含任何密钥材料；
> 管理员版（`npm run tauri:build:admin`，仅作者本机构建）以 `admin-signing` feature 编入
> 应用内签发面板——私钥以管理密码派生密钥 AES-GCM 封印后嵌入（`cases-keygen export-signing`），
> 签发需输管理密码解封，与 `cases-keygen sign` 输出逐字节一致（已交叉验证）。
> 文中涉及 OSS 的段落保留作为原始需求记录。

## 一、 项目背景与核心目标

### 1.1 现状痛点
- **网络受阻与加载慢**：目前案例学习通过 Cloudflare Workers（`*.workers.dev`）在线请求 748 篇案例及作者生平，国内网络存在严重的 SNI 丢包、连接超时甚至白屏。
- **版权保护缺失**：案例语料是软件的核心资产，直接以明文 Markdown 或普通公开 API 暴露，极易被爬虫批量抓取或用户在本地直接复制窃取。

### 1.2 预期目标
1. **国内高速分发**：将 748 篇案例压缩加密打包后存放于阿里云 OSS（公开读），利用国内 CDN 实现秒级下载（整体压缩包预计仅 2~3 MB）。
2. **一机一码专属激活**：用户设备生成独一无二的“硬件特征码”；用户凭机器码向作者获取专属“激活码”，杜绝一人购买全网共享。
3. **本地防解包 / 防逆向**：
   - 核心验签、网络拉取、解包解密逻辑全下沉到 **Tauri 原生 Rust 层**；
   - 本地 SQLite **不存明文正文**，使用设备派生密钥进行**行级二次加密落盘**；
   - 生产环境关闭 Webview 开发者工具（DevTools），彻底堵死普通用户与初中级逆向人员的扒取途径。
4. **完全离线秒开**：激活并写入本地 SQLite 后，前端阅读、分类筛选、奇门八字自动排盘均直接走本地 IPC 内存解密，**响应延迟 0ms，无需任何网络连接**。

---

## 二、 核心安全与密码学架构

```text
 ┌─────────────────────────── 【作者侧 (离线/私有)】 ───────────────────────────┐
 │                                                                           │
 │  1. 748篇 Markdown ──> Gzip 压缩 ──> AES-256-GCM 主密钥加密 ──> cases_v1.enc │
 │                                                              (传阿里云 OSS) │
 │  2. 作者生成并保管 Ed25519 私钥 (Private Key)                                │
 │     收到用户机器码 ──> Ed25519_Sign(机器码, 私钥) ──> 专属激活码 (发给用户)     │
 └───────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ 用户输入激活码
                                       ▼
 ┌───────────────────────── 【客户端 (Tauri Rust 原生层)】 ─────────────────────┐
 │                                                                           │
 │  1. 采集当前硬件指纹 ──> 生成设备识别码 (Machine ID)                           │
 │  2. 内置 Ed25519 公钥 ──> 验证用户激活码有效性 (非对称验签，无法伪造)           │
 │  3. 验签通过 ──> 内存解开 Master Key ──> 从阿里云 OSS 下载 cases_v1.enc       │
 │  4. 内存流式解压 ──> 生成每台电脑唯一的 LocalKey = KDF(MachineID, 激活码)      │
 │  5. 正文以 LocalKey 重新加密 ──> 存入本地 SQLite (元数据明文索引, 正文密文存储)   │
 └───────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ IPC: invoke('get_case_article', { id })
                                       ▼
 ┌──────────────────────── 【前端 (React UI 渲染层)】 ────────────────────────┐
 │                                                                           │
 │  - 未激活状态：展示毛玻璃锁屏卡片，显示设备识别码、激活码输入框与下载进度条      │
 │  - 已激活状态：本地秒级筛选列表，点选单篇时向 Rust 索取单篇解密正文渲染         │
 └───────────────────────────────────────────────────────────────────────────┘
```

### 2.1 为什么采用 Ed25519 非对称签名机制？
* **传统对称密钥漏洞**：如果客户端内置校验密钥，逆向人员只要从客户端二进制反编译出密钥，就能写出注册机。
* **Ed25519 方案**：
  * 作者私钥（Private Key）**永远留在作者本地**；
  * 客户端仅内置公钥（Public Key），仅用于**验签**；
  * **即使完全反编译了 Tauri 二进制文件，也绝对无法推导出私钥，更无法为其他设备伪造激活码**。

### 2.2 本地“一机一密”防拷贝机制
* 即使解压了加密包，正文落盘时使用 `Argon2id` / `PBKDF2(MachineID)` 派生出本机的 `Local_AES_Key`；
* 哪怕有人把整个 `orbis_cases.db` 拷贝到另一台电脑，因机器硬件指纹不同，**读取全部是乱码，根本无法解密**。

---

## 三、 模块详细设计与任务拆解

### 模块 A：作者端打包与授权 CLI（Node.js / TypeScript 脚本）

新建文件：
1. `scripts/cases-keygen.ts`：密钥对生成与用户激活码签发工具。
2. `scripts/pack-cases.ts`：案例语料离线打包与 AES-256 加密工具。
3. `scripts/build-case-previews.ts`：试读样章生成工具（未激活状态下的公开样本）。

#### 1. 签名与激活码生成 (`scripts/cases-keygen.ts`)
```typescript
// 功能1：init-keys -> 生成 author_private.key (严禁提交到 git) 和 public_key.txt
// 功能2：sign --machine <MACHINE_ID> -> 生成专属激活码（如 ACT-XXXX-XXXX-XXXX）
```

#### 2. 案例语料加密打包 (`scripts/pack-cases.ts`)
* **输入**：扫描 `src/data/cases/**/*.md`（748 个文件）。
* **格式定义**：
  ```typescript
  interface PackagedCaseItem {
    id: string;          // 路径相对 key, 如: "bazi/lishuanglin/..."
    title: string;
    domain: 'bazi' | 'qimen';
    author_key: string;
    author_name: string;
    category: string;
    summary: string;
    content: string;     // 原始 Markdown 正文
  }
  interface PackagedBundle {
    version: string;     // e.g. "2026.03.01"
    createdAt: string;
    total: number;
    cases: PackagedCaseItem[];
    authorProfiles: Record<string, string>; // 作者生平简介 markdown
  }
  ```
* **处理流**：
  `JSON 序列化` -> `Gzip 压缩` -> `AES-256-GCM 加密(附带 Auth Tag 和 IV)` -> 输出单个文件 `dist-cases/cases_v1.enc`。
* **分发**：将 `cases_v1.enc` 上传至阿里云 OSS Bucket，设置公共读权限。

#### 3. 试读样章生成 (`scripts/build-case-previews.ts`)
* **目的**：未激活用户也能读到每个分类的样章，先看质量再决定激活，激活入口由用户显式触发。
* **输出**：`src/lib/caseStudy/casePreviews.generated.ts`（随前端产物打包，`npm run cases:previews` 重新生成）。
* **规则**：
  - 按 `域/分类` 分组（八字 11 个日主/格局分类、奇门 15 个占事分类），每组挑 2 篇（作者轮转，尽量覆盖不同作者）；
  - 正文按段落截取到约 1200 字，且不超过全文 40%，段落/句读边界截断；标题与 `命主生辰/日主` 等元数据行保留原貌；
  - 试读条目 id 与加密包内的案例 id 完全一致，激活后同一 id 直接由完整正文接管；
  - 断法专栏本就在应用内以明文提供，不参与挑篇；可在 `scripts/case-preview-picks.json` 中指定篇目或把某分类置为 `[]` 关闭试读。
* **安全边界**：该文件是**刻意公开**的试读明文，只包含截断片段；完整正文仍只存在于加密包内，应用运行时不得把解密正文写入任何明文文件或存储。

---

### 模块 B：Tauri Rust 原生安全层实现 (`src-tauri`)

在 Rust 后端实现核心逻辑，新建模块 `src-tauri/src/cases/`：

#### 1. 硬件指纹提取 (`machine_id.rs`)
* 引入轻量级跨平台硬件指纹方案（或读取 CPU ID + 主板 UUID + 网卡 MAC）。
* 计算 SHA-256 哈希，格式化为易读的 16 位机器码，如：`ORBIS-A8F2-9901-7BC3`。

#### 2. 本地数据库与密文表结构 (`db.rs`)
在 Tauri 应用数据目录维护 `cases_local.sqlite`：
```sql
-- 案例目录与元数据表 (明文，支持高速搜索与分类分页)
CREATE TABLE IF NOT EXISTS case_entries (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    domain TEXT NOT NULL,
    author_key TEXT NOT NULL,
    author_name TEXT NOT NULL,
    category TEXT NOT NULL,
    summary TEXT NOT NULL
);

-- 案例正文密文表 (一机一密，正文与生平皆加密落盘)
CREATE TABLE IF NOT EXISTS case_contents (
    id TEXT PRIMARY KEY,
    nonce BLOB NOT NULL,
    encrypted_content BLOB NOT NULL
);

-- 作者生平介绍表
CREATE TABLE IF NOT EXISTS author_profiles (
    author_key TEXT PRIMARY KEY,
    author_name TEXT NOT NULL,
    nonce BLOB NOT NULL,
    encrypted_profile BLOB NOT NULL
);

-- 激活状态表
CREATE TABLE IF NOT EXISTS activation_status (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    machine_id TEXT NOT NULL,
    license_key TEXT NOT NULL,
    version TEXT NOT NULL,
    activated_at TEXT NOT NULL
);
```

#### 3. 核心 Rust 命令 (`commands.rs`)
暴露给前端调用的 Tauri IPC Commands：

| 命令名称 | 参数 | 返回值 | 职责说明 |
| :--- | :--- | :--- | :--- |
| `get_machine_id` | 无 | `String` | 返回当前设备机器识别码 |
| `get_cases_status` | 无 | `{ is_activated: bool, total: u32, version: String? }` | 检查本地是否已完成激活与数据灌入 |
| `activate_and_download` | `{ license_code: String, oss_url: Option<String> }` | `Result<u32, String>` | 1. 校验激活码；2. 异步下载 OSS 包；3. 内存解密；4. 本地二次加密落盘 |
| `get_case_list` | `{ domain: Option<String> }` | `Vec<CaseMeta>` | 本地秒级读取所有案例元数据（供列表展示） |
| `get_case_content` | `{ id: String }` | `Result<String, String>` | 从 SQLite 读取密文并在内存中解密返回正文 |
| `get_author_profile`| `{ author_key: String }` | `Result<String, String>` | 从 SQLite 读取并解密作者简介正文 |

---

### 模块 C：前端适配与 UI 交互实现

#### 1. 服务层改造 (`src/services/publicCaseLibraryService.ts`)
彻底替换原有的 HTTP fetch 逻辑，改为调用 Tauri IPC：

```typescript
import { invoke } from '@tauri-apps/api/core';

export const publicCaseLibraryService = {
  async getStatus(): Promise<{ isActivated: boolean; total: number; version?: string }> {
    return await invoke('get_cases_status');
  },
  async getMachineId(): Promise<string> {
    return await invoke('get_machine_id');
  },
  async activate(licenseCode: string): Promise<number> {
    return await invoke('activate_and_download', { licenseCode });
  },
  async getEntries(): Promise<PublicCaseEntry[]> {
    return await invoke('get_case_list');
  },
  async getContent(id: string): Promise<string> {
    return await invoke('get_case_content', { id });
  },
  async getAuthorProfile(authorKey: string): Promise<string> {
    return await invoke('get_author_profile', { authorKey });
  }
};
```

#### 2. 试读态与激活弹窗 (`src/components/Modules/CaseStudy/`)
* **试读态**：`getStatus().is_activated === false`（含非桌面端）时不再弹遮罩，而是加载内置试读样章，用户可直接浏览分类与样章正文。
  - 列表：`CaseListSidebar` 顶部展示试读说明与“激活解锁全文”按钮，样章条目带“试读”标识；分类下拉与底部说明展示全库真实篇数（如“当前筛选共 36 篇 · 可试读 2 篇”）。
  - 正文：样章末尾渲染 `CasePreviewUnlock` 解锁卡片，说明可读字数与全库规模；排盘区域同样提示排盘需激活后查看。
  - 试读片段不参与排盘计算、不计入阅读进度，作者生平（`get_author_profile`）在试读态不可展开。
* **激活弹窗** (`ActivationModal.tsx`)：由试读态中的激活按钮按需打开，未激活时不再强制遮挡页面。
  - **视觉设计**：符合项目整体设计规范（Tailwind + CSS 变量 token，支持暗色主题）；
  - **展示当前设备识别码**，附带“一键复制”按钮与提示“请将此码发送给作者换取激活码”；
  - **激活码输入框**，支持格式化粘贴（自动去除首尾空格与换行）；
  - 点击“激活并解锁本地案例库”后进入 Loading 态（展示解密/导入阶段进度）；激活进行中不可关闭弹窗；
  - 激活成功后自动刷新案例列表，当前阅读的试读条目以同一 id 无缝切换为完整正文。

#### 3. 生产发布环境防窥配置
在 `src-tauri/tauri.conf.json` 中配置：
```json
{
  "app": {
    "windows": [
      {
        "title": "Orbis",
        "devtools": false
      }
    ]
  }
}
```
并且在前端全局禁止对案例正文的右键审查行为。

---

## 四、 实施步骤与交付验证清单

| 阶段 | 交付物 | 验收标准 |
| :--- | :--- | :--- |
| **步骤 1** | 打包与签名脚本（`scripts/pack-cases.ts` 和 `keygen.ts`） | 1. 能正确遍历 748 篇案例打出 `< 3MB` 的 `.enc` 文件；<br>2. 能根据任意测试 Machine ID 生成有效签名。 |
| **步骤 1b** | 试读样章（`scripts/build-case-previews.ts` → `casePreviews.generated.ts`） | 1. 每个八字/奇门分类均有 2 篇试读，且试读片段不超过全文 40%；<br>2. 试读 id 与加密包 id 一致。 |
| **步骤 2** | Rust 后端实现（`src-tauri`） | 1. 机器码生成算法在 macOS / Windows 跨平台唯一且稳定；<br>2. 注入错误激活码时抛出拒绝异常；<br>3. 注入正确激活码时从 OSS 拉包、解包并加密灌库成功。 |
| **步骤 3** | 前端服务与 UI 对接 | 1. 首次打开 CaseStudy 页面弹出激活弹窗；<br>2. 激活完成后，阅读案例不再向 Cloudflare 发送任何请求；<br>3. 断网环境下案例列表、正文、作者生平、八字奇门排盘 100% 正常运行。 |
| **步骤 4** | 安全性实测 | 1. 打开本地 `.sqlite` 文件，确认 `encrypted_content` 字段为纯二进制乱码，无任何明文泄露；<br>2. 将数据库拷贝至第二台测试机，确认第二台机器无法解密，提示未激活或校验失败。 |

---

## 五、 环境变量与常量约定

```env
# 阿里云 OSS 加密包公网下载直链 (用于客户端下载)
VITE_CASE_PACKAGE_OSS_URL=https://<your-bucket>.oss-cn-hangzhou.aliyuncs.com/packages/orbis_cases_latest.enc

# 客户端预埋的 Ed25519 验证公钥 (十六进制字符串，可安全公开埋入 Rust 代码)
ORBIS_CASE_SIGN_PUBLIC_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> **给执行 AI 的提示**：
> 1. 请优先在 `src-tauri` 中引入必要依赖（如 `ed25519-dalek`，`aes-gcm`，`rusqlite`，`reqwest` 等）；
> 2. 保持现有的 `PublicCaseEntry` 数据接口契约不变，确保 `useCaseStudy.ts` 内部的数据状态机无需推倒重构；
> 3. 严格遵循项目已有的 TypeScript 规范与 Tailwind Token 设计准则。
