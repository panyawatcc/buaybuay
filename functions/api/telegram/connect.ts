import { requireRole, encryptToken, type Role } from '../../_lib/auth';
import { validateBotToken, setWebhook } from './_lib/send';

const BOT_TOKEN_RE = /^\d+:[A-Za-z0-9_-]{35,}$/;

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  TOKEN_ENCRYPTION_KEY: string;
  TELEGRAM_WEBHOOK_SECRET: string;
}

/**
 * POST /api/telegram/connect
 * Body: { botToken: "123456:ABC-DEF...", accountId: "act_xxx" }
 * Validates token, sets webhook, encrypts+stores in D1.
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin', 'manager'] as Role[]);

  if (auth.type !== 'ok') return auth.response;

  let body: { botToken?: string; accountId?: string };

  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.botToken || typeof body.botToken !== 'string' || !BOT_TOKEN_RE.test(body.botToken)) {
    return Response.json({ error: 'botToken is required (format: 123456:ABC...)' }, { status: 400 });
  }

  if (!body.accountId?.startsWith('act_')) {
    return Response.json({ error: 'accountId (act_*) is required' }, { status: 400 });
  }

  try {
    // Validate bot token via Telegram API
    const validation = await validateBotToken(body.botToken);

    if (!validation.ok) {
      return Response.json({ error: validation.error || 'Invalid bot token' }, { status: 400 });
    }

    // Set webhook
    const origin = new URL(context.request.url).origin;
    const webhookUrl = `${origin}/api/telegram/webhook`;
    const webhookSet = await setWebhook(body.botToken, webhookUrl, context.env.TELEGRAM_WEBHOOK_SECRET);

    // Encrypt bot token for storage
    const encrypted = await encryptToken(body.botToken, context.env.TOKEN_ENCRYPTION_KEY);

    // Upsert connection
    const id = crypto.randomUUID();

    await context.env.DB.prepare(
      `INSERT INTO telegram_connections (id, user_id, account_id, bot_token_encrypted, bot_username, connected_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(account_id) DO UPDATE SET
         bot_token_encrypted = excluded.bot_token_encrypted,
         bot_username = excluded.bot_username,
         connected_at = datetime('now')`,
    )
      .bind(id, auth.user.sub, body.accountId, encrypted, validation.bot?.username || null)
      .run();

    // Never return bot token in response
    return Response.json({
      success: true,
      bot: {
        id: validation.bot?.id,
        username: validation.bot?.username,
        firstName: validation.bot?.first_name,
      },
      webhookSet,
    });
  } catch {
    return Response.json({ error: 'Failed to connect Telegram bot' }, { status: 500 });
  }
};
