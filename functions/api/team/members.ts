import { requireRole, hashPassword, type Role } from '../../_lib/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const VALID_ROLES: Role[] = ['admin', 'manager', 'viewer'];

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pw = '';
  const bytes = crypto.getRandomValues(new Uint8Array(10));

  for (const b of bytes) pw += chars[b % chars.length];

  return pw;
}

/**
 * GET /api/team/members — list (admin + manager)
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  // GUARD #4: admin+manager
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin', 'manager'] as Role[]);

  if (auth.type !== 'ok') return auth.response;

  try {
    const result = await context.env.DB.prepare(
      'SELECT id, email, name, role, is_active, created_at FROM users ORDER BY created_at ASC',
    ).all();

    const members = (result.results || []).map((r: any) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role,
      isActive: r.is_active == null ? true : !!r.is_active,
      createdAt: r.created_at,
    }));

    return Response.json({ members, total: members.length });
  } catch {
    return Response.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
};

/**
 * POST /api/team/members — add member (admin only)
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  // GUARD #1: admin only
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin'] as Role[]);

  if (auth.type !== 'ok') return auth.response;

  let body: { email?: string; name?: string; role?: string };

  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim();
  const role = body.role as Role;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Valid email is required' }, { status: 400 });
  }

  if (!name) {
    return Response.json({ error: 'name is required' }, { status: 400 });
  }

  // GUARD #7 (gap D): role whitelist
  if (!role || !VALID_ROLES.includes(role)) {
    return Response.json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 });
  }

  try {
    const existing = await context.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();

    if (existing) {
      return Response.json({ error: 'Email already registered' }, { status: 409 });
    }

    // GUARD #10: hash temp password
    const tempPassword = generateTempPassword();
    const { hash, salt } = await hashPassword(tempPassword);
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await context.env.DB.prepare(
      `INSERT INTO users (id, email, name, password_hash, password_salt, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    )
      .bind(id, email, name, hash, salt, role, now, now)
      .run();

    return Response.json({
      id,
      email,
      name,
      role,
      temporaryPassword: tempPassword,
      createdAt: new Date(now * 1000).toISOString(),
    }, { status: 201 });
  } catch {
    return Response.json({ error: 'Failed to add member' }, { status: 500 });
  }
};
