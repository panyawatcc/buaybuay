import { getSessionUser, type Role } from '../../_lib/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

/**
 * GET /api/auth/me
 * Returns current user (from HttpOnly session cookie).
 * Returns fb_connected boolean — never exposes fb_token to client.
 * FB token is used server-side only (FB API proxy endpoints).
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const session = await getSessionUser(context.request, context.env.JWT_SECRET);

  if (!session) {
    return Response.json({ user: null }, { status: 200 });
  }

  try {
    const row = (await context.env.DB.prepare(
      'SELECT id, email, name, role, (fb_token IS NOT NULL) as fb_connected, fb_token_expires_at FROM users WHERE id = ?',
    )
      .bind(session.sub)
      .first()) as {
      id: string;
      email: string;
      name: string;
      role: Role;
      fb_connected: number;
      fb_token_expires_at: number | null;
    } | null;

    if (!row) {
      return Response.json(
        { user: null, error: 'User no longer exists' },
        {
          status: 200,
          headers: { 'Set-Cookie': 'adbot_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0' },
        },
      );
    }

    return Response.json({
      user: {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        fb_connected: !!row.fb_connected,
        fb_token_expires_at: row.fb_token_expires_at,
      },
    });
  } catch {
    return Response.json({ user: null, error: 'Failed to load user' }, { status: 500 });
  }
};
