'use client';

import React from 'react';
import type { KPIStats } from '@/types';

interface Props {
  kpis: Record<string, KPIStats>;
}

const formatNum = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `${(n / 1_000).toFixed(1)}K`
    : n.toFixed(2);

export function KPICards({ kpis }: Props) {
  const entries = Object.entries(kpis).slice(0, 4);
  if (!entries.length) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {entries.map(([measure, stats]) => (
        <div
          key={measure}
          className="bg-gray-800 border border-gray-700 rounded-xl p-3 flex flex-col gap-1"
        >
          <p className="text-xs text-gray-400 truncate">{measure}</p>
          <p className="text-xl font-bold text-white">{formatNum(stats.total)}</p>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Avg: {formatNum(stats.average)}</span>
            <span>#{stats.count}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
