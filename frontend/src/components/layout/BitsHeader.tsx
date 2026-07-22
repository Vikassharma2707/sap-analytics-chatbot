'use client';

import React, { useEffect, useState } from 'react';

export function BitsHeader() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <header style={{
      background: '#0a1628',
      borderBottom: '1px solid #1e3a5f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 20px',
      flexShrink: 0,
      minHeight: 72,
    }}>
      {/* Left — Coforge brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <img
          src="/coforge-logo.svg"
          alt="Coforge"
          height={36}
          style={{ flexShrink: 0, objectFit: 'contain' }}
        />
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
        <button style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#0d1f35', border: '1px solid #2a4f7a',
          borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 11, fontWeight: 700,
          }}>AD</div>
          <span style={{ color: 'white', fontSize: 13, fontWeight: 500 }}>Admin User</span>
          <span style={{ color: '#7a9cc4', fontSize: 11 }}>▾</span>
        </button>
      </div>
    </header>
  );
}
