import { clearSessionCookie } from '../../_lib/auth';

/**
 * POST /api/auth/logout
 * Clears HttpOnly session cookie.
 */
export const onRequestPost: PagesFunction = async () => {
  return Response.json(
    { ok: true },
    {
      status: 200,
      headers: { 'Set-Cookie': clearSessionCookie() },
    },
  );
};
