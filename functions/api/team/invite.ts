import { requireRole, type Role } from '../../_lib/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  RESEND_API_KEY: string;
}

const VALID_ROLES: Role[] = ['admin', 'manager', 'viewer'];
const INVITE_EXPIRY_HOURS = 72;

/**
 * POST /api/team/invite — create invite (admin only)
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  // GUARD #5: admin only
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin'] as Role[]);

  if (auth.type !== 'ok') return auth.response;

  let body: { email?: string; name?: string; role?: string };

  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Valid email is required' }, { status: 400 });
  }

  // GUARD gap D: role whitelist
  const role = (body.role as Role) || 'viewer';

  if (!VALID_ROLES.includes(role)) {
    return Response.json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 });
  }

  try {
    // Check email not already registered
    const existing = await context.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();

    if (existing) {
      return Response.json({ error: 'Email already registered' }, { status: 409 });
    }

    // GUARD #11: crypto.randomUUID (128-bit)
    const id = crypto.randomUUID();
    const token = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

    await context.env.DB.prepare(
      `INSERT INTO team_invites (id, token, email, name, role, invited_by, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, token, email, body.name?.trim() || null, role, auth.user.sub, expiresAt.toISOString(), now.toISOString())
      .run();

    const origin = new URL(context.request.url).origin;
    const inviteLink = `${origin}/invite/${token}`;

    // Send invite email via Resend (best-effort — link is primary)
    let emailSent = false;

    if (context.env.RESEND_API_KEY) {
      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${context.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'AdBot AI <noreply@adbot.ai>',
            to: email,
            subject: 'You\'re invited to AdBot AI',
            html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px"><h2>Welcome to AdBot AI!</h2><p>You've been invited as <strong>${role}</strong>.</p><p><a href="${inviteLink}" style="display:inline-block;padding:12px 24px;background:#4F46E5;color:white;text-decoration:none;border-radius:8px;font-weight:bold">Accept Invite</a></p><p style="color:#666;font-size:13px">This link expires in 72 hours.</p></div>`,
          }),
        });
        emailSent = emailRes.ok;
      } catch {
        // Email is bonus — invite link is primary
      }
    }

    return Response.json({
      inviteId: id,
      inviteLink,
      expiresAt: expiresAt.toISOString(),
      email,
      role,
      emailSent,
    }, { status: 201 });
  } catch {
    return Response.json({ error: 'Failed to create invite' }, { status: 500 });
  }
};

/**
 * GET /api/team/invite — list pending invites (admin only)
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  // GUARD #6: admin only
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin'] as Role[]);

  if (auth.type !== 'ok') return auth.response;

  try {
    const result = await context.env.DB.prepare(
      "SELECT id, email, name, role, expires_at, accepted_at, created_at FROM team_invites WHERE accepted_at IS NULL ORDER BY created_at DESC",
    ).all();

    const invites = (result.results || []).map((r: any) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role,
      expiresAt: r.expires_at,
      isExpired: new Date(r.expires_at) < new Date(),
      createdAt: r.created_at,
    }));

    return Response.json({ invites, total: invites.length });
  } catch {
    return Response.json({ error: 'Failed to fetch invites' }, { status: 500 });
  }
};
