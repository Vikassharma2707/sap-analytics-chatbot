'use client';

import React, { useState } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import type { ODataService, CdsView } from '@/store/settingsStore';

// Use Next.js API routes directly — no Python backend required
const SAP_API = '/api/sap';

const C = {
  bg:     '#071224',
  panel:  '#0d1f35',
  deep:   '#0a1628',
  border: '#1e3a5f',
  border2:'#2a4f7a',
  accent: '#4a9eff',
  text:   '#7a9cc4',
  muted:  '#4a6080',
  btn:    '#1a5fb4',
  gold:   '#C4922A',
};

interface Props { onClose: () => void }

export function SettingsPage({ onClose }: Props) {
  const { system, setSystem, connection, setConnection, odataServices, cdsViews,
    setOdataServices, setCdsViews, toggleOdata, toggleCds, selectAllOdata, selectAllCds } = useSettingsStore();

  const [form, setForm] = useState({ ...system });
  const [activeTab, setActiveTab] = useState<'connection' | 'services' | 'cds' | 'webgui'>('connection');
  const [discovering, setDiscovering] = useState(false);
  const [testing, setTesting] = useState(false);

  const field = (key: keyof typeof form, label: string, type = 'text', placeholder = '') => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </label>
      <input
        type={type}
        value={String(form[key])}
        onChange={(e) => setForm((f) => ({ ...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 8,
          background: C.deep, border: `1px solid ${C.border2}`,
          color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box',
        }}
      />
    </div>
  );

  const handleTestConnection = async () => {
    setTesting(true);
    setConnection({ state: 'testing', message: 'Testing connection...' });
    try {
      const res = await fetch(`${SAP_API}/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: form.host, port: form.port, client: form.client,
          username: form.username, password: form.password,
          auth_type: form.authType, ssl_verify: form.sslVerify, protocol: form.protocol,
        }),
      });
      const data = await res.json();
      setSystem({ ...form, sid: data.system?.sid || form.sid });
      setConnection({
        state: data.connected ? 'connected' : 'failed',
        message: data.message,
        lastChecked: new Date().toLocaleTimeString(),
      });
    } catch {
      setConnection({ state: 'failed', message: 'Network error — could not reach backend' });
    } finally {
      setTesting(false);
    }
  };

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      const res = await fetch(`${SAP_API}/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: form.host, port: form.port, client: form.client,
          username: form.username, password: form.password,
          auth_type: form.authType, ssl_verify: form.sslVerify, protocol: form.protocol,
        }),
      });
      const data = await res.json();
      setOdataServices((data.odata_services || []).map((s: ODataService) => ({ ...s, selected: true })));
      setCdsViews((data.cds_views || []).map((v: CdsView) => ({ ...v, selected: true })));
      setActiveTab('services');
    } catch {
      alert('Discovery failed — check connection');
    } finally {
      setDiscovering(false);
    }
  };

  const handleSave = () => {
    setSystem(form);
    onClose();
  };

  const statusColor = connection.state === 'connected' ? '#4ade80'
    : connection.state === 'failed' ? '#f87171'
    : connection.state === 'testing' ? C.accent : C.muted;

  const statusIcon = connection.state === 'connected' ? '✅'
    : connection.state === 'failed' ? '❌'
    : connection.state === 'testing' ? '⏳' : '⚪';

  const selectedOdata = odataServices.filter((s) => s.selected).length;
  const selectedCds = cdsViews.filter((v) => v.selected).length;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: activeTab === 'webgui' ? '0' : '20px', overflowY: activeTab === 'webgui' ? 'hidden' : 'auto',
    }}>
      <div style={{
        background: C.panel, border: `1px solid ${C.border}`, borderRadius: activeTab === 'webgui' ? 0 : 20,
        width: '100%', maxWidth: activeTab === 'webgui' ? '100%' : 860,
        height: activeTab === 'webgui' ? '100vh' : 'auto',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px #00000088',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 24 }}>⚙️</div>
            <div>
              <h2 style={{ color: 'white', fontSize: 18, fontWeight: 700, margin: 0 }}>SAP System Settings</h2>
              <p style={{ color: C.muted, fontSize: 12, margin: '2px 0 0' }}>Configure connectivity, discover services, and select CDS views</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: C.text,
            fontSize: 22, cursor: 'pointer', padding: '4px 8px',
          }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, padding: '0 24px' }}>
          {[
            { id: 'connection', label: '🔌 Connection' },
            { id: 'services',   label: `📡 OData Services${odataServices.length ? ` (${selectedOdata}/${odataServices.length})` : ''}` },
            { id: 'cds',        label: `🗂 CDS Views${cdsViews.length ? ` (${selectedCds}/${cdsViews.length})` : ''}` },
            { id: 'webgui',     label: '🖥️ WebGUI' },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
              style={{
                padding: '12px 18px', fontSize: 13, fontWeight: 600,
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: activeTab === tab.id ? C.accent : C.muted,
                borderBottom: activeTab === tab.id ? `2px solid ${C.accent}` : '2px solid transparent',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: 24, flex: activeTab === 'webgui' ? 1 : undefined, display: 'flex', flexDirection: 'column', overflow: activeTab === 'webgui' ? 'hidden' : undefined }}>

          {/* ── Connection tab ── */}
          {activeTab === 'connection' && (
            <div style={{ display: 'flex', gap: 24 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  {field('host', 'SAP Host / IP', 'text', 'e.g. 192.168.1.100')}
                  {field('port', 'Port', 'number', '44300')}
                  {field('client', 'Client', 'text', '100')}
                  {field('sid', 'System ID (SID)', 'text', 'S4H')}
                  {field('username', 'Username', 'text', 'basis')}
                  {field('password', 'Password', 'password', '••••••••')}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Protocol
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['http', 'https'] as const).map((p) => (
                      <button key={p} onClick={() => setForm((f) => ({ ...f, protocol: p }))}
                        style={{
                          padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          background: form.protocol === p ? C.btn : C.deep,
                          border: `1px solid ${form.protocol === p ? C.accent : C.border2}`,
                          color: form.protocol === p ? 'white' : C.text,
                        }}>
                        {p === 'http' ? '🌐 HTTP' : '🔒 HTTPS'}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Authentication Type
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['basic', 'oauth2'] as const).map((t) => (
                      <button key={t} onClick={() => setForm((f) => ({ ...f, authType: t }))}
                        style={{
                          padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          background: form.authType === t ? C.btn : C.deep,
                          border: `1px solid ${form.authType === t ? C.accent : C.border2}`,
                          color: form.authType === t ? 'white' : C.text,
                        }}>
                        {t === 'basic' ? '🔑 Basic Auth' : '🔐 OAuth 2.0'}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                  <input type="checkbox" id="ssl"
                    checked={form.sslVerify}
                    onChange={(e) => setForm((f) => ({ ...f, sslVerify: e.target.checked }))}
                    style={{ width: 16, height: 16, cursor: 'pointer' }} />
                  <label htmlFor="ssl" style={{ color: C.text, fontSize: 13, cursor: 'pointer' }}>
                    Verify SSL Certificate
                  </label>
                </div>
              </div>

              {/* Right — status + actions */}
              <div style={{ width: 240, flexShrink: 0 }}>
                {/* Connection status card */}
                <div style={{
                  background: C.deep, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 16,
                }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 12px' }}>
                    Connection Status
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>{statusIcon}</span>
                    <span style={{ color: statusColor, fontWeight: 700, fontSize: 13 }}>
                      {connection.state === 'unknown' ? 'Not Tested' : connection.state.charAt(0).toUpperCase() + connection.state.slice(1)}
                    </span>
                  </div>
                  <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>{connection.message}</p>
                  {connection.lastChecked && (
                    <p style={{ color: C.muted, fontSize: 11, margin: '6px 0 0' }}>Last: {connection.lastChecked}</p>
                  )}
                </div>

                <button onClick={handleTestConnection} disabled={testing}
                  style={{
                    width: '100%', padding: '11px 0', borderRadius: 10, fontSize: 14, fontWeight: 600,
                    cursor: testing ? 'not-allowed' : 'pointer', marginBottom: 10,
                    background: testing ? C.border : C.btn,
                    border: `1px solid ${C.accent}`, color: 'white', opacity: testing ? 0.7 : 1,
                  }}>
                  {testing ? '⏳ Testing...' : '🔌 Check Connection'}
                </button>

                <button onClick={handleDiscover} disabled={discovering || connection.state !== 'connected'}
                  style={{
                    width: '100%', padding: '11px 0', borderRadius: 10, fontSize: 14, fontWeight: 600,
                    cursor: (discovering || connection.state !== 'connected') ? 'not-allowed' : 'pointer', marginBottom: 10,
                    background: connection.state === 'connected' ? '#064e3b' : C.deep,
                    border: `1px solid ${connection.state === 'connected' ? '#4ade80' : C.border}`,
                    color: connection.state === 'connected' ? '#4ade80' : C.muted,
                    opacity: (discovering || connection.state !== 'connected') ? 0.6 : 1,
                  }}>
                  {discovering ? '⏳ Discovering...' : '🔍 Discover Services'}
                </button>

                {connection.state !== 'connected' && (
                  <p style={{ fontSize: 11, color: C.muted, textAlign: 'center' }}>
                    Test connection first to discover services
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── OData Services tab ── */}
          {activeTab === 'services' && (
            <div>
              {odataServices.length === 0 ? (
                <EmptyDiscovery onDiscover={() => setActiveTab('connection')} />
              ) : (
                <>
                  <SelectAllBar
                    allSelected={odataServices.every((s) => s.selected)}
                    selected={selectedOdata} total={odataServices.length}
                    onSelectAll={(v) => selectAllOdata(v)}
                    label="OData Services"
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                    {odataServices.map((svc) => (
                      <ServiceCard key={svc.name} checked={svc.selected} onChange={() => toggleOdata(svc.name)}
                        title={svc.title} subtitle={svc.path} active={svc.active} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── CDS Views tab ── */}
          {activeTab === 'cds' && (
            <div>
              {cdsViews.length === 0 ? (
                <EmptyDiscovery onDiscover={() => setActiveTab('connection')} />
              ) : (
                <>
                  <SelectAllBar
                    allSelected={cdsViews.every((v) => v.selected)}
                    selected={selectedCds} total={cdsViews.length}
                    onSelectAll={(v) => selectAllCds(v)}
                    label="CDS Views"
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                    {cdsViews.map((view) => (
                      <ServiceCard key={view.name} checked={view.selected} onChange={() => toggleCds(view.name)}
                        title={view.name} subtitle={view.description} badge={view.service} active />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── WebGUI tab ── */}
          {activeTab === 'webgui' && (() => {
            const webguiUrl = `${form.protocol}://${form.host}:${form.port}/sap/bc/gui/sap/its/webgui`;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* URL bar */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0 12px', borderBottom: `1px solid ${C.border}`, marginBottom: 12,
                }}>
                  <span style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap' }}>URL:</span>
                  <code style={{
                    flex: 1, fontSize: 12, color: C.accent,
                    background: C.deep, padding: '6px 12px', borderRadius: 6,
                    border: `1px solid ${C.border}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{webguiUrl}</code>
                  <a href={webguiUrl} target="_blank" rel="noreferrer"
                    style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: C.btn, color: 'white', textDecoration: 'none', whiteSpace: 'nowrap',
                    }}>
                    ↗ Open in tab
                  </a>
                </div>
                {/* Iframe */}
                <iframe
                  src={webguiUrl}
                  style={{ flex: 1, width: '100%', border: 'none', borderRadius: 8, minHeight: 500, background: 'white' }}
                  title="SAP WebGUI"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                />
              </div>
            );
          })()}
        </div>

        {/* Footer — hidden on WebGUI tab */}
        {activeTab !== 'webgui' && <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 12,
          padding: '16px 24px', borderTop: `1px solid ${C.border}`,
        }}>
          <button onClick={onClose}
            style={{ padding: '10px 24px', borderRadius: 8, background: C.deep, border: `1px solid ${C.border2}`, color: C.text, fontSize: 14, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave}
            style={{ padding: '10px 24px', borderRadius: 8, background: C.btn, border: 'none', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            💾 Save Settings
          </button>
        </div>}
      </div>
    </div>
  );
}

function SelectAllBar({ allSelected, selected, total, onSelectAll, label }: {
  allSelected: boolean; selected: number; total: number;
  onSelectAll: (v: boolean) => void; label: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#0a1628', borderRadius: 8, border: '1px solid #1e3a5f' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input type="checkbox" checked={allSelected} onChange={(e) => onSelectAll(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
        <span style={{ color: '#7a9cc4', fontSize: 13 }}>Select All {label}</span>
      </div>
      <span style={{ color: '#4a9eff', fontSize: 12, fontWeight: 600 }}>{selected} / {total} selected</span>
    </div>
  );
}

function ServiceCard({ checked, onChange, title, subtitle, active, badge }: {
  checked: boolean; onChange: () => void; title: string; subtitle: string; active: boolean; badge?: string;
}) {
  return (
    <div onClick={onChange}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', cursor: 'pointer',
        background: checked ? '#0a1f38' : '#0a1628',
        border: `1px solid ${checked ? '#2a4f7a' : '#1e3a5f'}`, borderRadius: 10, transition: 'all 0.15s',
      }}>
      <input type="checkbox" checked={checked} onChange={onChange} onClick={(e) => e.stopPropagation()}
        style={{ width: 15, height: 15, marginTop: 2, cursor: 'pointer', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ color: 'white', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, flexShrink: 0,
            color: active ? '#4ade80' : '#f87171', background: active ? '#05261655' : '#2e050555',
          }}>
            {active ? '● ACTIVE' : '● INACTIVE'}
          </span>
        </div>
        <p style={{ color: '#3a5070', fontSize: 11, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</p>
        {badge && <span style={{ fontSize: 10, color: '#4a6080', background: '#1e3a5f', padding: '1px 6px', borderRadius: 4, marginTop: 4, display: 'inline-block' }}>{badge}</span>}
      </div>
    </div>
  );
}

function EmptyDiscovery({ onDiscover }: { onDiscover: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
      <p style={{ color: 'white', fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>No services discovered yet</p>
      <p style={{ color: '#4a6080', fontSize: 13, margin: '0 0 20px' }}>
        Go to the Connection tab, test your connection, then click &quot;Discover Services&quot;
      </p>
      <button onClick={onDiscover}
        style={{ padding: '10px 24px', borderRadius: 8, background: '#1a5fb4', border: 'none', color: 'white', fontSize: 14, cursor: 'pointer' }}>
        Go to Connection
      </button>
    </div>
  );
}
