'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSettingsStore } from '@/store/settingsStore';
import { SettingsPage } from '@/components/settings/SettingsPage';

const Dot = ({ active, ping }: { active?: boolean; ping?: boolean }) => (
  <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8 }}>
    {ping && <span style={{
      position: 'absolute', inset: 0, borderRadius: '50%',
      background: active ? '#4ade80' : '#f87171', opacity: 0.7,
      animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
    }} />}
    <span style={{
      position: 'relative', width: 8, height: 8, borderRadius: '50%',
      background: active ? '#4ade80' : '#f87171', display: 'inline-block',
    }} />
  </span>
);

export function SapConnectionPanel() {
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { system, connection, odataServices, cdsViews } = useSettingsStore();

  // Portal requires document to be available
  useEffect(() => { setMounted(true); }, []);

  const isConnected = connection.state === 'connected';
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const displayServices = odataServices.length > 0
    ? odataServices.filter((s) => s.selected)
    : null;

  const displayCds = cdsViews.length > 0
    ? cdsViews.filter((v) => v.selected)
    : null;

  const openSettings = () => setShowSettings(true);
  const closeSettings = () => setShowSettings(false);

  return (
    <>
      {/* Render modal at document.body level so overflow:hidden on aside cannot clip it */}
      {mounted && showSettings && createPortal(
        <SettingsPage onClose={closeSettings} />,
        document.body
      )}

      <aside style={{
        width: 280, flexShrink: 0,
        background: '#0d1f35',
        borderRight: '1px solid #1e3a5f',
        display: 'flex', flexDirection: 'column',
        height: '100%', overflow: 'hidden',
      }}>
        {/* WebGUI + Settings — pinned at top */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #1e3a5f', flexShrink: 0, display: 'flex', gap: 8 }}>
          <a
            href="/webgui-launch"
            target="_blank" rel="noreferrer"
            style={{
              flex: 1, padding: '10px 0', textDecoration: 'none',
              background: '#064e3b', border: '1px solid #4ade80',
              borderRadius: 10, color: '#4ade80', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            🔐 SAP Login ↗
          </a>
          <button onClick={openSettings} title="SAP Settings"
            style={{
              width: 42, background: '#1a3a6b', border: '1px solid #2a4f7a',
              borderRadius: 10, color: '#7a9cc4', fontSize: 16,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            ⚙️
          </button>
        </div>

        {/* Clickable SAP connection card */}
        <div style={{ padding: 16, borderBottom: '1px solid #1e3a5f', flexShrink: 0 }}>
          <p style={{ color: '#4a9eff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
            SAP Backend Connection
          </p>
          <div
            onClick={openSettings}
            title="Click to configure SAP connection"
            style={{
              background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 12, padding: 12,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#4a9eff')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1e3a5f')}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 8, background: '#1e3a5f',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: 20,
              }}>☁️</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Dot active={isConnected} ping={isConnected} />
                  <span style={{
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
                    color: isConnected ? '#4ade80' : connection.state === 'failed' ? '#f87171' : '#7a9cc4',
                  }}>
                    {connection.state === 'connected' ? 'Connected'
                      : connection.state === 'failed' ? 'Failed'
                      : connection.state === 'testing' ? 'Testing...'
                      : 'Not Configured'}
                  </span>
                </div>
                <p style={{ color: 'white', fontSize: 13, fontWeight: 600, margin: '0 0 2px' }}>SAP S/4 HANA</p>
                <p style={{ color: '#7a9cc4', fontSize: 11, margin: 0 }}>SID: {system.sid} | Client: {system.client}</p>
                <p style={{ color: '#7a9cc4', fontSize: 11, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {system.host}:{system.port}
                </p>
              </div>
            </div>
            <p style={{ color: '#3a5070', fontSize: 10, margin: '8px 0 0', textAlign: 'center' }}>
              🔧 Click to configure
            </p>
          </div>
          <p style={{ color: '#7a9cc4', fontSize: 11, marginTop: 8 }}>
            🔄 {connection.lastChecked ? `Last checked: ${connection.lastChecked}` : `Now: ${now}`}
          </p>
        </div>

        {/* Scrollable API / CDS list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          <p style={{ color: '#4a9eff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>
            OData Services {displayServices ? `(${displayServices.length} active)` : '(default)'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 16 }}>
            {(displayServices || DEFAULT_APIS).map((api) => (
              <div key={api.name} style={{
                background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 8,
                padding: '7px 11px', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 13, flexShrink: 0 }}>📄</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: 'white', fontSize: 11, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {api.title || api.name}
                  </p>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, flexShrink: 0,
                  color: api.active ? '#4ade80' : '#f87171',
                  background: api.active ? '#05261655' : '#2e050555',
                }}>● {api.active ? 'ON' : 'OFF'}</span>
              </div>
            ))}
          </div>

          {(displayCds && displayCds.length > 0) && (
            <>
              <p style={{ color: '#4a9eff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>
                CDS Views ({displayCds.length} selected)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {displayCds.slice(0, 8).map((view) => (
                  <div key={view.name} style={{
                    background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 8,
                    padding: '7px 11px', display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ fontSize: 13, flexShrink: 0 }}>🗂</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: 'white', fontSize: 11, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {view.name}
                      </p>
                    </div>
                  </div>
                ))}
                {displayCds.length > 8 && (
                  <p style={{ color: '#4a6080', fontSize: 11, textAlign: 'center', margin: '4px 0 0' }}>
                    +{displayCds.length - 8} more — open Settings to see all
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: 12, borderTop: '1px solid #1e3a5f', flexShrink: 0 }}>
          <button
            onClick={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1500); }}
            style={{
              width: '100%', padding: '8px 0',
              background: 'transparent', border: '1px solid #2a4f7a',
              borderRadius: 10, color: '#4a9eff', fontSize: 12, fontWeight: 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            <span style={{ display: 'inline-block', animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
            Refresh Status
          </button>
        </div>
      </aside>
    </>
  );
}

const DEFAULT_APIS = [
  { name: 'API_BILLING_SRV',           title: 'Billing Document',  active: true  },
  { name: 'API_SALESORDER_SRV',        title: 'Sales Order',       active: true  },
  { name: 'API_CUSTOMER_SRV',          title: 'Customer Master',   active: true  },
  { name: 'API_MATERIAL_SRV',          title: 'Material Master',   active: true  },
  { name: 'API_PURCHASEORDER_SRV',     title: 'Purchase Order',    active: true  },
  { name: 'API_SUPPLIER_SRV',          title: 'Supplier Master',   active: true  },
  { name: 'API_MATERIALSTOCK_SRV',     title: 'Material Stock',    active: true  },
  { name: 'API_PRODUCTIONORDER_SRV',   title: 'Production Order',  active: false },
  { name: 'API_GLACCOUNTLINEITEM_SRV', title: 'GL Account Items',  active: true  },
  { name: 'API_JOURNALENTRY_SRV',      title: 'Journal Entry',     active: false },
];
