// Smoke for the full-feature license gate (Golf's lockdown vision).
// Three TDD cases per spec:
//   1. revoked license → /api/campaigns → 402
//   2. valid license   → /api/campaigns → 200 (passes through)
//   3. customer adds /api/custom/foo → revoked → 402 (default-deny covers it)
//
// Plus: public-path allow-list, degrade mutation-block, warning pass-through,
// mode header propagation. Run via `bun run smoke-license-gate.ts`.
//
// We exercise the middleware directly with a mock checkLicense (stub the
// brain call by patching global fetch). KV state is in-memory for the cache.

import { onRequest } from './functions/_middleware';

// ---- mocks ----

function makeKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    async get(key: string) { return store.get(key) ?? null; },
    async put(key: string, value: string) { store.set(key, value); },
    async delete(key: string) { store.delete(key); },
    async list() { return { keys: [], list_complete: true, cacheStatus: null } as any; },
  } as any as KVNamespace;
}

type BrainResponse = {
  status: number;
  body: Record<string, unknown>;
};

let nextBrainResponse: BrainResponse = {
  status: 200,
  body: { valid: true, status: 'active', license_id: 'lic_test', domain: 'c.example.com', tier: 'lifetime', seats: 5, features: ['all'], max_campaigns: null, expires_at: 4900000000, cache_ttl_sec: 3600 },
};

const originalFetch = globalThis.fetch;
(globalThis as any).fetch = async (input: string | URL | Request): Promise<Response> => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  if (url.includes('/v1/license/validate')) {
    return Response.json(nextBrainResponse.body, { status: nextBrainResponse.status });
  }
  return originalFetch(input);
};

