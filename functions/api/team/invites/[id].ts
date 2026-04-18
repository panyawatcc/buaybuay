import { requireRole, type Role } from '../../../_lib/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

/**
 * DELETE /api/team/invites/:id — cancel invite (admin only)
 */
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  // GUARD #6: admin only
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin'] as Role[]);

  if (auth.type !== 'ok') return auth.response;

  const inviteId = (context.params as any).id;

  try {
    const result = await context.env.DB.prepare(
      'DELETE FROM team_invites WHERE id = ? AND accepted_at IS NULL',
    )
      .bind(inviteId)
      .run();

    if (!result.meta.changes) {
      return Response.json({ error: 'Invite not found or already accepted' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: 'Failed to cancel invite' }, { status: 500 });
  }
};
