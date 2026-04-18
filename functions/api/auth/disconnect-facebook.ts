import { requireRole, type Role } from '../../_lib/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

/**
 * POST /api/auth/fb/disconnect
 * Clears the authenticated user's Facebook connection:
 *   - users.fb_token = NULL
 *   - users.fb_token_expires_at = NULL
 *   - DELETE FROM page_tokens WHERE user_id = ?
 *
 * Session cookie is NOT cleared — user stays logged in to the app. Prior
 * FE (Settings.tsx#handleDisconnect) only called logout() + setFbConnected(false)
 * so DB was never cleared; /api/auth/me re-flipped fb_connected=true on refresh.
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin', 'manager', 'viewer'] as Role[]);
  if (auth.type !== 'ok') return auth.response;

  const userId = auth.user.sub;

  try {
    const before = (await context.env.DB.prepare(
      'SELECT (fb_token IS NOT NULL) AS had_token FROM users WHERE id = ?',
    ).bind(userId).first()) as { had_token: number } | null;

    const userUpdate = await context.env.DB.prepare(
      "UPDATE users SET fb_token = NULL, fb_token_expires_at = NULL, updated_at = ? WHERE id = ?",
    ).bind(Math.floor(Date.now() / 1000), userId).run();

    const pagesDelete = await context.env.DB.prepare(
      'DELETE FROM page_tokens WHERE user_id = ?',
    ).bind(userId).run();

    const pagesDeletedCount = pagesDelete.meta?.changes ?? 0;
    console.log(
      `[disconnect-fb] user=${userId} had_token=${before?.had_token ?? 0} user_updated=${userUpdate.meta?.changes ?? 0} pages_deleted=${pagesDeletedCount}`,
    );

    return Response.json({
      ok: true,
      cleared: {
        user_token: !!(before?.had_token),
        page_tokens_count: pagesDeletedCount,
      },
    });
  } catch (e) {
    console.log(`[disconnect-fb] user=${userId} error=${e instanceof Error ? e.message : String(e)}`);
    return Response.json({ error: 'disconnect_failed' }, { status: 500 });
  }
};
