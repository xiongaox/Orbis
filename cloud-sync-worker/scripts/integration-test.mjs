#!/usr/bin/env node
/**
 * T03 集成测试：在 `wrangler dev --local`（真实 D1）上跑协议场景矩阵。
 *
 * 覆盖（实施方案 T03 自检/验收）：
 * - T02 回归：鉴权、记录类型白名单
 * - 重复 push 同一 mutationId 只生效一次（幂等）
 * - 删除后 pull 能拿到 tombstone（deleted=1，payload=null）
 * - 分页游标连续不丢不重（sequence 严格递增）
 * - 版本冲突返回 409（含当前版本与内容）
 * - 内容一致恢复（重复推送/崩溃窗口重试不产生冲突）
 * - 跨 workspace 数据不可见
 * - records 与 changes 状态一致
 * - bootstrap 内容与最大序号
 *
 * 运行：node scripts/integration-test.mjs（自动启动/停止 wrangler dev --local，
 * 自动清理本地 D1 数据，可重复运行）。本地密钥文件为 .dev.vars
 * （wrangler 4.x 读取带点前缀的 .dev.vars，而非 dev.vars）。
 */
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDir, '..');
const PORT = Number(process.env.PORT ?? 8792);
const BASE = `http://127.0.0.1:${PORT}`;
const DEFAULT_TOKEN = 'integration-test-token';
const DEVICE = 'device-integration';

const failures = [];
function check(name, condition, detail) {
  const ok = Boolean(condition);
  console.log(`${ok ? '✅' : '❌'} ${name}${ok || detail === undefined ? '' : ` —— ${detail}`}`);
  if (!ok) failures.push(name);
}

// ---------- 准备阶段 ----------
// 1. .dev.vars（本地开发令牌；gitignored）。已存在则沿用其中的 SYNC_TOKEN。
let token = DEFAULT_TOKEN;
const devVarsPath = join(projectRoot, '.dev.vars');
if (existsSync(devVarsPath)) {
  const match = readFileSync(devVarsPath, 'utf8').match(/^SYNC_TOKEN=(.+)$/m);
  if (match) token = match[1].trim();
} else {
  writeFileSync(devVarsPath, `SYNC_TOKEN=${DEFAULT_TOKEN}\n`);
}

const wranglerBin = join(projectRoot, 'node_modules', '.bin', 'wrangler');

// 2. 清理本地 D1（可重复运行），并确保 migration 已应用（幂等）
for (const table of ['changes', 'mutations', 'records']) {
  execFileSync(wranglerBin, ['d1', 'execute', 'orbis', '--local', '--command', `DELETE FROM ${table}`], {
    cwd: projectRoot,
    stdio: 'pipe',
  });
}
execFileSync(wranglerBin, ['d1', 'migrations', 'apply', 'orbis', '--local'], {
  cwd: projectRoot,
  stdio: 'pipe',
});

// 3. 启动 wrangler dev（本地模式为默认，无需 --remote）
const dev = spawn(wranglerBin, ['dev', '--port', String(PORT)], {
  cwd: projectRoot,
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
});
let devOutput = '';
dev.stdout.on('data', (chunk) => {
  devOutput += chunk;
});
dev.stderr.on('data', (chunk) => {
  devOutput += chunk;
});

