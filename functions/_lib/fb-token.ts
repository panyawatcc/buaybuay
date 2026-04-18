import { getSessionUser, decryptToken } from './auth';

interface FbTokenEnv {
  DB: D1Database;
  JWT_SECRET: string;
  TOKEN_ENCRYPTION_KEY: string;
}

type FbTokenResult =
  | { type: 'ok'; token: string; userId: string }
  | { type: 'error'; response: Response };

/**
 * Extract FB access token from DB using session cookie.
 * Replaces Bearer header pattern — token never leaves server.
 */
export async function getFbToken(request: Request, env: FbTokenEnv): Promise<FbTokenResult> {
  const session = await getSessionUser(request, env.JWT_SECRET);

  if (!session) {
    return {
      type: 'error',
      response: Response.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const row = (await env.DB.prepare('SELECT fb_token FROM users WHERE id = ?')
    .bind(session.sub)
    .first()) as { fb_token: string | null } | null;

  if (!row?.fb_token) {
    return {
      type: 'error',
      response: Response.json({ error: 'Facebook not connected' }, { status: 403 }),
    };
  }

  const decrypted = await decryptToken(row.fb_token, env.TOKEN_ENCRYPTION_KEY);

  if (!decrypted) {
    return {
      type: 'error',
      response: Response.json({ error: 'Failed to decrypt Facebook token' }, { status: 500 }),
    };
  }

  return { type: 'ok', token: decrypted, userId: session.sub };
}
