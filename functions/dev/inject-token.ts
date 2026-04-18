// GET /dev/inject-token — minimal admin form to POST a System User Token
// to /api/dev/admin-token-set without wrestling with Chrome's DevTools
// Console paste quirks. Served as a Pages Function so no build step.
//
// Added 2026-04-18 for the admin-token-set ergonomics issue during the
// token-type regression incident. No auth on the form itself (anon
// visitors just see the form); actual POST is cookie-protected by
// /api/dev/admin-token-set.

export const onRequestGet: PagesFunction = async () => {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Admin Token Inject</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 720px; margin: 24px auto; padding: 0 16px; color: #1a1a1a; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  p.sub { color: #666; margin-top: 0; font-size: 14px; }
  label { display: block; font-weight: 600; margin-top: 16px; margin-bottom: 6px; font-size: 14px; }
  textarea { width: 100%; padding: 12px; font-family: ui-monospace, 'SF Mono', Consolas, monospace; font-size: 13px; border: 1px solid #d0d0d0; border-radius: 8px; resize: vertical; }
  textarea:focus { outline: 2px solid #2563eb; border-color: #2563eb; }
  #token { min-height: 140px; }
  #scope { min-height: 72px; background: #f5f5f5; }
  button { margin-top: 16px; padding: 12px 20px; font-size: 15px; font-weight: 600; background: #2563eb; color: #fff; border: 0; border-radius: 8px; cursor: pointer; }
  button:disabled { background: #999; cursor: not-allowed; }
  button:hover:not(:disabled) { background: #1d4ed8; }
  #out { margin-top: 20px; padding: 14px; border-radius: 8px; font-family: ui-monospace, monospace; font-size: 13px; white-space: pre-wrap; word-break: break-all; display: none; }
  .out-ok { background: #d1fae5; border: 1px solid #34d399; color: #065f46; }
  .out-err { background: #fee2e2; border: 1px solid #f87171; color: #991b1b; }
  .hint { font-size: 12px; color: #666; margin-top: 4px; }
</style>
</head>
<body>
  <h1>Admin System User Token — Inject</h1>
  <p class="sub">POSTs to <code>/api/dev/admin-token-set</code> with your admin session cookie. Requires <code>DEV_TOKEN_INJECT=1</code>.</p>

  <label for="token">System User Token (paste from Business Manager)</label>
  <textarea id="token" placeholder="EAA..." autofocus></textarea>
  <div class="hint">Paste the full token. Any whitespace/newlines get trimmed server-side.</div>

  <label for="scope">Scope (prefilled — edit only if needed)</label>
  <textarea id="scope">ads_management,ads_read,business_management,pages_read_engagement,pages_show_list,pages_read_user_content</textarea>

  <button id="go">Inject Token</button>

  <div id="out"></div>

<script>
(function () {
  var btn = document.getElementById('go');
  var out = document.getElementById('out');
  btn.addEventListener('click', function () {
    var token = document.getElementById('token').value.trim();
    var scope = document.getElementById('scope').value.trim();
    if (!token || token.length < 20) { showErr('Token is too short (need 20+ chars).'); return; }
    btn.disabled = true; btn.textContent = 'Injecting...';
    out.style.display = 'none';
    fetch('/api/dev/admin-token-set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token: token, scope_granted: scope })
    })
    .then(function (r) { return r.json().then(function (j) { return { status: r.status, body: j }; }); })
    .then(function (res) {
      if (res.status === 200 && res.body && res.body.ok) {
        showOk(res.body);
      } else {
        showErr(JSON.stringify(res, null, 2));
      }
    })
    .catch(function (e) { showErr('Network error: ' + (e && e.message ? e.message : String(e))); })
    .finally(function () { btn.disabled = false; btn.textContent = 'Inject Token'; });
  });
  function showOk(body) {
    out.className = 'out-ok'; out.style.display = 'block';
    out.textContent = '✅ OK\\n' + JSON.stringify(body, null, 2) + '\\n\\nNext: BACKEND purges KV cache + asks you to hard-refresh /settings.';
  }
  function showErr(msg) {
    out.className = 'out-err'; out.style.display = 'block';
    out.textContent = '❌ Error\\n' + msg;
  }
})();
</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
};
