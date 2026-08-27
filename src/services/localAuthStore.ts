export interface LocalUser {
  id: string;
  email: string;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
  created_at: string;
}

interface LocalAccount extends LocalUser {
  passwordHash: string;
}

export interface LocalAuthBackup {
  accounts: Array<LocalUser & { passwordHash: string }>;
  session: LocalUser | null;
}

const ACCOUNTS_KEY = 'orbis-local-accounts';
const SESSION_KEY = 'orbis-local-session';
const OTP_KEY = 'orbis-local-otp';

const read = <T>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));

function toPublicUser(account: LocalAccount): LocalUser {
  const { passwordHash, ...user } = account;
  void passwordHash;
  return user;
}

async function hashPassword(password: string) {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const bytes = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return btoa(unescape(encodeURIComponent(password)));
}

export async function createLocalAccount(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = read<LocalAccount[]>(ACCOUNTS_KEY, []);
  if (accounts.some((account) => account.email === normalizedEmail)) throw new Error('该用户名已注册');
  const user: LocalUser = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    user_metadata: {},
    app_metadata: { provider: 'local' },
    created_at: new Date().toISOString(),
  };
  accounts.push({ ...user, passwordHash: await hashPassword(password) });
  write(ACCOUNTS_KEY, accounts);
  write(SESSION_KEY, user);
  return user;
}

export async function signInLocalAccount(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const account = read<LocalAccount[]>(ACCOUNTS_KEY, []).find((item) => item.email === normalizedEmail);
  if (!account || account.passwordHash !== await hashPassword(password)) throw new Error('用户名或密码错误');
  const user = toPublicUser(account);
  write(SESSION_KEY, user);
  return user;
}

export function getLocalSession(): LocalUser | null {
  return read<LocalUser | null>(SESSION_KEY, null);
}

export function clearLocalSession() {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * 导出本地账号与当前会话，供 WebDAV 完整备份使用。
 * 密码始终以既有的哈希值保存，不会在备份中出现明文密码。
 */
export function exportLocalAuthBackup(): LocalAuthBackup {
  return {
    accounts: read<LocalAccount[]>(ACCOUNTS_KEY, []).map((account) => ({ ...account })),
    session: getLocalSession(),
  };
}

export function restoreLocalAuthBackup(backup: LocalAuthBackup) {
  if (!Array.isArray(backup.accounts)) throw new Error('登录数据格式不正确');
  const accounts = backup.accounts.filter((account): account is LocalAccount => (
    Boolean(account)
    && typeof account.id === 'string'
    && typeof account.email === 'string'
    && typeof account.passwordHash === 'string'
    && typeof account.created_at === 'string'
  ));
  write(ACCOUNTS_KEY, accounts);
  if (backup.session?.id && accounts.some((account) => account.id === backup.session?.id)) {
    write(SESSION_KEY, backup.session);
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
  emitAuthChange();
}

export function subscribeLocalAuth(callback: (user: LocalUser | null) => void) {
  const listener = () => callback(getLocalSession());
  window.addEventListener('orbis-auth-change', listener);
  return { unsubscribe: () => window.removeEventListener('orbis-auth-change', listener) };
}

function emitAuthChange() {
  window.dispatchEvent(new Event('orbis-auth-change'));
}

export async function changeLocalPassword(userId: string, currentPassword: string, newPassword: string) {
  const accounts = read<LocalAccount[]>(ACCOUNTS_KEY, []);
  const index = accounts.findIndex((account) => account.id === userId);
  if (index < 0 || accounts[index].passwordHash !== await hashPassword(currentPassword)) throw new Error('当前密码错误');
  accounts[index] = { ...accounts[index], passwordHash: await hashPassword(newPassword) };
  write(ACCOUNTS_KEY, accounts);
  emitAuthChange();
}

export async function resetLocalPassword(username: string, newPassword: string) {
  const normalizedUsername = username.trim().toLowerCase();
  const accounts = read<LocalAccount[]>(ACCOUNTS_KEY, []);
  const index = accounts.findIndex((account) => account.email === normalizedUsername);
  if (index < 0) throw new Error('未找到该用户名');
  accounts[index] = { ...accounts[index], passwordHash: await hashPassword(newPassword) };
  write(ACCOUNTS_KEY, accounts);
}

export async function changeLocalUsername(userId: string, username: string) {
  const normalizedUsername = username.trim().toLowerCase();
  if (!normalizedUsername) throw new Error('请输入用户名');

  const accounts = read<LocalAccount[]>(ACCOUNTS_KEY, []);
  const index = accounts.findIndex((account) => account.id === userId);
  if (index < 0) throw new Error('当前账号不存在');
  if (accounts.some((account, accountIndex) => accountIndex !== index && account.email === normalizedUsername)) {
    throw new Error('该用户名已注册');
  }

  const account = { ...accounts[index], email: normalizedUsername };
  accounts[index] = account;
  write(ACCOUNTS_KEY, accounts);

  const session = getLocalSession();
  if (session?.id === userId) {
    write(SESSION_KEY, toPublicUser(account));
  }
  emitAuthChange();
  return toPublicUser(account);
}

export function createLocalOtp(email: string) {
  const token = String(Math.floor(100000 + Math.random() * 900000));
  write(OTP_KEY, { email: email.trim().toLowerCase(), token, expiresAt: Date.now() + 10 * 60 * 1000 });
  return token;
}

export async function verifyLocalOtp(email: string, token: string) {
  const otp = read<{ email: string; token: string; expiresAt: number } | null>(OTP_KEY, null);
  if (!otp || otp.email !== email.trim().toLowerCase() || otp.token !== token || otp.expiresAt < Date.now()) throw new Error('验证码无效或已过期');
  localStorage.removeItem(OTP_KEY);
  const account = read<LocalAccount[]>(ACCOUNTS_KEY, []).find((item) => item.email === email.trim().toLowerCase());
  if (!account) return createLocalAccount(email, `otp-${crypto.randomUUID()}`);
  const user = toPublicUser(account);
  write(SESSION_KEY, user);
  return user;
}
