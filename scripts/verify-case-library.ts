const baseUrl = process.env.CASE_LIBRARY_URL;
if (!baseUrl) throw new Error('请设置 CASE_LIBRARY_URL，例如 https://orbis.<subdomain>.workers.dev');

const api = baseUrl.replace(/\/$/, '');
const directoryResponse = await fetch(api + '/api/public/cases?pageSize=250');
if (!directoryResponse.ok) throw new Error('目录请求失败：' + directoryResponse.status);
const directory = await directoryResponse.json() as { entries: Array<{ id: string }>; total: number };
if (!directory.entries.length) throw new Error('目录为空。');

const sample = directory.entries[0];
const contentResponse = await fetch(api + '/api/public/cases/' + encodeURIComponent(sample.id) + '/content');
if (!contentResponse.ok) throw new Error('样例内容请求失败：' + contentResponse.status);
const body = await contentResponse.text();
if (!body.startsWith('#')) throw new Error('样例内容不是预期的 Markdown。');
console.log(JSON.stringify({ total: directory.total, sampledId: sample.id, sampledBytes: body.length }, null, 2));
