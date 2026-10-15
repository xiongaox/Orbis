import { ApiError } from './errors';

/**
 * 校验 `Authorization: Bearer <SYNC_TOKEN>`（实施方案 §5、T02 子步骤 1）。
 * 所有路由（含 /health）均需鉴权；/health 同时承担客户端的「连通性与鉴权自检」。
 */
export async function requireAuth(request: Request, expectedToken: string): Promise<void> {
  const header = request.headers.get('Authorization');
  const provided = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
  if (provided.length === 0 || !constantTimeEqual(provided, expectedToken)) {
    throw new ApiError('UNAUTHORIZED', '鉴权失败：缺少或无效的访问令牌', 401);
  }
}

/** 常量时间比较，避免令牌时序侧信道（长度不等时直接判定不等） */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const bytesA = encoder.encode(a);
  const bytesB = encoder.encode(b);
  let diff = 0;
  for (let i = 0; i < bytesA.length; i += 1) diff |= bytesA[i] ^ bytesB[i];
  return diff === 0;
}
