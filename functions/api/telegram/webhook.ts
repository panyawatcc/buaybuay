interface Env {
  DB: D1Database;
  TELEGRAM_WEBHOOK_SECRET: string;
}

/**
 * POST /api/telegram/webhook
 * Receives Telegram updates. Validates secret_token header.
 * Parses /start command → stores chatId → replies confirmation.
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  // GUARD condition #3: validate Telegram webhook origin via secret_token
  const secretHeader = context.request.headers.get('X-Telegram-Bot-Api-Secret-Token');

  if (!context.env.TELEGRAM_WEBHOOK_SECRET || secretHeader !== context.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response('Forbidden', { status: 403 });
  }

  let update: any;

  try {
    update = await context.request.json();
  } catch {
    return new Response('OK', { status: 200 }); // Telegram expects 200 even on parse error
  }

  const message = update?.message;

  if (!message?.text || !message?.chat?.id) {
    return new Response('OK', { status: 200 });
  }

  const chatId = String(message.chat.id);
  const text = message.text.trim();

  // GUARD condition #10: validate chatId is numeric
  if (!/^\d+$/.test(chatId)) {
    return new Response('OK', { status: 200 });
  }

  if (text === '/start') {
    try {
      // Find connection that has this bot — match by checking all connections
      // (webhook is shared across all connections since it's the same URL)
      // Update the first connection without a chatId, or the most recent one
      const conn = (await context.env.DB.prepare(
        "SELECT id, bot_token_encrypted, account_id FROM telegram_connections WHERE chat_id IS NULL OR chat_id = '' ORDER BY connected_at DESC LIMIT 1",
      )
        .first()) as any;

      if (conn) {
        await context.env.DB.prepare(
          "UPDATE telegram_connections SET chat_id = ?, last_message_at = datetime('now') WHERE id = ?",
        )
          .bind(chatId, conn.id)
          .run();
      }

      // Reply confirmation — need bot token to reply
      // Since webhook is called by Telegram, we can use the method response
      return Response.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: '✅ Connected! You\'ll receive AdBot notifications here.\n\nUse /status to check connection.',
        parse_mode: 'HTML',
      });
    } catch {
      return new Response('OK', { status: 200 });
    }
  }

  if (text === '/status') {
    return Response.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: '🤖 AdBot is connected and active.\nYou\'ll receive alerts when rules trigger and daily summaries.',
    });
  }

  return new Response('OK', { status: 200 });
};
