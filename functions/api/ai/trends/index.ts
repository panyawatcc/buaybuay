import { requireRole, type Role } from '../../../_lib/auth';

interface Env { DB: D1Database; JWT_SECRET: string; }

// GET /api/ai/trends — returns current viral keywords (stubbed Thai trends).
// TODO: scrape X API / TikTok Research API, score, cache in ai_trends_log.
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = await requireRole(context.request, context.env.JWT_SECRET, ['admin', 'manager', 'viewer'] as Role[]);
  if (auth.type !== 'ok') return auth.response;

  const mockKeywords = [
    { keyword: 'เทรนด์หน้าฝน', source: 'x', score: 0.92 },
    { keyword: 'สกินแคร์ผิวแพ้ง่าย', source: 'tiktok', score: 0.88 },
    { keyword: 'ลดราคา11.11', source: 'x', score: 0.85 },
    { keyword: 'อาหารคลีนส่งเช้า', source: 'tiktok', score: 0.80 },
    { keyword: 'สูตรกาแฟใหม่', source: 'x', score: 0.72 },
  ];

  return Response.json({
    stub: true,
    viral_keywords: mockKeywords,
    fetched_at: new Date().toISOString(),
    todo: 'wire X API + TikTok scraping; persist via ai_trends_log',
  });
};
