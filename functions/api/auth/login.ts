import { verifyPassword, signJWT, buildSessionCookie, type Role } from '../../_lib/auth';
import { checkRateLimit } from '../../_lib/rate-limit';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  STATE_KV: KVNamespace;
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Sets HttpOnly session cookie on success.
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const rateLimitResp = await checkRateLimit(context.env.STATE_KV, context.request, 'auth', {
    max: 5,
    windowSec: 60,
  });

  if (rateLimitResp) return rateLimitResp;

  let body: { email?: string; password?: string };

  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return Response.json({ error: 'email and password are required' }, { status: 400 });
  }

  try {
    const user = (await context.env.DB.prepare(
      'SELECT id, email, name, password_hash, password_salt, role, is_active FROM users WHERE email = ?',
    )
      .bind(email)
      .first()) as
      | { id: string; email: string; name: string; password_hash: string; password_salt: string; role: Role; is_active: number | null }
      | null;

    if (!user) {
      return Response.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Check if account is deactivated (soft delete)
    if (user.is_active === 0) {
      return Response.json({ error: 'Account has been deactivated' }, { status: 403 });
    }

    const valid = await verifyPassword(password, user.password_hash, user.password_salt);

    if (!valid) {
      return Response.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const jwt = await signJWT({ sub: user.id, email: user.email, role: user.role }, context.env.JWT_SECRET);

    return Response.json(
      { user: { id: user.id, email: user.email, name: user.name, role: user.role } },
      {
        status: 200,
        headers: { 'Set-Cookie': buildSessionCookie(jwt) },
      },
    );
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Login failed' }, { status: 500 });
  }
};
