#!/usr/bin/env node
/**
 * 唯一部署入口：只有「正式仓库 + main 分支」允许发布 Cloudflare，其余一律拒绝。
 *
 * 规则：
 *   - 仓库为 `xiongaox/Orbis` 且分支 === main  → 部署 Worker `orbis`（正式站）
 *   - 其它任何情况（其它仓库 / 其它分支 / detached HEAD / 无 remote）→ 拒绝退出(1)
 *     tauri 线、功能分支、设计治理分支都不发布 Cloudflare。
 *
 * 两种运行环境：
 *   - 本地：分支取 git，仓库取 origin remote。
 *   - Cloudflare Workers Builds（CI）：分支优先取 `WORKERS_CI_BRANCH`
 *     （CI 里 checkout 常为 detached HEAD，git 取不到分支名），仓库仍取 origin remote。
 *     这样把 Cloudflare 的 Deploy command 设成 `npm run deploy` 后，
 *     非 main 分支的构建会在这里直接失败——失败安全，不会覆盖正式站。
 *
 * 用法：
 *   npm run deploy                # 构建 + 部署正式站（仅正式仓库的 main 分支可用）
 *   npm run deploy -- --dry-run   # 只校验部署目标与 wrangler 配置，不构建、不上传
 *   npm run deploy -- --dev       # 例外：显式把当前分支发到验证站 orbis-verify（有需要才用）
 *
 * 三层防护（本脚本只负责第 1、2 层）：
 *   1) 本脚本：非「正式仓库 + main」直接拒绝；
 *   2) 各非正式分支的 wrangler.jsonc 里 name 固定为 orbis-verify，
 *      绕过脚本裸敲 `npx wrangler deploy` 也打不到正式站；
 *   3) Cloudflare 侧 Workers Builds 的 Production branch 必须设为 main、
 *      并关闭非生产分支构建——否则推送 GitHub 仍会自动构建正式站。
 *
 * 注意：`orbis-4a3fc48` 仓库的主分支也叫 main，但它属于 tauri 线，
 * 因此判断必须同时看 remote，不能只看分支名。
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const PROD_REPO = 'xiongaox/Orbis'; // 正式站仓库的 owner/name
const PROD_BRANCH = 'main';
const PROD_WORKER = 'orbis';
const DEV_WORKER = 'orbis-verify';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const allowDev = args.includes('--dev');

const git = (argv) => execFileSync('git', argv, { encoding: 'utf8' }).trim();
const tryGit = (argv, fallback = '') => {
  try {
    return git(argv);
  } catch {
    return fallback;
  }
};

// 把 https://github.com/o/r.git / git@github.com:o/r.git 统一成 o/r
const normalizeRepo = (url) => {
  const m = String(url).match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/i);
  return m ? `${m[1]}/${m[2]}` : '';
};

// Cloudflare Workers Builds 会注入 WORKERS_CI / WORKERS_CI_BRANCH（官方文档保证），
// 但社区有"该变量偶发未注入"的反馈，故再兜底两层；全都取不到时拒绝部署（失败安全）。
const ciBranch = process.env.WORKERS_CI_BRANCH || '';
const inWorkersCI = Boolean(process.env.WORKERS_CI) || Boolean(ciBranch);
const gitBranch = tryGit(['rev-parse', '--abbrev-ref', 'HEAD']);
const gitBranchUsable = gitBranch && gitBranch !== 'HEAD';
const branch = inWorkersCI ? ciBranch || (gitBranchUsable ? gitBranch : '') : gitBranch;
const detached = !branch || branch === 'HEAD';
const repo = normalizeRepo(tryGit(['remote', 'get-url', 'origin']));

const isProdRepo = repo.toLowerCase() === PROD_REPO.toLowerCase();
const isProd = isProdRepo && branch === PROD_BRANCH;
const worker = isProd ? PROD_WORKER : DEV_WORKER;

console.log('──────────────────────────────────────────────');
console.log(`[deploy] 运行环境   ：${inWorkersCI ? 'Cloudflare Workers Builds (CI)' : '本地'}`);
console.log(`[deploy] 当前仓库   ：${repo || '(无 origin remote)'}`);
console.log(`[deploy] 当前分支   ：${detached ? '(detached HEAD)' : branch}`);
console.log(
  `[deploy] 目标 Worker：${
    isProd ? `${PROD_WORKER}   ← 正式站` : allowDev ? `${DEV_WORKER}   ← 验证站(--dev)` : '不部署（已拒绝）'
  }`
);
console.log('──────────────────────────────────────────────');

if (!isProd && !allowDev) {
  console.error(`[deploy] ✖ 拒绝部署：只有「正式仓库 ${PROD_REPO} + ${PROD_BRANCH} 分支」才允许发布 Cloudflare。`);
  console.error(`         当前仓库=${repo || '(无 origin)'}   当前分支=${detached ? '(取不到分支名)' : branch}`);
  console.error('         tauri 线、功能分支、设计治理分支一律不发布，避免覆盖线上正式站。');
  console.error(`         确实需要发布验证站时，请显式执行：npm run deploy -- --dev   （目标 ${DEV_WORKER}）`);
  process.exit(1);
}

if (isProd) {
  console.log('[deploy] ⚠️  即将部署【正式站】，请确认产物已自检通过。');
} else {
  console.log(`[deploy] ⚠️  --dev 例外模式：产物只发到 ${DEV_WORKER}，正式站 ${PROD_WORKER} 不会被改动。`);
}

const dirty = tryGit(['status', '--porcelain']).split('\n').filter(Boolean);
if (dirty.length > 0) {
  console.log(`[deploy] ⚠️  工作区有 ${dirty.length} 处未提交改动，会一并打进产物：`);
  for (const line of dirty.slice(0, 5)) console.log(`           ${line}`);
  if (dirty.length > 5) console.log(`           …另有 ${dirty.length - 5} 处`);
}

if (dryRun) {
  console.log('[deploy] --dry-run：跳过构建，仅校验部署目标与 wrangler 配置。');
} else if (inWorkersCI && existsSync('dist/index.html')) {
  console.log('[deploy] CI 环境且 dist 已就绪（Cloudflare 的 Build command 已构建）：跳过重复构建。');
} else {
  console.log('[deploy] 构建中…');
  execFileSync('npm', ['run', 'build'], { stdio: 'inherit' });
}

const wranglerArgs = ['deploy', '--name', worker];
if (dryRun) wranglerArgs.push('--dry-run');

// 优先用仓库内已安装的 wrangler；CI 里没有本地安装时退回 npx（Cloudflare 构建镜像自带 wrangler）
const localWrangler = 'node_modules/.bin/wrangler';
const useLocal = existsSync(localWrangler);
console.log(`[deploy] 执行：${useLocal ? localWrangler : 'npx wrangler'} ${wranglerArgs.join(' ')}`);
if (useLocal) {
  execFileSync(localWrangler, wranglerArgs, { stdio: 'inherit' });
} else {
  execFileSync('npx', ['wrangler', ...wranglerArgs], { stdio: 'inherit' });
}

console.log(`[deploy] ✅ 完成：${worker}`);
