/**
 * 统一错误响应结构（实施方案 T02 子步骤 5）：{ error: { code, message } }。
 *
 * 错误码词汇表（便于客户端区分「鉴权失败 / 限流 / 数据非法 / 冲突」）：
 * - UNAUTHORIZED         401  鉴权失败
 * - INVALID_WORKSPACE    400  数据非法：工作区标识
 * - INVALID_JSON         400  数据非法：请求体不是合法 JSON
 * - INVALID_REQUEST      400  数据非法：请求结构
 * - INVALID_RECORD_TYPE  400  数据非法：记录类型不在白名单
 * - INVALID_OPERATION    400  数据非法：操作类型
 * - PAYLOAD_TOO_LARGE    413  单条 payload 超限
 * - BATCH_TOO_LARGE      413  单批条数或总字节超限
 * - METHOD_NOT_ALLOWED   405
 * - NOT_FOUND            404
 * - NOT_IMPLEMENTED      501  T02 边界：push/pull/bootstrap 的写入逻辑由 T03 实现
 * - CONFLICT             409  版本冲突（T03 起）
 * - RATE_LIMITED         429  限流（预留）
 */

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function jsonError(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}
