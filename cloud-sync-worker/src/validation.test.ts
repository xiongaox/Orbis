import { describe, expect, it } from 'vitest';
import { ApiError } from './errors';
import { validatePushRequest, validateWorkspaceId } from './validation';

const baseMutation = {
  type: 'qimen_case',
  recordId: 'case-1',
  operation: 'upsert',
  payload: { id: 'case-1' },
  mutationId: 'mutation-1',
  baseVersion: null,
};

function expectApiError(run: () => unknown, code: string, status: number): void {
  try {
    run();
    expect.unreachable('应抛出 ApiError');
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe(code);
    expect(apiError.status).toBe(status);
  }
}

describe('validateWorkspaceId', () => {
  it('接受字母、数字、下划线与横线', () => {
    expect(validateWorkspaceId('xiongaox')).toBe('xiongaox');
    expect(validateWorkspaceId('ws-2_A')).toBe('ws-2_A');
  });

  it('恰好 64 字符接受，65 字符拒绝', () => {
    expect(validateWorkspaceId('x'.repeat(64))).toBe('x'.repeat(64));
    expectApiError(() => validateWorkspaceId('x'.repeat(65)), 'INVALID_WORKSPACE', 400);
  });

  it('拒绝空值、非字符串与非法字符', () => {
    expectApiError(() => validateWorkspaceId(undefined), 'INVALID_WORKSPACE', 400);
    expectApiError(() => validateWorkspaceId(123), 'INVALID_WORKSPACE', 400);
    expectApiError(() => validateWorkspaceId(''), 'INVALID_WORKSPACE', 400);
    expectApiError(() => validateWorkspaceId('a b'), 'INVALID_WORKSPACE', 400);
    expectApiError(() => validateWorkspaceId('a/b'), 'INVALID_WORKSPACE', 400);
  });
});

describe('validatePushRequest 边界', () => {
  it('恰好 50 条通过批量校验', () => {
    const mutations = Array.from({ length: 50 }, (_, index) => ({
      ...baseMutation,
      recordId: `case-${index}`,
      mutationId: `mutation-${index}`,
    }));
    const result = validatePushRequest(
      { workspaceId: 'xiongaox', deviceId: 'device-1', mutations },
      100,
    );
    expect(result.mutations).toHaveLength(50);
  });

  it('51 条抛 BATCH_TOO_LARGE（413）', () => {
    const mutations = Array.from({ length: 51 }, (_, index) => ({
      ...baseMutation,
      recordId: `case-${index}`,
      mutationId: `mutation-${index}`,
    }));
    expectApiError(
      () => validatePushRequest({ workspaceId: 'w', deviceId: 'd', mutations }, 100),
      'BATCH_TOO_LARGE',
      413,
    );
  });

  it('总字节超限抛 BATCH_TOO_LARGE（413）', () => {
    expectApiError(
      () => validatePushRequest({ workspaceId: 'w', deviceId: 'd', mutations: [] }, 512 * 1024 + 1),
      'BATCH_TOO_LARGE',
      413,
    );
  });

  it('delete 操作无需 payload', () => {
    const result = validatePushRequest(
      {
        workspaceId: 'w',
        deviceId: 'd',
        mutations: [{ ...baseMutation, operation: 'delete', payload: undefined }],
      },
      100,
    );
    expect(result.mutations[0].operation).toBe('delete');
  });

  it('baseVersion 接受非负整数与 null', () => {
    const result = validatePushRequest(
      {
        workspaceId: 'w',
        deviceId: 'd',
        mutations: [{ ...baseMutation, baseVersion: 42 }],
      },
      100,
    );
    expect(result.mutations[0].baseVersion).toBe(42);
  });

  it('拒绝非数组 mutations 与非对象请求体', () => {
    expectApiError(
      () => validatePushRequest({ workspaceId: 'w', deviceId: 'd', mutations: 'nope' }, 100),
      'INVALID_REQUEST',
      400,
    );
    expectApiError(() => validatePushRequest(null, 100), 'INVALID_REQUEST', 400);
    expectApiError(() => validatePushRequest([], 100), 'INVALID_REQUEST', 400);
  });
});
