/**
 * Orbis 云同步 Worker（用户自部署组件）。
 *
 * 第一版接口（实施方案 §4.1）：
 * - GET  /health          连通性与鉴权自检
 * - POST /sync/push       批量提交本地变更
 * - GET  /sync/pull       按服务端序号增量拉取
 * - GET  /sync/bootstrap  新设备首次全量拉取
 *
 * 所有路由均需鉴权（T02 子步骤 1）；统一错误结构见 errors.ts。
 */
import { requireAuth } from './auth';
import { SERVICE_NAME, SERVICE_VERSION } from './constants';
import { ApiError, jsonError } from './errors';
import type { Env } from './env';
import { parseJsonBody, parsePullParams, validatePushRequest, validateWorkspaceId } from './validation';
import { processBootstrap, processPull, processPush } from './sync';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      await requireAuth(request, env.SYNC_TOKEN);

      if (url.pathname === '/health') {
        if (request.method !== 'GET') {
          throw new ApiError('METHOD_NOT_ALLOWED', '仅支持 GET 请求', 405);
        }
        return Response.json({
          service: SERVICE_NAME,
          version: SERVICE_VERSION,
          status: 'ok',
          timestamp: new Date().toISOString(),
        });
      }

      if (url.pathname === '/sync/push') {
        if (request.method !== 'POST') {
          throw new ApiError('METHOD_NOT_ALLOWED', '仅支持 POST 请求', 405);
        }
        const rawBody = await request.text();
        const pushRequest = validatePushRequest(parseJsonBody(rawBody), new TextEncoder().encode(rawBody).length);
        const { results, conflicts } = await processPush(env, pushRequest);
        if (conflicts.length > 0) {
          // 部分成功：已应用的条目在 results 中（客户端可清出 outbox），
          // 冲突条目在 conflicts 中（客户端按类型策略处理，§4.3 第 5 条）
          return Response.json(
            {
              error: { code: 'CONFLICT', message: `${conflicts.length} 条变更与远端版本冲突` },
              results,
              conflicts,
            },
            { status: 409 },
          );
        }
        return Response.json({ results }, { status: 200 });
      }

      if (url.pathname === '/sync/pull') {
        if (request.method !== 'GET') {
          throw new ApiError('METHOD_NOT_ALLOWED', '仅支持 GET 请求', 405);
        }
        const workspaceId = validateWorkspaceId(url.searchParams.get('workspaceId'));
        const { after, limit } = parsePullParams(url.searchParams);
        const outcome = await processPull(env, workspaceId, after, limit);
        return Response.json(outcome, { status: 200 });
      }

      if (url.pathname === '/sync/bootstrap') {
        if (request.method !== 'GET') {
          throw new ApiError('METHOD_NOT_ALLOWED', '仅支持 GET 请求', 405);
        }
        const workspaceId = validateWorkspaceId(url.searchParams.get('workspaceId'));
        const outcome = await processBootstrap(env, workspaceId);
        return Response.json(outcome, { status: 200 });
      }

      throw new ApiError('NOT_FOUND', `未知路由：${url.pathname}`, 404);
    } catch (error) {
      if (error instanceof ApiError) {
        return jsonError(error.code, error.message, error.status);
      }
      console.error('未处理错误', error);
      return jsonError('INTERNAL_ERROR', '服务端内部错误', 500);
    }
  },
};
