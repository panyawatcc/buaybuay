interface Env {
  ADBOT_URL: string;
  CRON_SECRET: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const headers = {
      'X-Cron-Secret': env.CRON_SECRET,
      'X-Cron-Timestamp': String(Math.floor(Date.now() / 1000)),
      'Content-Type': 'application/json',
    };

    const results: Record<string, string> = {};

    // A1: Rules evaluate — every hour
    if (event.cron === '0 * * * *') {
      try {
        const res = await fetch(`${env.ADBOT_URL}/api/rules/evaluate`, {
          method: 'POST',
          headers,
        });
        results.evaluate = `${res.status} ${res.statusText}`;
      } catch (err) {
        results.evaluate = `error: ${err}`;
      }
    }

    // A3: Telegram daily summary — 09:00 Bangkok
    if (event.cron === '0 2 * * *') {
      try {
        const res = await fetch(`${env.ADBOT_URL}/api/telegram/daily-summary`, {
          method: 'POST',
          headers,
        });
        results.dailySummary = `${res.status} ${res.statusText}`;
      } catch (err) {
        results.dailySummary = `error: ${err}`;
      }
    }

    // A5: Token refresh — Monday 10:00 Bangkok
    if (event.cron === '0 3 * * 1') {
      try {
        const res = await fetch(`${env.ADBOT_URL}/api/auth/refresh-token`, {
          method: 'POST',
          headers,
        });
        results.tokenRefresh = `${res.status} ${res.statusText}`;
      } catch (err) {
        results.tokenRefresh = `error: ${err}`;
      }
    }

    console.log(`Cron ${event.cron} executed:`, JSON.stringify(results));
  },
};
