'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSettingsStore } from '@/store/settingsStore';

export function WebGuiPanel({ onClose }: { onClose: () => void }) {
  const { system } = useSettingsStore();
  const iframeRef  = useRef<HTMLIFrameElement>(null);
  const [ready,   setReady]   = useState(false); // true once creds cookie is set
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const directUrl = `${system.protocol || 'http'}://${system.host}:${system.port}/sap/bc/gui/sap/its/webgui?sap-client=${system.client}&sap-language=EN`;
  const iframeSrc = `/api/sap/webgui/sap/bc/gui/sap/its/webgui?sap-client=${system.client}&sap-language=EN`;

  // Step 1: Store credentials in a session cookie so every proxy request can auth
  useEffect(() => {
    fetch('/api/sap/webgui-init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host:     system.host,
        port:     String(system.port),
        protocol: system.protocol || 'http',
        username: system.username,
        password: system.password,
        client:   system.client,
      }),
    })
      .then(() => setReady(true))
      .catch(() => { setError('Failed to initialise session'); setReady(true); });
  }, [system]);

  const reload = () => {
    setLoading(true);
    setError('');
    if (iframeRef.current) iframeRef.current.src = iframeSrc;
  };

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: '#071224', display: 'flex', flexDirection: 'column',
    }}>
      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 14px', background: '#0d1f35', borderBottom: '1px solid #1e3a5f',
        flexShrink: 0,
      }}>
        <button onClick={onClose} title="Back to app" style={btnStyle('#1a3a6b', '#2a4f7a', '#7a9cc4')}>←</button>

        <span style={{ fontSize: 18 }}>🖥️</span>
        <span style={{ color: 'white', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>SAP WebGUI</span>
        <span style={{
          fontSize: 11, background: '#064e3b', color: '#4ade80',
          border: '1px solid #4ade80', borderRadius: 4, padding: '2px 8px', fontWeight: 700, whiteSpace: 'nowrap',
        }}>
          {system.sid} / {system.client}
        </span>

        {/* URL bar */}
        <div style={{
          flex: 1, background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 8,
          padding: '5px 12px', fontSize: 12, color: '#4a9eff',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {directUrl}
        </div>

        <button onClick={reload} title="Reload" style={btnStyle('#1a3a6b', '#2a4f7a', '#7a9cc4')}>↺</button>
        <a href={directUrl} target="_blank" rel="noreferrer" title="Open in new tab"
          style={{ ...btnStyle('#1a3a6b', '#2a4f7a', '#7a9cc4'), textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          ↗
        </a>
        <button onClick={onClose} title="Close" style={btnStyle('#3b0a0a', '#7f1d1d', '#f87171')}>✕</button>
      </div>

      {/* ── Status bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '4px 16px', background: '#071224', borderBottom: '1px solid #1e3a5f',
        fontSize: 11, flexShrink: 0,
      }}>
        <span style={{ color: '#4a6080' }}>User:</span>
        <span style={{ color: '#7a9cc4', fontWeight: 600 }}>{system.username}</span>
        <span style={{ color: '#4a6080' }}>•</span>
        <span style={{ color: '#4a6080' }}>{system.protocol || 'http'}://{system.host}:{system.port}</span>
        <span style={{ color: '#4a6080' }}>•</span>
        <span style={{ color: '#4a6080' }}>Client {system.client}</span>

        {loading && !error && (
          <span style={{ color: '#4a9eff', marginLeft: 'auto' }}>⏳ Loading…</span>
        )}
        {error && (
          <span style={{ color: '#f87171', marginLeft: 'auto' }}>⚠️ {error}</span>
        )}
        {!loading && !error && (
          <span style={{ color: '#4ade80', marginLeft: 'auto' }}>✓ Connected</span>
        )}
      </div>

      {/* ── iframe ── */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Spinner overlay while loading */}
        {(loading || !ready) && (
          <div style={{
            position: 'absolute', inset: 0, background: '#071224',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 10,
          }}>
            <div style={{ fontSize: 48 }}>🖥️</div>
            <p style={{ color: '#4a9eff', fontSize: 16, fontWeight: 600, margin: 0 }}>
              {!ready ? 'Initialising session…' : 'Loading SAP WebGUI…'}
            </p>
            <p style={{ color: '#4a6080', fontSize: 12, margin: 0 }}>{directUrl}</p>
          </div>
        )}

        {ready && (
          <iframe
            ref={iframeRef}
            key={iframeSrc}
            src={iframeSrc}
            style={{ width: '100%', height: '100%', border: 'none', background: 'white', display: 'block' }}
            title="SAP WebGUI"
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setError('Failed to load — check connection settings'); }}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals"
          />
        )}
      </div>
    </div>,
    document.body
  );
}

function btnStyle(bg: string, border: string, color: string): React.CSSProperties {
  return {
    background: bg, border: `1px solid ${border}`, borderRadius: 8,
    color, fontSize: 16, cursor: 'pointer', padding: '5px 10px', lineHeight: 1,
    flexShrink: 0,
  };
}
