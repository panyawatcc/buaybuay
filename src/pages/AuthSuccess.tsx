import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConnection } from '../components/ConnectionContext';

export default function AuthSuccess() {
  const navigate = useNavigate();
  const { setFbConnected } = useConnection();

  useEffect(() => {
    // Token is delivered via URL fragment (#token=...&expires_at=...)
    // NOT query string — fragment isn't sent to server logs or Referer
    const hash = window.location.hash.slice(1); // strip leading '#'
    const params = new URLSearchParams(hash);
    const token = params.get('token');
    const expiresAt = params.get('expires_at');

    if (token) {
      // Save token to DB server-side (no localStorage — token stays server-side only)
      const connectBody = JSON.stringify({
        token,
        expires_at: expiresAt ? Number(expiresAt) : undefined,
      });
      const connectOpts: RequestInit = {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: connectBody,
      };
      fetch('/api/auth/connect-facebook', connectOpts)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          setFbConnected(true);
        })
        .catch((err) => {
          console.error('connect-facebook failed, retrying:', err);
          fetch('/api/auth/connect-facebook', connectOpts)
            .then((r) => {
              if (r.ok) setFbConnected(true);
            })
            .catch((retryErr) => {
              console.error('connect-facebook retry failed:', retryErr);
            });
        });

      // Clear fragment from URL so it doesn't stay visible
      window.history.replaceState(null, '', '/auth/success');
      navigate('/settings', { replace: true });
    } else {
      navigate('/settings?error=No+token+received', { replace: true });
    }
  }, [navigate, setFbConnected]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <p className="text-lg text-text-muted">กำลังเข้าสู่ระบบ Facebook...</p>
    </div>
  );
}
