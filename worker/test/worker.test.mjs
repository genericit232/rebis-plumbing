// Run with: npm test   (inside worker/)
// Exercises the worker directly with a mocked Resend API. No network or Cloudflare account needed.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const ORIGIN = 'https://example.com.au';
const env = {
  RESEND_API_KEY: 're_test',
  TO_EMAIL: 'owner@example.com.au',
  FROM_EMAIL: 'Rebis Website <website@example.com.au>',
  ALLOWED_ORIGINS: `${ORIGIN},https://www.example.com.au`,
};

let sent;
let resendStatus;
beforeEach(() => {
  sent = [];
  resendStatus = 200;
  globalThis.fetch = async (url, init) => {
    sent.push({ url, body: JSON.parse(init.body), headers: init.headers });
    return new Response(JSON.stringify({ id: 'test' }), { status: resendStatus });
  };
});

function post(fields, { origin = ORIGIN, json = true } = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  const headers = { Accept: json ? 'application/json' : 'text/html' };
  if (origin) headers.Origin = origin;
  return worker.fetch(new Request('https://worker.test/', { method: 'POST', body: fd, headers }), env);
}

const good = { name: 'Jane Smith', phone: '0412 345 678', suburb: 'Cleveland', job: 'Hot water', details: 'No hot water\nsince Tuesday', t: String(Date.now() - 10000) };

test('valid submission sends one email via Resend', async () => {
  const res = await post(good);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, 'https://api.resend.com/emails');
  assert.equal(sent[0].headers.Authorization, 'Bearer re_test');
  assert.deepEqual(sent[0].body.to, ['owner@example.com.au']);
  assert.match(sent[0].body.subject, /Jane Smith - Hot water \(Cleveland\)/);
  assert.match(sent[0].body.html, /tel:0412345678/);
  assert.match(sent[0].body.html, /No hot water<br>since Tuesday/);
});

test('HTML in fields is escaped', async () => {
  await post({ ...good, name: '<script>x</script>' });
  assert.ok(!sent[0].body.html.includes('<script>x'));
  assert.match(sent[0].body.html, /&lt;script&gt;/);
});

test('rejects unknown origin', async () => {
  const res = await post(good, { origin: 'https://evil.example' });
  assert.equal(res.status, 403);
  assert.equal(sent.length, 0);
});

test('rejects missing origin', async () => {
  const res = await post(good, { origin: null });
  assert.equal(res.status, 403);
  assert.equal(sent.length, 0);
});

test('requires name and a sensible phone', async () => {
  assert.equal((await post({ ...good, name: '' })).status, 400);
  assert.equal((await post({ ...good, phone: '123' })).status, 400);
  assert.equal(sent.length, 0);
});

test('honeypot filled -> fake success, no email', async () => {
  const res = await post({ ...good, company: 'Spam Pty Ltd' });
  assert.equal(res.status, 200);
  assert.equal(sent.length, 0);
});

test('submitted too fast -> fake success, no email', async () => {
  const res = await post({ ...good, t: String(Date.now()) });
  assert.equal(res.status, 200);
  assert.equal(sent.length, 0);
});

test('no-JS post gets an HTML thank-you page', async () => {
  const { t, ...noT } = good;
  const res = await post(noT, { json: false });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('Content-Type'), /text\/html/);
  assert.match(await res.text(), /Thanks!/);
  assert.equal(sent.length, 1);
});

test('Resend failure -> 502', async () => {
  resendStatus = 422;
  const res = await post(good);
  assert.equal(res.status, 502);
  assert.equal((await res.json()).ok, false);
});

test('CORS preflight', async () => {
  const ok = await worker.fetch(new Request('https://worker.test/', { method: 'OPTIONS', headers: { Origin: ORIGIN } }), env);
  assert.equal(ok.status, 204);
  const bad = await worker.fetch(new Request('https://worker.test/', { method: 'OPTIONS', headers: { Origin: 'https://x.y' } }), env);
  assert.equal(bad.status, 403);
});

test('health check', async () => {
  const res = await worker.fetch(new Request('https://worker.test/health'), env);
  assert.equal(res.status, 200);
});
