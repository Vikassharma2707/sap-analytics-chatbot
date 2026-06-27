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
      {/* Left — BITS brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Official BITS Pilani logo */}
        <img
          src="https://upload.wikimedia.org/wikipedia/en/d/d3/BITS_Pilani-Logo.svg"
          alt="BITS Pilani"
          width={56}
          height={56}
          style={{ flexShrink: 0, objectFit: 'contain' }}
          onError={(e) => {
            const t = e.currentTarget;
            t.style.display = 'none';
            const fallback = t.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        {/* Fallback SVG emblem if image fails */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%', flexShrink: 0, display: 'none',
          background: 'radial-gradient(circle at 40% 35%, #8B1A1A 0%, #9B2020 30%, #C4922A 60%, #1a3a6b 100%)',
          border: '3px solid #C4922A', boxShadow: '0 0 16px #C4922A66',
          alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
        }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="15" stroke="#C4922A" strokeWidth="1.5" fill="none"/>
            <text x="16" y="12" textAnchor="middle" fill="white" fontSize="5" fontWeight="bold">BITS</text>
            <text x="16" y="20" textAnchor="middle" fill="#C4922A" fontSize="4">PILANI</text>
            <line x1="8" y1="14" x2="24" y2="14" stroke="#C4922A" strokeWidth="0.8"/>
          </svg>
        </div>

        {/* Text */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 20, lineHeight: 1 }}>BITS</span>
            <span style={{ color: '#C4922A', fontWeight: 800, fontSize: 20, lineHeight: 1 }}>Pilani</span>
          </div>
          <p style={{ color: '#7a9cc4', fontSize: 10, margin: '3px 0 2px' }}>
            Pilani | Dubai | Goa | Hyderabad | Mumbai
          </p>
          <p style={{ color: '#C4922A', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }}>
            Work Integrated Learning Programmes
          </p>
        </div>
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
