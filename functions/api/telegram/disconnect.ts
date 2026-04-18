import { requireRole, decryptToken, type Role } from '../../_lib/auth';
import { deleteWebhook } from './_lib/send';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  TOKEN_ENCRYPTION_KEY: string;
}

/**
 * DELETE /api/telegram/disconnect?account_id=act_xxx
 */
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin', 'manager'] as Role[]);

  if (auth.type !== 'ok') return auth.response;

  const accountId = new URL(context.request.url).searchParams.get('account_id');

  if (!accountId?.startsWith('act_')) {
    return Response.json({ error: 'account_id (act_*) is required' }, { status: 400 });
  }

  try {
    const conn = (await context.env.DB.prepare(
      'SELECT bot_token_encrypted FROM telegram_connections WHERE user_id = ? AND account_id = ?',
    )
      .bind(auth.user.sub, accountId)
      .first()) as { bot_token_encrypted: string } | null;

    if (!conn) {
      return Response.json({ error: 'No Telegram connection found' }, { status: 404 });
    }

    // Remove webhook from Telegram
    const botToken = await decryptToken(conn.bot_token_encrypted, context.env.TOKEN_ENCRYPTION_KEY);

    if (botToken) {
      await deleteWebhook(botToken);
    }

    // Delete from DB
    await context.env.DB.prepare(
      'DELETE FROM telegram_connections WHERE user_id = ? AND account_id = ?',
    )
      .bind(auth.user.sub, accountId)
      .run();

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
};
