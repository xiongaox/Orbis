/**
 * Orbis 云同步 Worker（用户自部署组件）。
 *
 * 第一版接口（实施方案 §4.1）：
 * - GET  /health          连通性与鉴权自检
 * - POST /sync/push       批量提交本地变更（T02 完成输入边界；T03 实现写入）
 * - GET  /sync/pull       按服务端序号增量拉取（同 T03）
 * - GET  /sync/bootstrap  新设备首次全量拉取（同 T03）
 *
 * 所有路由均需鉴权（T02 子步骤 1）；统一错误结构见 errors.ts。
 */
import { requireAuth } from './auth';
import { SERVICE_NAME, SERVICE_VERSION } from './constants';
import { ApiError, jsonError } from './errors';
import type { Env } from './env';
import { parseJsonBody, validatePushRequest, validateWorkspaceId } from './validation';

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
        const body = parseJsonBody(rawBody);
        validatePushRequest(body, new TextEncoder().encode(rawBody).length);
        // T03 实现：D1 原子写入、mutation 幂等、版本冲突检测
        throw new ApiError('NOT_IMPLEMENTED', 'push 写入逻辑由 T03 实现', 501);
      }

      if (url.pathname === '/sync/pull') {
        if (request.method !== 'GET') {
          throw new ApiError('METHOD_NOT_ALLOWED', '仅支持 GET 请求', 405);
        }
        validateWorkspaceId(url.searchParams.get('workspaceId'));
        // T03 实现：after/limit 游标校验与增量拉取
        throw new ApiError('NOT_IMPLEMENTED', 'pull 拉取逻辑由 T03 实现', 501);
      }

      if (url.pathname === '/sync/bootstrap') {
        if (request.method !== 'GET') {
          throw new ApiError('METHOD_NOT_ALLOWED', '仅支持 GET 请求', 405);
        }
        validateWorkspaceId(url.searchParams.get('workspaceId'));
        // T03 实现：新设备首次全量拉取
        throw new ApiError('NOT_IMPLEMENTED', 'bootstrap 拉取逻辑由 T03 实现', 501);
      }

      throw new ApiError('NOT_FOUND', `未知路由：${url.pathname}`, 404);
    } catch (error) {
      if (error instanceof ApiError) {
        return jsonError(error.code, error.message, error.status);
      }
      throw error;
    }
  },
};
