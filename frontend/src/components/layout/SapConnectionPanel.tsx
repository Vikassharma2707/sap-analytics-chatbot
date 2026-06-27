'use client';

import React, { useState } from 'react';
import { RefreshCw, Cloud, FileText } from 'lucide-react';

const C = {
  panel:  '#0d1f35',
  deep:   '#0a1628',
  border: '#1e3a5f',
  border2:'#2a4f7a',
  accent: '#4a9eff',
  text:   '#7a9cc4',
  hover:  '#1e3a5f',
};

const SAP_APIS = [
  { name: 'I_BillingDocument',    path: '/sap/opu/odata/sap/API_BILLING_SRV',          active: true  },
  { name: 'I_SalesOrder',         path: '/sap/opu/odata/sap/API_SALESORDER_SRV',        active: true  },
  { name: 'I_Customer',           path: '/sap/opu/odata/sap/API_CUSTOMER_SRV',          active: true  },
  { name: 'I_Material',           path: '/sap/opu/odata/sap/API_MATERIAL_SRV',          active: true  },
  { name: 'I_PurchaseOrderAPI01', path: '/sap/opu/odata/sap/API_PURCHASEORDER_SRV',    active: true  },
  { name: 'I_Supplier',           path: '/sap/opu/odata/sap/API_SUPPLIER_SRV',          active: true  },
  { name: 'I_MaterialStock',      path: '/sap/opu/odata/sap/API_MATERIALSTOCK_SRV',     active: true  },
  { name: 'I_ProductionOrder',    path: '/sap/opu/odata/sap/API_PRODUCTIONORDER_SRV',  active: false },
  { name: 'I_GLAccountLineItem',  path: '/sap/opu/odata/sap/API_GLACCOUNTLINEITEM_SRV', active: true  },
  { name: 'I_JournalEntry',       path: '/sap/opu/odata/sap/API_JOURNALENTRY_SRV',     active: false },
];

export function SapConnectionPanel() {
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <aside style={{ width: 280, background: C.panel, borderRight: `1px solid ${C.border}` }}
      className="flex-shrink-0 flex flex-col h-full overflow-hidden">

      {/* Connection block */}
      <div style={{ borderBottom: `1px solid ${C.border}` }} className="p-4">
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.accent }}>
          SAP Backend Connection
        </p>
        <div style={{ background: C.deep, border: `1px solid ${C.border}`, borderRadius: 12 }} className="p-3">
          <div className="flex items-center gap-3">
            <div style={{ background: C.hover, borderRadius: 8 }} className="w-10 h-10 flex items-center justify-center flex-shrink-0">
              <Cloud size={20} style={{ color: C.accent }} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Connected</span>
              </div>
              <p className="text-sm font-semibold text-white">SAP S/4 HANA</p>
              <p className="text-xs" style={{ color: C.text }}>System: S4H_100</p>
              <p className="text-xs" style={{ color: C.text }}>Client: 100</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <RefreshCw size={11} style={{ color: C.accent }} />
          <span className="text-xs" style={{ color: C.text }}>Last Connected: {now}</span>
        </div>
      </div>

      {/* API list */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.accent }}>
          API Connection Status
        </p>
        <div className="flex flex-col gap-1.5">
          {SAP_APIS.map((api) => (
            <div key={api.name}
              style={{ background: C.deep, border: `1px solid ${C.border}`, borderRadius: 8 }}
              className="flex items-center gap-2 px-3 py-2">
              <FileText size={13} style={{ color: C.accent, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="text-xs font-medium text-white truncate">{api.name}</p>
                <p className="text-xs truncate" style={{ color: '#3a5070', fontSize: 10 }}>{api.path}</p>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, flexShrink: 0,
                color: api.active ? '#4ade80' : '#f87171',
                background: api.active ? '#052e1644' : '#2e050544',
              }}>
                ● {api.active ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Refresh */}
      <div style={{ borderTop: `1px solid ${C.border}` }} className="p-4">
        <button
          onClick={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1500); }}
          style={{ border: `1px solid ${C.border2}`, color: C.accent, borderRadius: 10, width: '100%' }}
          className="flex items-center justify-center gap-2 py-2.5 text-sm font-medium hover:opacity-80 transition-opacity">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh Status
        </button>
      </div>
    </aside>
  );
}
