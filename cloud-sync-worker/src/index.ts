/**
 * Orbis 云同步 Worker（用户自部署组件）。
 *
 * 第一版接口（实施方案 §4.1）：
 * - GET  /health          连通性与鉴权自检（本点先返回服务信息；T02 起校验 SYNC_TOKEN）
 * - POST /sync/push       批量提交本地变更（T03）
 * - GET  /sync/pull       按服务端序号增量拉取（T03）
 * - GET  /sync/bootstrap  新设备首次全量拉取（T03）
 *
 * 统一错误响应结构（T02 细化）：{ error: { code, message } }。
 */

export interface Env {
  DB: D1Database;
  SYNC_TOKEN: string;
}

const SERVICE_NAME = 'orbis-cloud-sync';
const SERVICE_VERSION = '0.1.0';

export default {
  // env 在 T02（鉴权）起使用；T01 仅健康检查，按约定加 _ 前缀避免未使用告警。
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      if (request.method !== 'GET') {
        return jsonError('METHOD_NOT_ALLOWED', '仅支持 GET 请求', 405);
      }
      return Response.json({
        service: SERVICE_NAME,
        version: SERVICE_VERSION,
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
    }

    return jsonError('NOT_FOUND', `未知路由：${url.pathname}`, 404);
  },
};

function jsonError(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}
