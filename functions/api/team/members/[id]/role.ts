import { requireRole, type Role } from '../../../../_lib/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const VALID_ROLES: Role[] = ['admin', 'manager', 'viewer'];

/**
 * PUT /api/team/members/:id/role — change role (admin only)
 */
export const onRequestPut: PagesFunction<Env> = async (context) => {
  // GUARD #3: admin only
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin'] as Role[]);

  if (auth.type !== 'ok') return auth.response;

  const targetId = (context.params as any).id;

  // GUARD #8: self-role-change prevention
  if (targetId === auth.user.sub) {
    return Response.json({ error: 'Cannot change your own role' }, { status: 400 });
  }

  let body: { role?: string };

  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // GUARD #7: role whitelist
  if (!body.role || !VALID_ROLES.includes(body.role as Role)) {
    return Response.json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 });
  }

  try {
    const target = (await context.env.DB.prepare('SELECT id, email, role FROM users WHERE id = ?')
      .bind(targetId)
      .first()) as any;

    if (!target) {
      return Response.json({ error: 'Member not found' }, { status: 404 });
    }

    // GUARD #9: last admin protection (if changing FROM admin)
    if (target.role === 'admin' && body.role !== 'admin') {
      const count = (await context.env.DB.prepare(
        "SELECT COUNT(*) as c FROM users WHERE role = 'admin' AND (is_active = 1 OR is_active IS NULL)",
      ).first()) as any;

      if (count.c <= 1) {
        return Response.json({ error: 'Cannot demote the last admin' }, { status: 400 });
      }
    }

    await context.env.DB.prepare('UPDATE users SET role = ? WHERE id = ?')
      .bind(body.role, targetId)
      .run();

    return Response.json({
      id: target.id,
      email: target.email,
      role: body.role,
      previousRole: target.role,
    });
  } catch {
    return Response.json({ error: 'Failed to change role' }, { status: 500 });
  }
};
