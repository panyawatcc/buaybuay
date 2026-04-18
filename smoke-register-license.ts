// Smoke for license-gated registration (Golf lockdown follow-up).
// TDD cases per spec:
//   1. invalid license JWT → /api/auth/register → 402
//   2. valid license + new email → /api/auth/register → 201 + JWT cookie
//   3. existing admin exists → subsequent register doesn't need license_jwt → 201
//
// Plus: missing license_jwt on first register → 402, missing domain → 402,
// brain unreachable → 402, degrade phase → 402 (block new admin creation),
// valid license DID persist to KV + env-hydrate picks it up on second call.
//
// Exercises the register.ts handler directly. Mocks:
//   - global fetch (brain validation)
//   - D1 DB (in-memory — tracks users + emits queries)
//   - STATE_KV (in-memory for license storage)

import { onRequestPost } from './functions/api/auth/register';

// ---- brain validation fetch mock ----

type BrainResponse = { status: number; body: Record<string, unknown> } | { throw: Error };
let nextBrainResponse: BrainResponse = {
  status: 200,
  body: {
    valid: true, status: 'active', license_id: 'lic_test',
    domain: 'c.example.com', tier: 'lifetime', seats: 5,
    features: ['all'], max_campaigns: null,
    expires_at: 4900000000, cache_ttl_sec: 3600,
  },
};
const originalFetch = globalThis.fetch;
(globalThis as any).fetch = async (input: string | URL | Request): Promise<Response> => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  if (url.includes('/v1/license/validate')) {
    if ('throw' in nextBrainResponse) throw nextBrainResponse.throw;
    return Response.json(nextBrainResponse.body, { status: nextBrainResponse.status });
  }
  return originalFetch(input);
};

// ---- D1 mock ----

function makeDb(): D1Database {
  // Very thin DB mock — tracks users by email, returns .first/.run signatures.
  const users = new Map<string, { id: string; email: string; name: string; role: string }>();
  const makeStmt = (sql: string) => {
    const bindings: unknown[] = [];
    return {
      bind(...args: unknown[]) { bindings.push(...args); return this; },
      async first() {
        if (sql.includes('SELECT id FROM users WHERE email')) {
          const [email] = bindings;
          const found = [...users.values()].find((u) => u.email === email);
          return found ? { id: found.id } : null;
        }
        return null;
      },
      async run() {
        if (sql.startsWith('INSERT INTO users')) {
          const [id, email, name, , , role] = bindings;
          users.set(email as string, { id: id as string, email: email as string, name: name as string, role: role as string });
        }
        return { success: true, meta: { duration: 0, rows_read: 0, rows_written: 1 } };
      },
    };
  };
  return { prepare(sql: string) { return makeStmt(sql); } } as any;
}

// ---- STATE_KV mock ----

function makeKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    async get(key: string) { return store.get(key) ?? null; },
    async put(key: string, value: string) { store.set(key, value); },
    async delete(key: string) { store.delete(key); },
    async list() { return { keys: [...store.keys()].map(name => ({ name })), list_complete: true, cacheStatus: null } as any; },
  } as any;
}

// ---- test harness ----

function makeCtx(db: D1Database, kv: KVNamespace, body: Record<string, unknown>, envExtras: Record<string, unknown> = {}) {
  return {
    request: new Request('https://app/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    env: {
      DB: db,
      STATE_KV: kv,
      JWT_SECRET: 'test-jwt-secret-ffffffffaaaaaaaa1111222233334444',
      ADBOT_BRAIN_URL: 'https://brain.example.com',
      ...envExtras,
    },
    // PagesFunction context has more fields but onRequestPost only uses these.
    next: async () => new Response('n/a'),
  } as any;
}

