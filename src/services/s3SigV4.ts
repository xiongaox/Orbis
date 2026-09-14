/**
 * AWS Signature Version 4（service = s3）请求签名。
 *
 * 使用 Web Crypto 完成 SHA-256 与 HMAC-SHA256，浏览器需在 secure context 中运行；
 * Tauri WebView 的本地 origin 满足该条件。
 */

const encoder = new TextEncoder();

export const EMPTY_PAYLOAD_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

export function formatAmzDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export interface SigV4SigningInput {
  method: string;
  /** 已按 RFC3986 编码的请求路径，以 / 开头。 */
  canonicalUri: string;
  /** 已按 RFC3986 编码并按参数名排序的查询串（不含 ?），可为空。 */
  canonicalQuery: string;
  /** 参与签名的请求头；host 仅用于签名计算，无需真实发送。 */
  headers: Record<string, string>;
  payloadHash: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  /** 形如 YYYYMMDDTHHMMSSZ 的请求时间。 */
  amzDate: string;
}

export interface SigV4SigningResult {
  authorization: string;
  signedHeaders: string;
}

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value: string) {
  return toHex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

async function hmac(key: BufferSource, value: string) {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(value));
}

export async function signSigV4(input: SigV4SigningInput): Promise<SigV4SigningResult> {
  const dateStamp = input.amzDate.slice(0, 8);
  const scope = `${dateStamp}/${input.region}/s3/aws4_request`;
  const signedEntries = Object.entries(input.headers)
    .map(([name, value]) => [name.toLowerCase(), value.trim().replace(/\s+/g, ' ')] as const)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  const canonicalHeaders = signedEntries.map(([name, value]) => `${name}:${value}\n`).join('');
  const signedHeaders = signedEntries.map(([name]) => name).join(';');
  const canonicalRequest = [
    input.method.toUpperCase(),
    input.canonicalUri,
    input.canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    input.payloadHash,
  ].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', input.amzDate, scope, await sha256Hex(canonicalRequest)].join('\n');
  const kDate = await hmac(encoder.encode(`AWS4${input.secretAccessKey}`), dateStamp);
  const kRegion = await hmac(kDate, input.region);
  const kService = await hmac(kRegion, 's3');
  const kSigning = await hmac(kService, 'aws4_request');
  const signature = toHex(await hmac(kSigning, stringToSign));
  return {
    authorization: `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${scope},SignedHeaders=${signedHeaders},Signature=${signature}`,
    signedHeaders,
  };
}
