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
  if (accounts.some((account) => account.email === normalizedEmail)) throw new Error('该邮箱已注册');
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
  if (!account || account.passwordHash !== await hashPassword(password)) throw new Error('邮箱或密码错误');
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