async function callRegister(db: D1Database, kv: KVNamespace, body: Record<string, unknown>, env: Record<string, unknown> = {}): Promise<{ status: number; body: any; cookie: string | null }> {
  const res = await onRequestPost(makeCtx(db, kv, body, env));
  let parsed: any; try { parsed = await res.json(); } catch { parsed = null; }
  return { status: res.status, body: parsed, cookie: res.headers.get('Set-Cookie') };
}

const results: Array<{ name: string; ok: boolean; got?: any; expected?: any }> = [];
function expect(name: string, ok: boolean, got?: any, expected?: any) { results.push({ name, ok, got, expected }); }

// ─── SPEC 1: invalid license JWT → 402 ────────────────────────────────
{
  const db = makeDb();
  const kv = makeKv();
  // Brain returns 401 invalid
  nextBrainResponse = { status: 401, body: { valid: false, reason: 'invalid' } };
  const { status, body } = await callRegister(db, kv, {
    email: 'alice@example.com', password: 'hunter2', name: 'Alice',
    license_jwt: 'eyJfake.eyJbad.sig', domain: 'c.example.com',
  });
  expect('spec1_invalid_license_402', status === 402, status, 402);
  expect('spec1_error', body.error === 'license_required', body.error);
  expect('spec1_mode_invalid', body.mode === 'invalid', body.mode);
}

// ─── SPEC 2: valid license + new email → 201 + cookie ─────────────────
{
  const db = makeDb();
  const kv = makeKv();
  nextBrainResponse = {
    status: 200,
    body: {
      valid: true, status: 'active', license_id: 'lic_golf_self',
      domain: 'c.example.com', tier: 'lifetime', seats: 5,
      features: ['all'], max_campaigns: null,
      expires_at: 4900000000, cache_ttl_sec: 3600,
    },
  };
  const { status, body, cookie } = await callRegister(db, kv, {
    email: 'alice@example.com', password: 'hunter2', name: 'Alice',
    license_jwt: 'eyJvalid.eyJpayload.sig', domain: 'c.example.com', accept_terms: true,
  });
  expect('spec2_valid_201', status === 201, status, 201);
  expect('spec2_user_email', body.user?.email === 'alice@example.com', body.user?.email);
  expect('spec2_user_role_admin', body.user?.role === 'admin', body.user?.role);
  expect('spec2_first_admin_flag', body.first_admin === true, body.first_admin);
  expect('spec2_cookie_set', cookie !== null && cookie.includes('adbot_session'), cookie?.slice(0, 40));
  // License persisted to KV → a second register should NOT require license_jwt
  const stored = await kv.get('license:self');
  expect('spec2_license_persisted_to_kv', stored !== null, stored);
}

// ─── SPEC 3: subsequent register inherits license (no license_jwt needed) ──
{
  const db = makeDb();
  const kv = makeKv();
  // Pre-populate license in KV as if first admin already registered
  await kv.put('license:self', JSON.stringify({
    jwt: 'eyJalready.eyJstored.sig',
    domain: 'c.example.com',
    brain_url: 'https://brain.example.com',
    accepted_at: 1700000000,
  }));
  // Brain returns active (license still valid after first admin's register)
  nextBrainResponse = {
    status: 200,
    body: {
      valid: true, status: 'active', license_id: 'lic_golf_self',
      domain: 'c.example.com', tier: 'lifetime', seats: 5,
      features: ['all'], max_campaigns: null,
      expires_at: 4900000000, cache_ttl_sec: 3600,
    },
  };
  // Subsequent register — NO license_jwt in body
  const { status, body, cookie } = await callRegister(db, kv, {
    email: 'bob@example.com', password: 'hunter2', name: 'Bob',
  });
  expect('spec3_inherit_201', status === 201, status, 201);
  expect('spec3_user_admin', body.user?.role === 'admin', body.user?.role);
  expect('spec3_first_admin_false', body.first_admin === false, body.first_admin);
  expect('spec3_cookie_set', cookie !== null, cookie);
}

