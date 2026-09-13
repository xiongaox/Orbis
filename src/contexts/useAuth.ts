/** @deprecated 单工作区始终可用，保留兼容导出以支持旧组件。 */
export function useAuth() {
  return { user: null, loading: false, isAuthenticated: true };
}
