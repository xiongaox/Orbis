/** Worker 绑定（wrangler.toml）：D1 数据库与同步密钥 */
export interface Env {
  DB: D1Database;
  SYNC_TOKEN: string;
}