// ─── Extra: missing license_jwt on first register → 402 ───────────────
{
  const db = makeDb();
  const kv = makeKv();
  const { status, body } = await callRegister(db, kv, {
    email: 'carol@example.com', password: 'hunter2', name: 'Carol',
    // no license_jwt
  });
  expect('missing_license_402', status === 402, status, 402);
  expect('missing_license_mode', body.mode === 'first_register_needs_license', body.mode);
}

// ─── Extra: license_jwt present but domain missing → 402 ──────────────
{
  const db = makeDb();
  const kv = makeKv();
  const { status, body } = await callRegister(db, kv, {
    email: 'dan@example.com', password: 'hunter2', name: 'Dan',
    license_jwt: 'eyJfake.eyJpayload.sig',
    // no domain, and no ADBOT_DOMAIN env
  });
  expect('missing_domain_402', status === 402, status, 402);
  expect('missing_domain_mode', body.mode === 'missing_domain', body.mode);
}

// ─── Extra: brain unreachable → 402 hard_block ────────────────────────
{
  const db = makeDb();
  const kv = makeKv();
  nextBrainResponse = { throw: new Error('fetch failed: ECONNREFUSED') } as any;
  const { status, body } = await callRegister(db, kv, {
    email: 'erin@example.com', password: 'hunter2', name: 'Erin',
    license_jwt: 'eyJfake.eyJpayload.sig', domain: 'c.example.com',
  });
  expect('brain_down_402', status === 402, status, 402);
  expect('brain_down_mode', body.mode === 'hard_block', body.mode);
}

// ─── Extra: duplicate email → 409 (pre-license logic unchanged) ───────
{
  const db = makeDb();
  const kv = makeKv();
  nextBrainResponse = {
    status: 200,
    body: {
      valid: true, status: 'active', license_id: 'lic_test',
      domain: 'c.example.com', tier: 'lifetime', seats: 5,
      features: ['all'], max_campaigns: null,
      expires_at: 4900000000, cache_ttl_sec: 3600,
    },
  };
  // First register (valid license, creates user)
  await callRegister(db, kv, {
    email: 'frank@example.com', password: 'hunter2', name: 'Frank',
    license_jwt: 'eyJvalid.eyJpayload.sig', domain: 'c.example.com', accept_terms: true,
  });
  // Second register with SAME email (license already stored, skips license flow)
  const { status, body } = await callRegister(db, kv, {
    email: 'frank@example.com', password: 'differentpw', name: 'Frank2',
  });
  expect('duplicate_email_409', status === 409, status, 409);
  expect('duplicate_email_msg', body.error?.includes('already registered'), body.error);
}

// ─── Extra: degrade phase → 402 (no new admin creation during soft-cutoff) ──
{
  const db = makeDb();
  const kv = makeKv();
  // Simulate existing license + brain reporting degrade (revoked, past grace, within 21d)
  await kv.put('license:self', JSON.stringify({
    jwt: 'eyJexisting.eyJsoftcut.sig',
    domain: 'c.example.com',
    brain_url: 'https://brain.example.com',
  }));
  nextBrainResponse = {
    status: 200,
    body: {
      valid: false, reason: 'revoked', mode: 'read_only',
      days_remaining_hard: 14, revoked_reason: 'chargeback',
    },
  };
  const { status, body } = await callRegister(db, kv, {
    email: 'grace@example.com', password: 'hunter2', name: 'Grace',
  });
  expect('degrade_blocks_new_admin_402', status === 402, status, 402);
  expect('degrade_mode_correct', body.mode === 'degrade', body.mode);
  expect('degrade_reason_passthrough', body.revoked_reason === 'chargeback', body.revoked_reason);
}

