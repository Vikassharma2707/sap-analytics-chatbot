'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const ERROR_MESSAGES: Record<string, string> = {
  missing_code:          'Authorization code was not received. Please try again.',
  token_exchange_failed: 'Failed to exchange authorization code. Please try again.',
  unauthorized:          'Your session expired. Please log in again.',
};

function LoginInner() {
  const params = useSearchParams();
  const error  = params.get('error');
  const [loading, setLoading] = useState(false);

  // Auto-redirect if no error (first visit)
  useEffect(() => {
    if (!error) {
      setLoading(true);
      window.location.href = '/api/auth/login';
    }
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #071224 0%, #0a1f35 50%, #071224 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Card */}
      <div style={{
        width: 420, background: '#0d1f35', border: '1px solid #1e3a5f',
        borderRadius: 20, padding: '40px 36px', boxShadow: '0 24px 64px #00000066',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
      }}>
        {/* Logo */}
        <img src="/coforge-logo.svg" alt="Coforge" height={32} style={{ marginBottom: 28, objectFit: 'contain' }} />

        {/* Title */}
        <h1 style={{ color: 'white', fontSize: 22, fontWeight: 700, margin: '0 0 6px', textAlign: 'center' }}>
          SAP S/4 HANA AI Assistant
        </h1>
        <p style={{ color: '#4a9eff', fontSize: 13, margin: '0 0 32px', textAlign: 'center' }}>
          Intelligent Insights. Real-time Decisions.
        </p>

        {/* Error banner */}
        {error && (
          <div style={{
            width: '100%', padding: '12px 16px', borderRadius: 10, marginBottom: 24,
            background: '#2e050555', border: '1px solid #f87171', color: '#f87171', fontSize: 13,
          }}>
            ⚠️ {ERROR_MESSAGES[error] ?? `Login error: ${error}`}
          </div>
        )}

        {/* BTP badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
          background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 10, marginBottom: 24,
          width: '100%',
        }}>
          <span style={{ fontSize: 20 }}>☁️</span>
          <div>
            <p style={{ color: '#7a9cc4', fontSize: 11, margin: 0 }}>Authentication via</p>
            <p style={{ color: 'white', fontSize: 13, fontWeight: 600, margin: 0 }}>SAP BTP XSUAA</p>
          </div>
        </div>

        {/* Login button */}
        <button
          onClick={() => { setLoading(true); window.location.href = '/api/auth/login'; }}
          disabled={loading}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 12,
            background: loading ? '#1e3a5f' : '#1a5fb4',
            border: `1px solid ${loading ? '#2a4f7a' : '#4a9eff'}`,
            color: 'white', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s',
          }}>
          {loading ? (
            <>
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
              Redirecting to SAP…
            </>
          ) : (
            <>🔐 Sign in with SAP BTP</>
          )}
        </button>

        <p style={{ color: '#3a5070', fontSize: 11, marginTop: 20, textAlign: 'center' }}>
          You will be redirected to your SAP BTP Identity Provider
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