const deadline = Date.now() + 60_000;
let ready = false;
while (Date.now() < deadline) {
  try {
    const response = await fetch(`${BASE}/health`, { headers: { Authorization: `Bearer ${token}` } });
    if (response.ok) {
      ready = true;
      break;
    }
  } catch {
    // 服务尚未启动
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}
if (!ready) {
  console.error('wrangler dev 未在 60 秒内就绪。输出：\n' + devOutput);
  try {
    process.kill(-dev.pid, 'SIGTERM');
  } catch {
    dev.kill('SIGTERM');
  }
  process.exit(1);
}

// ---------- 工具 ----------
async function api(method, path, { body, authToken = token } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(authToken !== null ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  if (text.length > 0) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  return { status: response.status, json };
}

let mutationCounter = 0;
function nextMutationId() {
  mutationCounter += 1;
  return `m-${mutationCounter}`;
}

const upsert = (type, recordId, payload, baseVersion) => ({
  type,
  recordId,
  operation: 'upsert',
  payload,
  mutationId: nextMutationId(),
  baseVersion,
});

const remove = (type, recordId, baseVersion) => ({
  type,
  recordId,
  operation: 'delete',
  payload: undefined,
  mutationId: nextMutationId(),
  baseVersion,
});

async function push(workspaceId, mutations) {
  return api('POST', '/sync/push', { body: { workspaceId, deviceId: DEVICE, mutations } });
}

async function pull(workspaceId, after = 0, limit = 100) {
  return api('GET', `/sync/pull?workspaceId=${encodeURIComponent(workspaceId)}&after=${after}&limit=${limit}`);
}

async function bootstrap(workspaceId) {
  return api('GET', `/sync/bootstrap?workspaceId=${encodeURIComponent(workspaceId)}`);
}

function d1Query(sql) {
  const output = execFileSync(wranglerBin, ['d1', 'execute', 'orbis', '--local', '--command', sql], {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // 输出形如「⛅️ wrangler x.y.z 横幅 + 空行 + JSON 数组」，从第一个 [ 起解析
  const jsonStart = output.indexOf('[');
  if (jsonStart === -1) {
    throw new Error(`wrangler d1 execute 未输出 JSON：${output}`);
  }
  const parsed = JSON.parse(output.slice(jsonStart));
  return parsed[0]?.results ?? [];
}

// ---------- 场景矩阵 ----------
const WORKSPACE = `t03-${Math.random().toString(36).slice(2, 8)}`;
const OTHER_WORKSPACE = `${WORKSPACE}-x`;

// 场景 0：T02 回归
{
  const noAuth = await api('GET', '/health', { authToken: null });
  check('回归：无 Token 拒绝（401）', noAuth.status === 401, JSON.stringify(noAuth));
  const badAuth = await api('GET', '/health', { authToken: 'wrong-token' });
  check('回归：错误 Token 拒绝（401）', badAuth.status === 401, JSON.stringify(badAuth));
  const badType = await push(WORKSPACE, [upsert('webdav_config', 'x', {}, null)]);
  check(
    '回归：排除类型拒绝（400 INVALID_RECORD_TYPE）',
    badType.status === 400 && badType.json?.error?.code === 'INVALID_RECORD_TYPE',
    JSON.stringify(badType),
  );
}

// 场景 1：mutation 幂等（同一 mutationId 只生效一次）
{
  const mutation = upsert('bazi_case', 'case-a', { id: 'case-a', name: '案例 A' }, null);
  const first = await push(WORKSPACE, [mutation]);
  check(
    '幂等：首次 push 成功（applied, serverVersion=1）',
    first.status === 200 && first.json.results[0].status === 'applied' && first.json.results[0].serverVersion === 1,
    JSON.stringify(first),
  );
  const replay = await push(WORKSPACE, [mutation]);
  check(
    '幂等：同一 mutationId 重放不重复写入（idempotent, serverVersion=1）',
    replay.status === 200 && replay.json.results[0].status === 'idempotent' && replay.json.results[0].serverVersion === 1,
    JSON.stringify(replay),
  );
  const rows = d1Query(`SELECT COUNT(*) AS cnt FROM changes WHERE workspace_id = '${WORKSPACE}' AND record_id = 'case-a'`);
  check('幂等：changes 中 case-a 仅 1 条', Number(rows[0]?.cnt) === 1, JSON.stringify(rows));
}

// 场景 2：软删除 tombstone 传播
{
  const create = await push(WORKSPACE, [upsert('qimen_case', 'case-b', { id: 'case-b', name: '案例 B' }, null)]);
  check('tombstone：创建成功（serverVersion=1）', create.status === 200 && create.json.results[0].serverVersion === 1, JSON.stringify(create));
  const del = await push(WORKSPACE, [remove('qimen_case', 'case-b', 1)]);
  check('tombstone：删除成功（serverVersion=2）', del.status === 200 && del.json.results[0].serverVersion === 2, JSON.stringify(del));
  const pulled = await pull(WORKSPACE);
  const tombstone = pulled.json.changes.find((change) => change.recordId === 'case-b' && change.deleted === 1);
  check(
    'tombstone：pull 能拿到删除条目（deleted=1, payload=null, serverVersion=2）',
    Boolean(tombstone) && tombstone.payload === null && tombstone.serverVersion === 2,
    JSON.stringify(pulled.json),
  );
  const rows = d1Query(`SELECT deleted, server_version FROM records WHERE workspace_id = '${WORKSPACE}' AND record_id = 'case-b'`);
  check(
    'tombstone：records 中为 deleted=1, server_version=2',
    rows[0]?.deleted === 1 && rows[0]?.server_version === 2,
    JSON.stringify(rows),
  );
}

// 场景 3：分页游标连续不丢不重
{
  const ids = Array.from({ length: 25 }, (_, i) => `r-${String(i + 1).padStart(3, '0')}`);
  const bulk = await push(WORKSPACE, ids.map((id) => upsert('sanyuan_case', id, { id }, null)));
  check('分页：25 条批量 push 成功', bulk.status === 200 && bulk.json.results.length === 25, JSON.stringify(bulk.status));

  const seen = [];
  let after = 0;
  for (let page = 1; page <= 10; page += 1) {
    const body = (await pull(WORKSPACE, after, 10)).json;
    seen.push(...body.changes);
    if (!body.hasMore) {
      check(`分页：第 ${page} 页 hasMore=false（末页）`, body.hasMore === false, JSON.stringify(body));
      break;
    }
    check(
      `分页：第 ${page} 页 hasMore=true 且 nextCursor 有效`,
      body.hasMore === true && typeof body.nextCursor === 'number',
      JSON.stringify({ hasMore: body.hasMore, nextCursor: body.nextCursor }),
    );
    after = body.nextCursor;
  }
  const recordIds = seen.map((change) => change.recordId);
  const pageRecords = recordIds.filter((id) => id.startsWith('r-'));
  check(
    '分页：25 条 r- 记录全部拉到且不重复',
    pageRecords.length === 25 && new Set(pageRecords).size === 25,
    `拉到 ${pageRecords.length} 条，去重 ${new Set(pageRecords).size}`,
  );
  const sequences = seen.map((change) => change.sequence);
  const strictlyIncreasing = sequences.every((value, index) => index === 0 || sequences[index - 1] < value);
  check('分页：跨页 sequence 严格递增（不丢不重）', strictlyIncreasing, JSON.stringify(sequences));
}

// 场景 4：版本冲突 409
{
  const create = await push(WORKSPACE, [upsert('profile', 'profile', { id: 'profile', full_name: '甲' }, null)]);
  check('冲突：创建 profile 成功（serverVersion=1）', create.status === 200 && create.json.results[0].serverVersion === 1, JSON.stringify(create));

  const stale = await push(WORKSPACE, [upsert('profile', 'profile', { id: 'profile', full_name: '乙' }, null)]);
  check(
    '冲突：baseVersion=null 推已存在记录 → 409 且带当前版本与内容',
    stale.status === 409 &&
      stale.json.error.code === 'CONFLICT' &&
      stale.json.conflicts[0].serverVersion === 1 &&
      stale.json.conflicts[0].payload.full_name === '甲',
    JSON.stringify(stale),
  );

  const wrongVersion = await push(WORKSPACE, [upsert('profile', 'profile', { id: 'profile', full_name: '丙' }, 999)]);
  check(
    '冲突：错误 baseVersion=999 → 409',
    wrongVersion.status === 409 && wrongVersion.json.conflicts[0].serverVersion === 1,
    JSON.stringify(wrongVersion),
  );

  const good = await push(WORKSPACE, [upsert('profile', 'profile', { id: 'profile', full_name: '丙' }, 1)]);
  check('冲突：正确 baseVersion=1 更新成功（serverVersion=2）', good.status === 200 && good.json.results[0].serverVersion === 2, JSON.stringify(good));
}

// 场景 5：内容一致恢复（崩溃窗口/重复推送不产生冲突）
{
  const current = await bootstrap(WORKSPACE);
  const profileRemote = current.json.records.find((record) => record.recordId === 'profile');
  const duplicate = await push(WORKSPACE, [upsert('profile', 'profile', profileRemote.payload, null)]);
  check(
    '恢复：内容一致 + stale baseVersion → duplicate_content 成功（非 409）',
    duplicate.status === 200 && duplicate.json.results[0].status === 'duplicate_content' && duplicate.json.results[0].serverVersion === 2,
    JSON.stringify(duplicate),
  );
  const rows = d1Query(`SELECT COUNT(*) AS cnt FROM changes WHERE workspace_id = '${WORKSPACE}' AND record_id = 'profile'`);
  check('恢复：内容一致推送不产生新 changes 条目', Number(rows[0]?.cnt) === 2, JSON.stringify(rows));
}

// 场景 6：跨 workspace 隔离
{
  const pushed = await push(OTHER_WORKSPACE, [upsert('bazi_case', 'other-1', { id: 'other-1' }, null)]);
  check('隔离：OTHER_WORKSPACE push 成功', pushed.status === 200, JSON.stringify(pushed));

  const pulled = await pull(WORKSPACE);
  check(
    '隔离：WORKSPACE pull 看不到 OTHER_WORKSPACE 的记录',
    !pulled.json.changes.some((change) => change.recordId === 'other-1'),
    JSON.stringify(pulled.json.changes.slice(-3)),
  );
  const bootstrapped = await bootstrap(WORKSPACE);
  check(
    '隔离：WORKSPACE bootstrap 不含 other-1',
    !bootstrapped.json.records.some((record) => record.recordId === 'other-1'),
  );
  const otherPull = await pull(OTHER_WORKSPACE);
  check(
    '隔离：OTHER_WORKSPACE pull 只见自身 1 条',
    otherPull.json.changes.length === 1 && otherPull.json.changes[0].recordId === 'other-1',
    JSON.stringify(otherPull.json),
  );
  const otherBootstrap = await bootstrap(OTHER_WORKSPACE);
  check('隔离：OTHER_WORKSPACE bootstrap 只见自身记录', otherBootstrap.json.records.length === 1, JSON.stringify(otherBootstrap.json));
}

// 场景 7：records 与 changes 状态一致
{
  const rows = d1Query(
    `SELECT r.record_id AS record_id, r.server_version AS rec_version,
            (SELECT MAX(c.server_version) FROM changes c
             WHERE c.workspace_id = r.workspace_id AND c.record_type = r.record_type AND c.record_id = r.record_id) AS chg_version
     FROM records r WHERE r.workspace_id = '${WORKSPACE}'`,
  );
  const totalRecords = Number(d1Query(`SELECT COUNT(*) AS cnt FROM records WHERE workspace_id = '${WORKSPACE}'`)[0]?.cnt ?? 0);
  const mismatched = rows.filter((row) => Number(row.rec_version) !== Number(row.chg_version));
  check(
    '一致性：每条记录的最新 changes 版本 == records.server_version',
    rows.length > 0 && rows.length === totalRecords && mismatched.length === 0,
    JSON.stringify({ total: rows.length, totalRecords, mismatched }),
  );
}

// 场景 8：bootstrap 内容与最大序号
{
  const boot = await bootstrap(WORKSPACE);
  const liveIds = boot.json.records.map((record) => record.recordId);
  check(
    'bootstrap：含 case-a / r-001 / r-025 / profile',
    liveIds.includes('case-a') && liveIds.includes('r-001') && liveIds.includes('r-025') && liveIds.includes('profile'),
    JSON.stringify(liveIds),
  );
  check('bootstrap：不含墓碑 case-b', !liveIds.includes('case-b'));
  const maxSeq = d1Query(`SELECT MAX(sequence) AS max_seq FROM changes WHERE workspace_id = '${WORKSPACE}'`);
  check(
    'bootstrap：currentSequence 与 D1 MAX(sequence) 一致',
    Number(maxSeq[0]?.max_seq) === boot.json.currentSequence,
    JSON.stringify({ db: maxSeq[0]?.max_seq, api: boot.json.currentSequence }),
  );
}

// 场景 9：pull 分页参数校验回归
{
  const badAfter = await api('GET', `/sync/pull?workspaceId=${WORKSPACE}&after=-1`);
  check('参数：after=-1 拒绝（400）', badAfter.status === 400, JSON.stringify(badAfter));
  const badLimit = await api('GET', `/sync/pull?workspaceId=${WORKSPACE}&limit=0`);
  check('参数：limit=0 拒绝（400）', badLimit.status === 400, JSON.stringify(badLimit));
  const overLimit = await api('GET', `/sync/pull?workspaceId=${WORKSPACE}&limit=201`);
  check('参数：limit=201 超上限拒绝（400）', overLimit.status === 400, JSON.stringify(overLimit));
}

// ---------- 清理 ----------
try {
  process.kill(-dev.pid, 'SIGTERM');
} catch {
  dev.kill('SIGTERM');
}

console.log('');
if (failures.length > 0) {
  console.error(`❌ 集成测试失败 ${failures.length} 项：${failures.join('；')}`);
  process.exit(1);
}
console.log('✅ 集成测试全部通过');
process.exit(0);
