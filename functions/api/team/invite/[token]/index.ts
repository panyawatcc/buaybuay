/**
 * GET /api/team/invite/:token — validate invite (public)
 * Returns only { valid, role } — no email/name leak (GUARD gap B)
 */
export const onRequestGet: PagesFunction<{ DB: D1Database }> = async (context) => {
  const token = (context.params as any).token;

  try {
    const invite = (await context.env.DB.prepare(
      "SELECT role FROM team_invites WHERE token = ? AND expires_at > datetime('now') AND accepted_at IS NULL",
    )
      .bind(token)
      .first()) as any;

    if (!invite) {
      return Response.json({ valid: false });
    }

    return Response.json({ valid: true, role: invite.role });
  } catch {
    return Response.json({ valid: false });
  }
};
