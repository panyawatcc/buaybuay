import { decryptToken } from '../../../_lib/auth';

const TELEGRAM_API = 'https://api.telegram.org';

/**
 * Send a Telegram message using encrypted bot token from DB.
 */
export async function sendTelegramMessage(
  encryptedToken: string,
  chatId: string,
  text: string,
  encryptionKey: string,
): Promise<{ ok: boolean; error?: string }> {
  const botToken = await decryptToken(encryptedToken, encryptionKey);

  if (!botToken) {
    return { ok: false, error: 'Failed to decrypt bot token' };
  }

  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { ok: false, error: (err as any)?.description || `HTTP ${res.status}` };
  }

  return { ok: true };
}

/**
 * Validate bot token via Telegram getMe API.
 */
export async function validateBotToken(botToken: string): Promise<{ ok: boolean; bot?: any; error?: string }> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/getMe`);
  const data = (await res.json()) as { ok: boolean; result?: any; description?: string };

  if (!data.ok) {
    return { ok: false, error: data.description || 'Invalid bot token' };
  }

  return { ok: true, bot: data.result };
}

/**
 * Set webhook for Telegram bot.
 */
export async function setWebhook(botToken: string, webhookUrl: string, secretToken?: string): Promise<boolean> {
  const body: any = { url: webhookUrl };

  if (secretToken) body.secret_token = secretToken;

  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { ok: boolean };

  return data.ok;
}

/**
 * Remove webhook for Telegram bot.
 */
export async function deleteWebhook(botToken: string): Promise<boolean> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/deleteWebhook`);
  const data = (await res.json()) as { ok: boolean };

  return data.ok;
}
