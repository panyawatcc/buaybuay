import { sendTelegramMessage } from './_lib/send';
import { getFbContext, assertAdAccountAllowed, type FbContext } from '../../_lib/fb-context';

interface Env {
  DB: D1Database;
  TOKEN_ENCRYPTION_KEY: string;
  CRON_SECRET: string;
}

/**
 * POST /api/telegram/daily-summary
 * Cron: daily 09:00 Bangkok (02:00 UTC). Auth: X-Cron-Secret.
 * Compiles yesterday's stats per account → sends Telegram message.
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  // GUARD #4: cron auth + #2: timestamp replay protection
  const cronSecret = context.request.headers.get('X-Cron-Secret');

  if (!context.env.CRON_SECRET || cronSecret !== context.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ts = context.request.headers.get('X-Cron-Timestamp');
  if (ts && Math.abs(Date.now() / 1000 - parseInt(ts, 10)) > 60) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find all telegram connections with chatId + daily summary enabled
    const connections = (await context.env.DB.prepare(
      `SELECT tc.user_id, tc.account_id, tc.bot_token_encrypted, tc.chat_id
       FROM telegram_connections tc
       LEFT JOIN notification_settings ns ON tc.user_id = ns.user_id
       WHERE tc.chat_id IS NOT NULL AND tc.chat_id != ''
         AND (ns.telegram_daily_summary IS NULL OR ns.telegram_daily_summary = 1)`,
    )
      .all()).results || [];

    let sent = 0;
    let failed = 0;

    // Per-user fb-context cache — one telegram connection per (user, account)
    // but some users have many accounts → amortize getFbContext lookup.
    const fbCtxCache: Map<string, FbContext | null> = new Map();

    for (const conn of connections as any[]) {
      try {
        let ctx: FbContext | null | undefined = fbCtxCache.get(conn.user_id);
        if (ctx === undefined) {
          try {
            ctx = await getFbContext(context.env, conn.user_id);
          } catch {
            ctx = null;
          }
          fbCtxCache.set(conn.user_id, ctx);
        }
        if (!ctx) continue;

        if (!assertAdAccountAllowed(ctx, conn.account_id)) continue;

        const fbToken = ctx.admin_token;

        // Fetch yesterday's insights
        const insUrl = `https://graph.facebook.com/v25.0/${conn.account_id}/insights?access_token=${fbToken}&fields=spend,impressions,clicks,actions,action_values&date_preset=yesterday&level=account&limit=1`;
        const insRes = await fetch(insUrl);
        const insData = (await insRes.json()) as { data?: any[] };
        const ins = insData.data?.[0];

        const spend = parseFloat(ins?.spend || '0');
        const impressions = parseFloat(ins?.impressions || '0');
        const clicks = parseFloat(ins?.clicks || '0');
        const pa = ins?.actions?.find((a: any) => a.action_type === 'purchase');
        const conversions = pa ? parseFloat(pa.value) : 0;
        const pv = ins?.action_values?.find((a: any) => a.action_type === 'purchase');
        const revenue = pv ? parseFloat(pv.value) : 0;
        const roas = spend > 0 ? (revenue / spend).toFixed(1) : '0';

        // Get bot actions from yesterday
        const actionsResult = await context.env.DB.prepare(
          `SELECT rule_name, campaign_id, action_type, previous_value, new_value
           FROM bot_actions
           WHERE user_id = ? AND account_id = ? AND date(executed_at) = date('now', '-1 day')
           ORDER BY executed_at DESC LIMIT 5`,
        )
          .bind(conn.user_id, conn.account_id)
          .all();

        const botActions = actionsResult.results || [];

        // Format date
        const yesterday = new Date(Date.now() - 86400000);
        const dateStr = yesterday.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

        // Build message
        let message = `📊 <b>Daily Summary — ${dateStr}</b>\n\n`;
        message += `💰 Spend: ฿${spend.toLocaleString()}\n`;
        message += `👁 Impressions: ${impressions.toLocaleString()}\n`;
        message += `👆 Clicks: ${clicks.toLocaleString()}\n`;
        message += `🎯 Conversions: ${conversions.toLocaleString()}\n`;
        message += `💵 Revenue: ฿${revenue.toLocaleString()}\n`;
        message += `📈 ROAS: ${roas}x\n`;

        if (botActions.length > 0) {
          message += `\n🤖 <b>Bot Actions (${botActions.length})</b>\n`;

          for (const ba of botActions as any[]) {
            message += `  • ${ba.rule_name || ba.action_type}: ฿${ba.previous_value}→฿${ba.new_value}\n`;
          }
        }

        const result = await sendTelegramMessage(conn.bot_token_encrypted, conn.chat_id, message, context.env.TOKEN_ENCRYPTION_KEY);

        if (result.ok) {
          sent++;
          await context.env.DB.prepare("UPDATE telegram_connections SET last_message_at = datetime('now') WHERE user_id = ? AND account_id = ?")
            .bind(conn.user_id, conn.account_id)
            .run();
        } else {
          failed++;
        }
      } catch {
        // Error isolation per account — continue to next
        failed++;
      }
    }

    return Response.json({ sent, failed, total: connections.length });
  } catch {
    return Response.json({ error: 'Daily summary failed' }, { status: 500 });
  }
};
