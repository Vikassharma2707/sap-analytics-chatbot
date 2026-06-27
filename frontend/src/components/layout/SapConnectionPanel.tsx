'use client';

import React, { useState } from 'react';
import { RefreshCw, Cloud, FileText } from 'lucide-react';

const SAP_APIS = [
  { name: 'I_BillingDocument',     path: '/sap/opu/odata/sap/API_BILLING_SRV',         active: true },
  { name: 'I_SalesOrder',          path: '/sap/opu/odata/sap/API_SALESORDER_SRV',       active: true },
  { name: 'I_Customer',            path: '/sap/opu/odata/sap/API_CUSTOMER_SRV',         active: true },
  { name: 'I_Material',            path: '/sap/opu/odata/sap/API_MATERIAL_SRV',         active: true },
  { name: 'I_PurchaseOrderAPI01',  path: '/sap/opu/odata/sap/API_PURCHASEORDER_SRV',   active: true },
  { name: 'I_Supplier',            path: '/sap/opu/odata/sap/API_SUPPLIER_SRV',         active: true },
  { name: 'I_MaterialStock',       path: '/sap/opu/odata/sap/API_MATERIALSTOCK_SRV',    active: true },
  { name: 'I_ProductionOrder',     path: '/sap/opu/odata/sap/API_PRODUCTIONORDER_SRV', active: false },
  { name: 'I_GLAccountLineItem',   path: '/sap/opu/odata/sap/API_GLACCOUNTLINEITEM_SRV',active: true },
  { name: 'I_JournalEntry',        path: '/sap/opu/odata/sap/API_JOURNALENTRY_SRV',    active: false },
];

export function SapConnectionPanel() {
  const [refreshing, setRefreshing] = useState(false);
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  return (
    <aside className="w-72 flex-shrink-0 bg-bits-panel border-r border-bits-border flex flex-col h-full">

      {/* SAP Backend Connection */}
      <div className="p-4 border-b border-bits-border">
        <h2 className="text-xs font-bold text-bits-accent uppercase tracking-widest mb-3">
          SAP Backend Connection
        </h2>
        <div className="bg-bits-deep border border-bits-border rounded-xl p-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-bits-hover flex items-center justify-center flex-shrink-0">
              <Cloud size={20} className="text-bits-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Connected</span>
              </div>
              <p className="text-sm font-semibold text-white">SAP S/4 HANA</p>
              <p className="text-xs text-bits-text">System: S4H_100</p>
              <p className="text-xs text-bits-text">Client: 100</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <RefreshCw size={11} className="text-bits-accent" />
          <span className="text-xs text-bits-text">Last Connected: {now}</span>
        </div>
      </div>

      {/* API Connection Status */}
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-xs font-bold text-bits-accent uppercase tracking-widest mb-3">
          API Connection Status
        </h2>
        <div className="space-y-1.5">
          {SAP_APIS.map((api) => (
            <div key={api.name}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bits-deep border border-bits-border hover:border-bits-border2 transition-colors">
              <FileText size={14} className="text-bits-accent flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{api.name}</p>
                <p className="text-xs text-bits-muted truncate">{api.path}</p>
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold flex-shrink-0 px-1.5 py-0.5 rounded ${
                api.active ? 'text-emerald-400 bg-emerald-900/30' : 'text-red-400 bg-red-900/30'
              }`}>
                <span className="text-[8px]">●</span>
                {api.active ? 'ACTIVE' : 'INACTIVE'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Refresh button */}
      <div className="p-4 border-t border-bits-border">
        <button
          onClick={handleRefresh}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-bits-border2 text-bits-accent text-sm font-medium hover:bg-bits-hover transition-colors"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh Status
        </button>
      </div>
    </aside>
  );
}