// ─── Extra: accept_terms missing on first-admin → 400 ─────────────────
// FE checkbox gates submit; backend enforces so the DPA §7 audit trail
// is never incomplete. FE commit 2039680 POSTs accept_terms:true; this
// assertion catches regressions that would ship an un-checkable UI.
{
  const db = makeDb();
  const kv = makeKv();
  nextBrainResponse = {
    status: 200,
    body: {
      valid: true, status: 'active', license_id: 'lic_test',
      domain: 'c.example.com', tier: 'lifetime', seats: 5,
      features: ['all'], max_campaigns: null,
      expires_at: 4900000000, cache_ttl_sec: 3600,
    },
  };
  const { status, body } = await callRegister(db, kv, {
    email: 'harry@example.com', password: 'hunter2', name: 'Harry',
    license_jwt: 'eyJvalid.eyJpayload.sig', domain: 'c.example.com',
    // accept_terms missing — backend must 400
  });
  expect('no_accept_terms_400', status === 400, status, 400);
  expect('no_accept_terms_error', body.error === 'terms_not_accepted', body.error);
  expect('no_accept_terms_detail_mentions_checkbox', typeof body.detail === 'string' && body.detail.includes('checkbox'), body.detail?.slice(0, 40));
}

// ─── Extra: accept_terms=false explicit → 400 ─────────────────────────
{
  const db = makeDb();
  const kv = makeKv();
  nextBrainResponse = {
    status: 200,
    body: {
      valid: true, status: 'active', license_id: 'lic_test',
      domain: 'c.example.com', tier: 'lifetime', seats: 5,
      features: ['all'], max_campaigns: null,
      expires_at: 4900000000, cache_ttl_sec: 3600,
    },
  };
  const { status, body } = await callRegister(db, kv, {
    email: 'ivy@example.com', password: 'hunter2', name: 'Ivy',
    license_jwt: 'eyJvalid.eyJpayload.sig', domain: 'c.example.com', accept_terms: false,
  });
  expect('accept_false_400', status === 400, status, 400);
  expect('accept_false_error', body.error === 'terms_not_accepted', body.error);
}

// ─── Extra: successful register stamps TOS+DPA versions ───────────────
{
  const db = makeDb();
  const kv = makeKv();
  nextBrainResponse = {
    status: 200,
    body: {
      valid: true, status: 'active', license_id: 'lic_test',
      domain: 'c.example.com', tier: 'lifetime', seats: 5,
      features: ['all'], max_campaigns: null,
      expires_at: 4900000000, cache_ttl_sec: 3600,
    },
  };
  await callRegister(db, kv, {
    email: 'jay@example.com', password: 'hunter2', name: 'Jay',
    license_jwt: 'eyJvalid.eyJpayload.sig', domain: 'c.example.com', accept_terms: true,
  });
  const stored = JSON.parse((await kv.get('license:self')) ?? '{}');
  expect('versions_tos_stamped', stored.accepted_tos_version === '1.1', stored.accepted_tos_version);
  expect('versions_dpa_stamped', stored.accepted_dpa_version === '1.1', stored.accepted_dpa_version);
  expect('versions_accepted_at_stamped', typeof stored.accepted_at === 'number' && stored.accepted_at > 0, stored.accepted_at);
}

// ─── Extra: malformed JSON body → 400 ─────────────────────────────────
{
  const db = makeDb();
  const kv = makeKv();
  const req = new Request('https://app/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{not-json',
  });
  const ctx = {
    request: req,
    env: { DB: db, STATE_KV: kv, JWT_SECRET: 'x'.repeat(40) },
    next: async () => new Response(),
  } as any;
  const res = await onRequestPost(ctx);
  expect('bad_json_400', res.status === 400, res.status, 400);
}

// ---- teardown ----

(globalThis as any).fetch = originalFetch;

let fail = 0;
for (const r of results) {
  if (!r.ok) { console.error(`FAIL ${r.name}: got=${JSON.stringify(r.got)} expected=${JSON.stringify(r.expected)}`); fail++; }
}
if (fail > 0) { console.error(`\n${fail}/${results.length} assertion(s) failed`); process.exit(1); }
console.log(`✓ all ${results.length} register-license-gate assertions passed`);
