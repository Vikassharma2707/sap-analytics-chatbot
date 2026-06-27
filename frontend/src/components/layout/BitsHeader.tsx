'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Calendar, ChevronDown, User } from 'lucide-react';

export function BitsHeader() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <header className="flex items-center justify-between px-5 py-3 bg-[#0a1628] border-b border-[#1e3a5f]">
      {/* Left — BITS Pilani branding */}
      <div className="flex items-center gap-4">
        {/* Logo emblem placeholder — circular gradient matching BITS colors */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#8B1A1A] via-[#C4922A] to-[#1a3a6b]
          flex items-center justify-center border-2 border-[#C4922A]/60 shadow-lg shadow-[#C4922A]/20 flex-shrink-0">
          <span className="text-white text-[10px] font-bold text-center leading-tight">BITS</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-lg leading-none">BITS</span>
            <span className="text-[#C4922A] font-bold text-lg leading-none">Pilani</span>
          </div>
          <p className="text-[10px] text-[#7a9cc4] leading-none mt-0.5">
            Pilani | Dubai | Goa | Hyderabad | Mumbai
          </p>
          <p className="text-[9px] font-semibold text-[#C4922A] uppercase tracking-widest mt-0.5">
            Work Integrated Learning Programmes
          </p>
        </div>
      </div>

      {/* Center — App title */}
      <div className="text-center">
        <h1 className="text-xl font-bold text-white tracking-wide">
          SAP S/4 HANA AI Analytics Assistant
        </h1>
        <p className="text-sm text-[#4a9eff] font-medium mt-0.5">
          Intelligent Insights. Real-time Decisions.
        </p>
      </div>

      {/* Right — datetime + user */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3 text-sm text-[#7a9cc4]">
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-[#4a9eff]" />
            <span className="font-mono text-white">{time}</span>
          </div>
          <div className="w-px h-4 bg-[#1e3a5f]" />
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="text-[#4a9eff]" />
            <span>{date}</span>
          </div>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg
          bg-[#1e3a5f] border border-[#2a4f7a] hover:bg-[#244569] transition-colors">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-500
            flex items-center justify-center text-xs font-bold text-white">
            AD
          </div>
          <span className="text-sm text-white font-medium">Admin User</span>
          <ChevronDown size={14} className="text-[#7a9cc4]" />
        </button>
      </div>
    </header>
  );
}
