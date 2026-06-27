'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Calendar, ChevronDown } from 'lucide-react';

export function BitsHeader() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <header className="flex items-center justify-between px-5 py-3 bg-bits-deep border-b border-bits-border">
      {/* Left — BITS Pilani branding */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 flex-shrink-0 shadow-lg"
          style={{ background: 'radial-gradient(circle at 40% 40%, #8B1A1A, #C4922A 50%, #1a3a6b)', borderColor: '#C4922A66' }}>
          <span className="text-white text-[9px] font-bold leading-tight text-center">BITS</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-xl leading-none">BITS</span>
            <span className="font-bold text-xl leading-none text-bits-gold">Pilani</span>
          </div>
          <p className="text-[10px] text-bits-text leading-none mt-0.5">
            Pilani | Dubai | Goa | Hyderabad | Mumbai
          </p>
          <p className="text-[9px] font-semibold text-bits-gold uppercase tracking-widest mt-0.5">
            Work Integrated Learning Programmes
          </p>
        </div>
      </div>

      {/* Center */}
      <div className="text-center">
        <h1 className="text-xl font-bold text-white tracking-wide">
          SAP S/4 HANA AI Analytics Assistant
        </h1>
        <p className="text-sm text-bits-accent font-medium mt-0.5">
          Intelligent Insights. Real-time Decisions.
        </p>
      </div>

      {/* Right */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3 text-sm text-bits-text">
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-bits-accent" />
            <span className="font-mono text-white">{time}</span>
          </div>
          <div className="w-px h-4 bg-bits-border" />
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="text-bits-accent" />
            <span>{date}</span>
          </div>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bits-panel border border-bits-border2 hover:bg-bits-hover transition-colors">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
            AD
          </div>
          <span className="text-sm text-white font-medium">Admin User</span>
          <ChevronDown size={14} className="text-bits-text" />
        </button>
      </div>
    </header>
  );
}
