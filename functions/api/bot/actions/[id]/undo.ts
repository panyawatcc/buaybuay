import { requireAuth } from '../../../../_lib/auth';
import { getFbToken } from '../../../../_lib/fb-token';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  TOKEN_ENCRYPTION_KEY: string;
}

/**
 * POST /api/bot/actions/:id/undo
 * Reverts a bot action: restores previous Facebook budget + marks as undone.
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const auth = await requireAuth(context.request, context.env.JWT_SECRET);

  if (auth.type === 'unauthorized') return auth.response;

  const actionId = (context.params as any).id;

  if (!actionId) {
    return Response.json({ error: 'Action ID is required' }, { status: 400 });
  }

  try {
    // Fetch the action — verify ownership
    const action = (await context.env.DB.prepare(
      'SELECT * FROM bot_actions WHERE id = ? AND user_id = ?',
    )
      .bind(actionId, auth.user.sub)
      .first()) as any;

    if (!action) {
      return Response.json({ error: 'Action not found' }, { status: 404 });
    }

    if (action.undone_at) {
      return Response.json({ error: 'Action already undone' }, { status: 409 });
    }

    // Get FB token to call Facebook API
    const fbAuth = await getFbToken(context.request, context.env);

    if (fbAuth.type === 'error') return fbAuth.response;

    // Revert on Facebook — set budget back to previous value
    if (action.action_type === 'budget_increase' || action.action_type === 'budget_decrease') {
      const fbUrl = new URL(`https://graph.facebook.com/v25.0/${action.campaign_id}`);
      fbUrl.searchParams.set('access_token', fbAuth.token);

      const res = await fetch(fbUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daily_budget: Math.round(action.previous_value * 100) }), // FB uses cents
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return Response.json({ error: 'Facebook API revert failed', details: err }, { status: 502 });
      }
    }

    // Mark as undone in DB
    await context.env.DB.prepare(
      "UPDATE bot_actions SET undone_at = datetime('now') WHERE id = ?",
    )
      .bind(actionId)
      .run();

    return Response.json({ success: true, revertedTo: action.previous_value });
  } catch {
    return Response.json({ error: 'Failed to undo action' }, { status: 500 });
  }
};
