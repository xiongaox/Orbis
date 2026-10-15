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

// 任何退出路径（含未捕获异常）都清理 wrangler dev 进程组，避免残留占用端口
function stopDev() {
  try {
    process.kill(-dev.pid, 'SIGTERM');
  } catch {
    try {
      dev.kill('SIGTERM');
    } catch {
      // 进程已退出
    }
  }
}
process.on('exit', stopDev);
process.on('uncaughtException', (error) => {
  console.error('未捕获异常：', error);
  stopDev();
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('未处理的 Promise 拒绝：', reason);
  stopDev();
  process.exit(1);
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
  // wrangler dev 会关闭空闲的 keep-alive 连接，而 d1Query（execFileSync）
  // 会阻塞事件循环——这期间客户端可能复用已被服务端关闭的 socket
  // （ECONNRESET）。网络层错误（TypeError: fetch failed）重试一次即可，
  // 真正的服务端故障会在重试时再次失败。
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
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
    } catch (error) {
      if (attempt === 1 || !(error instanceof TypeError)) throw error;
    }
  }
  throw new Error('不可达');
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
  return pushDevice(workspaceId, mutations, DEVICE);
}

async function pushDevice(workspaceId, mutations, deviceId) {
  return api('POST', '/sync/push', { body: { workspaceId, deviceId, mutations } });
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

// 场景 10：双设备端到端（T09 验收模拟：deviceA / deviceB 两台设备同一工作区）
{
  const WS = 'e2e-workspace';
  const DEVICE_A = 'device-a';
  const DEVICE_B = 'device-b';

  // 1. A 建记录 x-1 → B 首次同步（bootstrap）可见
  let response = await pushDevice(WS, [upsert('bazi_case', 'x-1', { id: 'x-1', title: 'A 创建' }, null)], DEVICE_A);
  check('双设备：A 建 x-1 成功', response.status === 200, JSON.stringify(response));
  const x1VersionAfterA = response.json.results[0].serverVersion;

  const bBootstrap = await bootstrap(WS);
  check('双设备：B 首次同步 bootstrap 含 x-1', bBootstrap.json.records.some((record) => record.recordId === 'x-1'), JSON.stringify(bBootstrap.json.records.map((record) => record.recordId)));
  const bCursor = bBootstrap.json.currentSequence;

  // 2. B 建记录 x-2 → A 增量 pull 可见（A 建 B 建）
  response = await pushDevice(WS, [upsert('bazi_case', 'x-2', { id: 'x-2', title: 'B 创建' }, null)], DEVICE_B);
  check('双设备：B 建 x-2 成功', response.status === 200, JSON.stringify(response));
  const aPull = await pull(WS, bCursor);
  check('双设备：A 增量 pull 见到 B 的 x-2', aPull.json.changes.some((change) => change.recordId === 'x-2'), JSON.stringify(aPull.json.changes));

  // 3. A 改 x-1（正确 baseVersion）→ B pull 可见新内容（A 改 B 收）
  response = await pushDevice(WS, [upsert('bazi_case', 'x-1', { id: 'x-1', title: 'A 修改' }, x1VersionAfterA)], DEVICE_A);
  check('双设备：A 改 x-1 成功（serverVersion=2）', response.status === 200 && response.json.results[0].serverVersion === 2, JSON.stringify(response));
  const bPull = await pull(WS, bCursor);
  const x1Change = bPull.json.changes.find((change) => change.recordId === 'x-1');
  check('双设备：B pull 见到 A 对 x-1 的修改', x1Change?.payload?.title === 'A 修改', JSON.stringify(x1Change));

  // 4. A 删 x-2（正确 baseVersion）→ B pull 拿到 tombstone，bootstrap 不复活（A 删 B 上线）
  response = await pushDevice(WS, [remove('bazi_case', 'x-2', 1)], DEVICE_A);
  check('双设备：A 删 x-2 成功', response.status === 200, JSON.stringify(response));
  const bPull2 = await pull(WS, bCursor);
  const x2Tombstone = bPull2.json.changes.find((change) => change.recordId === 'x-2' && change.deleted === 1);
  check('双设备：B pull 拿到 x-2 tombstone（deleted=1，payload=null）', x2Tombstone !== undefined && x2Tombstone.payload === null, JSON.stringify(bPull2.json.changes));
  const bootAfterDelete = await bootstrap(WS);
  check('双设备：删除后 bootstrap 不含 x-2（不复活）', !bootAfterDelete.json.records.some((record) => record.recordId === 'x-2'), JSON.stringify(bootAfterDelete.json.records.map((record) => record.recordId)));

  // 5. B 用过期 baseVersion 改 x-1（B 改 vs A 改）→ 409 且回执带当前版本与内容（客户端据此生成冲突副本）
  response = await pushDevice(WS, [upsert('bazi_case', 'x-1', { id: 'x-1', title: 'B 并发修改' }, 1)], DEVICE_B);
  check('双设备：B 过期 baseVersion 改 x-1 返回 409', response.status === 409, JSON.stringify(response));
  check(
    '双设备：409 回执含当前版本与内容（冲突副本素材）',
    response.json.conflicts?.[0]?.serverVersion === 2 && response.json.conflicts?.[0]?.payload?.title === 'A 修改',
    JSON.stringify(response.json?.conflicts?.[0]),
  );

  // 6. 重复 push：内容一致的过期推送走 duplicate_content 恢复（不产生新 change）；
  //    同一 mutationId 重放 → 幂等（网络重试不重复生效）
  const replay = {
    type: 'bazi_case',
    recordId: 'x-1',
    operation: 'upsert',
    payload: { id: 'x-1', title: 'A 修改' },
    mutationId: 'e2e-replay-1',
    baseVersion: 1, // 过期版本 + 内容与当前一致 → 恢复路径
  };
  response = await pushDevice(WS, [replay], DEVICE_A);
  check('双设备：内容一致的过期推送走 duplicate_content 恢复', response.status === 200 && response.json.results[0].status === 'duplicate_content', JSON.stringify(response));
  response = await pushDevice(WS, [replay], DEVICE_A);
  check('双设备：同一 mutationId 重放返回 idempotent', response.status === 200 && response.json.results[0].status === 'idempotent', JSON.stringify(response));

  // 7. 续传：游标之后的 pull 不再返回已同步 change（中途退出再启动续传）
  const lastSeq = bPull2.json.changes[bPull2.json.changes.length - 1].sequence;
  const resumePull = await pull(WS, lastSeq);
  check('双设备：游标续传不重复返回已同步 change', resumePull.json.changes.length === 0, JSON.stringify(resumePull.json.changes));
}

// ---------- 清理 ----------
stopDev();

console.log('');
if (failures.length > 0) {
  console.error(`❌ 集成测试失败 ${failures.length} 项：${failures.join('；')}`);
  process.exit(1);
}
console.log('✅ 集成测试全部通过');
process.exit(0);
