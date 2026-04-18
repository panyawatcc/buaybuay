import { hashPassword, signJWT, buildSessionCookie, type Role } from '../../../../_lib/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const MAX_ACCEPT_ATTEMPTS = 5;

/**
 * POST /api/team/invite/:token/accept — accept invite (public)
 * Rate limited: max 5 attempts per token (GUARD gap A)
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const token = (context.params as any).token;

  let body: { password?: string };

  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.password || typeof body.password !== 'string' || body.password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  try {
    const invite = (await context.env.DB.prepare(
      "SELECT id, email, name, role, attempt_count FROM team_invites WHERE token = ? AND expires_at > datetime('now') AND accepted_at IS NULL",
    )
      .bind(token)
      .first()) as any;

    if (!invite) {
      return Response.json({ error: 'Invalid or expired invite' }, { status: 400 });
    }

    if (invite.attempt_count >= MAX_ACCEPT_ATTEMPTS) {
      return Response.json({ error: 'Too many attempts. Invite locked.' }, { status: 429 });
    }

    await context.env.DB.prepare('UPDATE team_invites SET attempt_count = attempt_count + 1 WHERE id = ?')
      .bind(invite.id)
      .run();

    const existing = await context.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(invite.email).first();

    if (existing) {
      return Response.json({ error: 'Email already registered' }, { status: 409 });
    }

    const { hash, salt } = await hashPassword(body.password);
    const userId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const userName = invite.name || invite.email.split('@')[0];

    await context.env.DB.prepare(
      `INSERT INTO users (id, email, name, password_hash, password_salt, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    )
      .bind(userId, invite.email, userName, hash, salt, invite.role, now, now)
      .run();

    await context.env.DB.prepare("UPDATE team_invites SET accepted_at = datetime('now') WHERE id = ?")
      .bind(invite.id)
      .run();

    const jwt = await signJWT({ sub: userId, email: invite.email, role: invite.role as Role }, context.env.JWT_SECRET);

    return Response.json(
      { success: true, user: { id: userId, email: invite.email, name: userName, role: invite.role } },
      { status: 201, headers: { 'Set-Cookie': buildSessionCookie(jwt) } },
    );
  } catch (err) {
    return Response.json({ error: 'Failed to accept invite' }, { status: 500 });
  }
};
