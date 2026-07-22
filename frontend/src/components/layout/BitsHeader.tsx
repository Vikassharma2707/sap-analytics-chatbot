'use client';

import React, { useEffect, useState } from 'react';

interface BtpUser { name: string; email: string; sub: string }

function readUserCookie(): BtpUser | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split(';').map((c) => c.trim()).find((c) => c.startsWith('btp_user='));
  if (!match) return null;
  try { return JSON.parse(decodeURIComponent(match.split('=').slice(1).join('='))); }
  catch { return null; }
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
}

export function BitsHeader() {
  const [now, setNow]   = useState(new Date());
  const [user, setUser] = useState<BtpUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setUser(readUserCookie());
  }, []);

  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <header style={{
      background: '#0a1628',
      borderBottom: '1px solid #1e3a5f',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 20px', flexShrink: 0, minHeight: 72,
    }}>
      {/* Left — Coforge brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <img src="/coforge-logo.svg" alt="Coforge" height={36} style={{ flexShrink: 0, objectFit: 'contain' }} />
      </div>

      {/* Center — title */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ color: 'white', fontWeight: 700, fontSize: 20, margin: 0, letterSpacing: 0.5 }}>
          SAP S/4 HANA AI Analytics Assistant
        </h1>
        <p style={{ color: '#4a9eff', fontSize: 13, fontWeight: 500, margin: '4px 0 0' }}>
          Intelligent Insights. Real-time Decisions.
        </p>
      </div>

      {/* Right — clock + user */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#7a9cc4', fontSize: 13 }}>
          <span style={{ color: 'white', fontFamily: 'monospace', fontWeight: 600 }}>🕐 {time}</span>
          <span style={{ width: 1, height: 16, background: '#1e3a5f', display: 'inline-block' }} />
          <span>📅 {date}</span>
        </div>

        {/* User menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#0d1f35', border: '1px solid #2a4f7a',
              borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
            }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>
              {user ? initials(user.name) : 'U'}
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ color: 'white', fontSize: 12, fontWeight: 600, margin: 0, lineHeight: 1.2 }}>
                {user?.name || 'SAP User'}
              </p>
              {user?.email && (
                <p style={{ color: '#7a9cc4', fontSize: 10, margin: 0, lineHeight: 1.2 }}>{user.email}</p>
              )}
            </div>
            <span style={{ color: '#7a9cc4', fontSize: 11 }}>▾</span>
          </button>

          {menuOpen && (
            <>
              {/* Backdrop */}
              <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
              {/* Dropdown */}
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 999,
                background: '#0d1f35', border: '1px solid #1e3a5f', borderRadius: 12,
                boxShadow: '0 8px 32px #00000066', padding: 8, minWidth: 200,
              }}>
                {user && (
                  <div style={{ padding: '8px 12px 12px', borderBottom: '1px solid #1e3a5f', marginBottom: 8 }}>
                    <p style={{ color: 'white', fontSize: 13, fontWeight: 600, margin: '0 0 2px' }}>{user.name}</p>
                    <p style={{ color: '#7a9cc4', fontSize: 11, margin: 0 }}>{user.email}</p>
                    <p style={{ color: '#3a5070', fontSize: 10, margin: '4px 0 0' }}>BTP XSUAA</p>
                  </div>
                )}
                <a
                  href="/api/auth/logout"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', borderRadius: 8, textDecoration: 'none',
                    color: '#f87171', fontSize: 13, fontWeight: 500,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#2e050533')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  🚪 Sign Out
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
