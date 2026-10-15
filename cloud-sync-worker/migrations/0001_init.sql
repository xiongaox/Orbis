-- Orbis 云同步 D1 初始化（实施方案 §4.2）
-- 全部 IF NOT EXISTS：migration 可重复执行不报错，老库平滑升级。

-- 当前有效记录（每工作区每对象一行）
CREATE TABLE IF NOT EXISTS records (
  workspace_id   TEXT    NOT NULL,
  record_type    TEXT    NOT NULL,
  record_id      TEXT    NOT NULL,
  payload_json   TEXT    NOT NULL,
  server_version INTEGER NOT NULL,
  deleted        INTEGER NOT NULL DEFAULT 0,   -- tombstone
  updated_at     TEXT    NOT NULL,
  device_id      TEXT    NOT NULL,
  PRIMARY KEY (workspace_id, record_type, record_id)
);

-- 变更日志：其他设备据此增量拉取
CREATE TABLE IF NOT EXISTS changes (
  sequence       INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id   TEXT    NOT NULL,
  record_type    TEXT    NOT NULL,
  record_id      TEXT    NOT NULL,
  server_version INTEGER NOT NULL,
  deleted        INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_changes_ws_seq ON changes(workspace_id, sequence);

-- 幂等去重：网络重试不会重复生效
CREATE TABLE IF NOT EXISTS mutations (
  workspace_id TEXT NOT NULL,
  mutation_id  TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  PRIMARY KEY (workspace_id, mutation_id)
);
