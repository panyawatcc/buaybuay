/**
 * Web Push notification sender using Web Crypto (no external deps).
 * Compatible with Cloudflare Workers.
 */

const enc = new TextEncoder();

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

/**
 * Send push notification to a subscription.
 * Uses VAPID authentication with Web Crypto.
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    // For CF Workers, use the push endpoint directly with VAPID JWT
    const jwt = await createVapidJWT(subscription.endpoint, vapidPublicKey, vapidPrivateKey, vapidSubject);

    const res = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt},k=${vapidPublicKey}`,
        'Content-Type': 'application/json',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 201 || res.status === 200) {
      return { ok: true, status: res.status };
    }

    // 410 Gone = subscription expired
    if (res.status === 410) {
      return { ok: false, status: 410, error: 'Subscription expired' };
    }

    return { ok: false, status: res.status, error: `Push failed: ${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Push send failed' };
  }
}

async function createVapidJWT(
  endpoint: string,
  publicKey: string,
  privateKey: string,
  subject: string,
): Promise<string> {
  const audience = new URL(endpoint).origin;
  const expiry = Math.floor(Date.now() / 1000) + 12 * 3600;

  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const payload = btoa(JSON.stringify({ aud: audience, exp: expiry, sub: subject }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const data = `${header}.${payload}`;

  // Import VAPID private key for signing
  const keyData = base64urlToUint8Array(privateKey);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    enc.encode(data),
  );

  const sig = uint8ArrayToBase64url(new Uint8Array(signature));

  return `${data}.${sig}`;
}

function base64urlToUint8Array(base64url: string): Uint8Array {
  let s = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64url(arr: Uint8Array): string {
  let s = '';
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Send push to all subscriptions for a user (if push_alerts enabled).
 */
export async function sendPushToUser(
  db: D1Database,
  userId: string,
  payload: PushPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string,
): Promise<{ sent: number; failed: number }> {
  // Check if push_alerts enabled
  const settings = (await db.prepare(
    'SELECT push_alerts FROM notification_settings WHERE user_id = ?',
  ).bind(userId).first()) as any;

  if (settings && !settings.push_alerts) {
    return { sent: 0, failed: 0 };
  }

  const subs = (await db.prepare(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?',
  ).bind(userId).all()).results || [];

  let sent = 0, failed = 0;

  for (const sub of subs as any[]) {
    const result = await sendPushNotification(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      payload,
      vapidPublicKey, vapidPrivateKey, vapidSubject,
    );

    if (result.ok) sent++;
    else {
      failed++;
      // Remove expired subscriptions
      if (result.status === 410) {
        await db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?')
          .bind(userId, sub.endpoint).run();
      }
    }
  }

  return { sent, failed };
}