// Build a fake Context shape that CF Pages passes to middleware.
function makeContext(opts: {
  url: string;
  method?: string;
  nextResponse?: Response;
  env?: Record<string, unknown>;
}) {
  const kv = makeKv();
  const env = {
    ADBOT_LICENSE_JWT: 'eyJfake.eyJclaims.sig',
    ADBOT_DOMAIN: 'c.example.com',
    ADBOT_BRAIN_URL: 'https://brain.example.com',
    STATE_KV: kv,
    ...opts.env,
  };
  const next = async () => opts.nextResponse ?? new Response(JSON.stringify({ route: 'hit' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  return {
    request: new Request(opts.url, { method: opts.method ?? 'GET' }),
    env,
    next,
  } as any;
}

async function call(url: string, method = 'GET', env?: Record<string, unknown>): Promise<{ status: number; body: any; headers: Record<string, string> }> {
  const ctx = makeContext({ url, method, env });
  const res = await onRequest(ctx);
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => { headers[k] = v; });
  let body: any; try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body, headers };
}

// ---- assertions ----

const results: Array<{ name: string; ok: boolean; got?: any; expected?: any }> = [];
function expect(name: string, ok: boolean, got?: any, expected?: any) { results.push({ name, ok, got, expected }); }

// Spec case 1: revoked license → /api/campaigns → 402
{
  nextBrainResponse = {
    status: 403,
    body: { valid: false, reason: 'revoked', mode: 'blocked', revoked_reason: 'fraud' },
  };
  const { status, body } = await call('https://app/api/fb/campaigns');
  expect('spec1_revoked_campaigns_402', status === 402, status, 402);
  expect('spec1_error_license_required', body.error === 'license_required', body.error);
  expect('spec1_mode_hard_block', body.mode === 'hard_block', body.mode);
}

// Spec case 2: valid license → /api/campaigns → 200
{
  nextBrainResponse = {
    status: 200,
    body: { valid: true, status: 'active', license_id: 'lic_test', domain: 'c.example.com', tier: 'lifetime', seats: 5, features: ['all'], max_campaigns: null, expires_at: 4900000000, cache_ttl_sec: 3600 },
  };
  const { status, body } = await call('https://app/api/fb/campaigns');
  expect('spec2_valid_200', status === 200, status, 200);
  expect('spec2_passes_through', body?.route === 'hit', body);
}

// Spec case 3: custom endpoint /api/custom/foo with revoked → 402 (default-deny covers it)
{
  nextBrainResponse = {
    status: 403,
    body: { valid: false, reason: 'revoked', mode: 'blocked', revoked_reason: 'tos_violation' },
  };
  const { status, body } = await call('https://app/api/custom/foo');
  expect('spec3_custom_revoked_402', status === 402, status, 402);
  expect('spec3_default_deny', body.error === 'license_required', body.error);
}

// ---- additional coverage ----

// Public: /api/auth/login passes through even when revoked
{
  nextBrainResponse = {
    status: 403,
    body: { valid: false, reason: 'revoked', mode: 'blocked', revoked_reason: 'fraud' },
  };
  const { status } = await call('https://app/api/auth/login', 'POST');
  expect('public_auth_login_passes_during_revoke', status === 200, status, 200);
}

// Public: /api/license/status passes through even when revoked
{
  const { status } = await call('https://app/api/license/status');
  expect('public_license_status_passes', status === 200, status, 200);
}

// Public: /api/license/setup passes through (bootstrap)
{
  const { status } = await call('https://app/api/license/setup', 'POST');
  expect('public_license_setup_passes', status === 200, status, 200);
}

// Public: /api/health passes through
{
  const { status } = await call('https://app/api/health');
  expect('public_health_passes', status === 200, status, 200);
}

// Public: /api/telegram/webhook passes through
{
  const { status } = await call('https://app/api/telegram/webhook', 'POST');
  expect('public_telegram_webhook_passes', status === 200, status, 200);
}

// Non-API passes through untouched
{
  const { status } = await call('https://app/docs/customer-guide');
  expect('non_api_passes', status === 200, status, 200);
}

// Warning phase → pass + headers
{
  nextBrainResponse = {
    status: 200,
    body: {
      valid: true, status: 'warning', license_id: 'lic_test', domain: 'c.example.com',
      tier: 'lifetime', seats: 5, features: ['all'], max_campaigns: null,
      expires_at: 4900000000, cache_ttl_sec: 3600,
      mode: 'active', warning: 'license_revoked_grace', days_remaining: 5,
      grace_until: Math.floor(Date.now() / 1000) + 5 * 86400,
      revoked_reason: 'chargeback',
    },
  };
  const { status, headers } = await call('https://app/api/fb/campaigns');
  expect('warning_passes_200', status === 200, status, 200);
  expect('warning_header_state', headers['x-adbot-license-state'] === 'warning', headers['x-adbot-license-state']);
  expect('warning_header_warning_key', headers['x-adbot-license-warning'] === 'license_revoked_grace', headers['x-adbot-license-warning']);
  expect('warning_header_days', headers['x-adbot-license-days-remaining'] === '5', headers['x-adbot-license-days-remaining']);
}

// Degrade phase — GET passes with headers, POST blocked
{
  nextBrainResponse = {
    status: 200,
    body: {
      valid: false, reason: 'revoked', mode: 'read_only',
      days_remaining_hard: 15, revoked_reason: 'fraud',
      grace_until: Math.floor(Date.now() / 1000) - 3 * 86400,
    },
  };
  // GET passes (reads OK in degrade)
  const readRes = await call('https://app/api/fb/campaigns', 'GET');
  expect('degrade_get_passes_200', readRes.status === 200, readRes.status, 200);
  expect('degrade_get_header_state', readRes.headers['x-adbot-license-state'] === 'degrade', readRes.headers['x-adbot-license-state']);
  expect('degrade_get_days_hard', readRes.headers['x-adbot-license-days-remaining-hard'] === '15', readRes.headers['x-adbot-license-days-remaining-hard']);
  // POST blocked
  const writeRes = await call('https://app/api/fb/campaigns', 'POST');
  expect('degrade_post_blocked_402', writeRes.status === 402, writeRes.status, 402);
  expect('degrade_mode_field', writeRes.body.mode === 'degrade_mutation', writeRes.body.mode);
  expect('degrade_days_passthrough', writeRes.body.days_remaining_hard === 15, writeRes.body.days_remaining_hard);
  // PUT also blocked
  const putRes = await call('https://app/api/rules/rule-1', 'PUT');
  expect('degrade_put_blocked_402', putRes.status === 402, putRes.status, 402);
  // DELETE also blocked
  const delRes = await call('https://app/api/rules/rule-1', 'DELETE');
  expect('degrade_delete_blocked_402', delRes.status === 402, delRes.status, 402);
  // PATCH also blocked
  const patchRes = await call('https://app/api/team/members/m-1/role', 'PATCH');
  expect('degrade_patch_blocked_402', patchRes.status === 402, patchRes.status, 402);
}

// Misconfigured — env missing → 402 misconfigured
{
  const { status, body } = await call('https://app/api/fb/campaigns', 'GET', {
    ADBOT_LICENSE_JWT: undefined,
    ADBOT_DOMAIN: undefined,
  });
  expect('misconfigured_402', status === 402, status, 402);
  expect('misconfigured_mode', body.mode === 'misconfigured', body.mode);
}

// Prefix smuggling defense: /api/licensesomething should NOT match /api/license
{
  nextBrainResponse = {
    status: 403,
    body: { valid: false, reason: 'revoked', mode: 'blocked', revoked_reason: 'fraud' },
  };
  const { status } = await call('https://app/api/licensesomething');
  expect('no_prefix_smuggling', status === 402, status, 402);
}

// ---- teardown ----

(globalThis as any).fetch = originalFetch;

let fail = 0;
for (const r of results) {
  if (!r.ok) { console.error(`FAIL ${r.name}: got=${JSON.stringify(r.got)} expected=${JSON.stringify(r.expected)}`); fail++; }
}
if (fail > 0) { console.error(`\n${fail}/${results.length} assertion(s) failed`); process.exit(1); }
console.log(`✓ all ${results.length} license-gate assertions passed`);
