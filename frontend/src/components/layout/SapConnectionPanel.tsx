'use client';

import React, { useState } from 'react';

const SAP_APIS = [
  { name: 'I_BillingDocument',    path: '/sap/opu/odata/sap/API_BILLING_SRV',           active: true  },
  { name: 'I_SalesOrder',         path: '/sap/opu/odata/sap/API_SALESORDER_SRV',         active: true  },
  { name: 'I_Customer',           path: '/sap/opu/odata/sap/API_CUSTOMER_SRV',           active: true  },
  { name: 'I_Material',           path: '/sap/opu/odata/sap/API_MATERIAL_SRV',           active: true  },
  { name: 'I_PurchaseOrderAPI01', path: '/sap/opu/odata/sap/API_PURCHASEORDER_SRV',     active: true  },
  { name: 'I_Supplier',           path: '/sap/opu/odata/sap/API_SUPPLIER_SRV',           active: true  },
  { name: 'I_MaterialStock',      path: '/sap/opu/odata/sap/API_MATERIALSTOCK_SRV',      active: true  },
  { name: 'I_ProductionOrder',    path: '/sap/opu/odata/sap/API_PRODUCTIONORDER_SRV',   active: false },
  { name: 'I_GLAccountLineItem',  path: '/sap/opu/odata/sap/API_GLACCOUNTLINEITEM_SRV', active: true  },
  { name: 'I_JournalEntry',       path: '/sap/opu/odata/sap/API_JOURNALENTRY_SRV',      active: false },
];

const Dot = ({ ping }: { ping?: boolean }) => (
  <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8 }}>
    {ping && <span style={{
      position: 'absolute', inset: 0, borderRadius: '50%',
      background: '#4ade80', opacity: 0.7,
      animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
    }} />}
    <span style={{ position: 'relative', width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
  </span>
);

export function SapConnectionPanel() {
  const [refreshing, setRefreshing] = useState(false);
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <aside style={{
      width: 280, flexShrink: 0,
      background: '#0d1f35',
      borderRight: '1px solid #1e3a5f',
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
    }}>
      {/* SAP Backend Connection */}
      <div style={{ padding: 16, borderBottom: '1px solid #1e3a5f' }}>
        <p style={{ color: '#4a9eff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
          SAP Backend Connection
        </p>
        <div style={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 12, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              background: '#1e3a5f',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontSize: 20,
            }}>☁️</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Dot ping />
                <span style={{ color: '#4ade80', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Connected</span>
              </div>
              <p style={{ color: 'white', fontSize: 13, fontWeight: 600, margin: '0 0 2px' }}>SAP S/4 HANA</p>
              <p style={{ color: '#7a9cc4', fontSize: 11, margin: 0 }}>System: S4H_100</p>
              <p style={{ color: '#7a9cc4', fontSize: 11, margin: 0 }}>Client: 100</p>
            </div>
          </div>
        </div>
        <p style={{ color: '#7a9cc4', fontSize: 11, marginTop: 8 }}>🔄 Last Connected: {now}</p>
      </div>

      {/* API list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <p style={{ color: '#4a9eff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
          API Connection Status
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {SAP_APIS.map((api) => (
            <div key={api.name} style={{
              background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 8,
              padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>📄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: 'white', fontSize: 12, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {api.name}
                </p>
                <p style={{ color: '#3a5070', fontSize: 10, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {api.path}
                </p>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, flexShrink: 0,
                color: api.active ? '#4ade80' : '#f87171',
                background: api.active ? '#052e1655' : '#2e050555',
              }}>
                ● {api.active ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Refresh */}
      <div style={{ padding: 16, borderTop: '1px solid #1e3a5f' }}>
        <button
          onClick={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1500); }}
          style={{
            width: '100%', padding: '10px 0',
            background: 'transparent', border: '1px solid #2a4f7a',
            borderRadius: 10, color: '#4a9eff', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          <span style={{ display: 'inline-block', animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
          Refresh Status
        </button>
      </div>
    </aside>
  );
}
