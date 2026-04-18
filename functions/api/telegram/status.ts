import { requireAuth } from '../../_lib/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

/**
 * GET /api/telegram/status?account_id=act_xxx
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = await requireAuth(context.request, context.env.JWT_SECRET);

  if (auth.type === 'unauthorized') return auth.response;

  const accountId = new URL(context.request.url).searchParams.get('account_id');

  // Prior behavior returned 400 when account_id was missing or lacked the
  // 'act_' prefix — but the UI legitimately calls /telegram/status during
  // initial page load before an account is selected, producing noisy 400s.
  // Treat missing/invalid as "not connected" so the UI can render a clean
  // "connect your account" state without a hard error.
  if (!accountId || !accountId.startsWith('act_')) {
    return Response.json({ connected: false, reason: accountId ? 'invalid_account_id' : 'no_account_id' });
  }

  try {
    const conn = (await context.env.DB.prepare(
      'SELECT bot_username, chat_id, last_message_at FROM telegram_connections WHERE user_id = ? AND account_id = ?',
    )
      .bind(auth.user.sub, accountId)
      .first()) as any;

    if (!conn) {
      return Response.json({ connected: false });
    }

    return Response.json({
      connected: true,
      botUsername: conn.bot_username,
      chatId: conn.chat_id,
      lastMessageAt: conn.last_message_at,
    });
  } catch {
    return Response.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
};
