'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Calendar, ChevronDown } from 'lucide-react';

const C = {
  bg:     '#0a1628',
  border: '#1e3a5f',
  accent: '#4a9eff',
  text:   '#7a9cc4',
  gold:   '#C4922A',
  panel:  '#0d1f35',
  border2:'#2a4f7a',
};

export function BitsHeader() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <header style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}
      className="flex items-center justify-between px-5 py-3 flex-shrink-0">

      {/* BITS Pilani brand */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: 'radial-gradient(circle at 35% 35%, #8B1A1A 0%, #C4922A 45%, #1a3a6b 100%)',
            border: `2px solid ${C.gold}88`,
            boxShadow: `0 0 16px ${C.gold}33`,
          }}>
          <span className="text-white font-black text-[10px]">BITS</span>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-white font-extrabold text-xl leading-none">BITS</span>
            <span className="font-extrabold text-xl leading-none" style={{ color: C.gold }}>Pilani</span>
          </div>
          <p className="text-xs leading-tight mt-0.5" style={{ color: C.text }}>
            Pilani | Dubai | Goa | Hyderabad | Mumbai
          </p>
          <p className="text-[9px] font-bold uppercase tracking-widest mt-0.5" style={{ color: C.gold }}>
            Work Integrated Learning Programmes
          </p>
        </div>
      </div>

      {/* Title */}
      <div className="text-center">
        <h1 className="text-xl font-bold text-white tracking-wide">SAP S/4 HANA AI Analytics Assistant</h1>
        <p className="text-sm font-medium mt-0.5" style={{ color: C.accent }}>
          Intelligent Insights. Real-time Decisions.
        </p>
      </div>

      {/* DateTime + User */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 text-sm" style={{ color: C.text }}>
          <div className="flex items-center gap-1.5">
            <Clock size={14} style={{ color: C.accent }} />
            <span className="font-mono text-white font-medium">{time}</span>
          </div>
          <div className="w-px h-4" style={{ background: C.border }} />
          <div className="flex items-center gap-1.5">
            <Calendar size={14} style={{ color: C.accent }} />
            <span>{date}</span>
          </div>
        </div>
        <button
          style={{ background: C.panel, border: `1px solid ${C.border2}` }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)' }}>
            AD
          </div>
          <span className="text-sm text-white font-medium">Admin User</span>
          <ChevronDown size={14} style={{ color: C.text }} />
        </button>
      </div>
    </header>
  );
}
