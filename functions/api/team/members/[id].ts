import { requireRole, type Role } from '../../../_lib/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

/**
 * DELETE /api/team/members/:id — soft delete (admin only)
 */
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  // GUARD #2: admin only
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin'] as Role[]);

  if (auth.type !== 'ok') return auth.response;

  const targetId = (context.params as any).id;

  // Can't delete yourself
  if (targetId === auth.user.sub) {
    return Response.json({ error: 'Cannot remove yourself' }, { status: 400 });
  }

  try {
    // GUARD #9: last admin protection
    const target = (await context.env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(targetId).first()) as any;

    if (!target) {
      return Response.json({ error: 'Member not found' }, { status: 404 });
    }

    if (target.role === 'admin') {
      const count = (await context.env.DB.prepare(
        "SELECT COUNT(*) as c FROM users WHERE role = 'admin' AND (is_active = 1 OR is_active IS NULL)",
      ).first()) as any;

      if (count.c <= 1) {
        return Response.json({ error: 'Cannot remove the last admin' }, { status: 400 });
      }
    }

    // GUARD #15: soft delete
    await context.env.DB.prepare('UPDATE users SET is_active = 0 WHERE id = ?').bind(targetId).run();

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: 'Failed to remove member' }, { status: 500 });
  }
};
