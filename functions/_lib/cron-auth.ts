/**
 * Validate cron auth: X-Cron-Secret + X-Cron-Timestamp (±60s replay protection).
 */
export function validateCronAuth(request: Request, cronSecret: string): boolean {
  const secret = request.headers.get('X-Cron-Secret');

  if (!secret || secret !== cronSecret) return false;

  // Replay protection: timestamp within 60s
  const ts = request.headers.get('X-Cron-Timestamp');

  if (ts) {
    const diff = Math.abs(Date.now() / 1000 - parseInt(ts, 10));
    if (diff > 60) return false;
  }

  return true;
}
