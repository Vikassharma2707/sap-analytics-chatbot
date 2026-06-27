'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, DollarSign, ShoppingCart, Package, Factory,
  Sparkles, Database, Zap, BarChart2, ArrowRight,
} from 'lucide-react';
import type { SuggestionCategory } from '@/types';
import { chatApi } from '@/services/api';

const ICONS: Record<string, React.ReactNode> = {
  trending_up: <TrendingUp size={15} />,
  account_balance: <DollarSign size={15} />,
  shopping_cart: <ShoppingCart size={15} />,
  inventory_2: <Package size={15} />,
  factory: <Factory size={15} />,
};

const CAT_COLORS: Record<number, string> = {
  0: 'from-blue-600 to-blue-400',
  1: 'from-violet-600 to-violet-400',
  2: 'from-emerald-600 to-emerald-400',
  3: 'from-amber-600 to-amber-400',
  4: 'from-rose-600 to-rose-400',
};

const STATS = [
  { label: 'CDS Views', value: '40+', icon: <Database size={14} /> },
  { label: 'Analytics', value: 'Real-time', icon: <Zap size={14} /> },
  { label: 'Modules', value: 'FI · MM · SD', icon: <BarChart2 size={14} /> },
];

interface Props {
  onSelect: (prompt: string) => void;
}

export function SuggestionPrompts({ onSelect }: Props) {
  const [categories, setCategories] = useState<SuggestionCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState(0);

  useEffect(() => {
    chatApi.getSuggestions().then((res) => setCategories(res.suggestions)).catch(() => {});
  }, []);

  const cat = categories[activeCategory];

  return (
    <div className="flex flex-col items-center min-h-full px-4 py-10">

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-8 max-w-xl"
      >
        {/* Icon badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
          bg-blue-950 border border-blue-800 text-blue-400 text-xs font-medium mb-5">
          <Sparkles size={12} />
          Powered by Gemini AI · SAP S/4HANA
        </div>

        <h1 className="text-4xl font-bold text-white tracking-tight mb-3">
          Your SAP Analytics<br />
          <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
            Intelligence Layer
          </span>
        </h1>
        <p className="text-gray-400 text-base leading-relaxed">
          Ask questions about financials, procurement, inventory, or sales
          in plain English — get charts, KPIs, and insights instantly.
        </p>
      </motion.div>

      {/* Stats strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="flex gap-4 mb-8"
      >
        {STATS.map((s) => (
          <div key={s.label}
            className="flex items-center gap-2 px-4 py-2 rounded-xl
              bg-gray-900 border border-gray-800 text-sm">
            <span className="text-blue-400">{s.icon}</span>
            <span className="text-white font-semibold">{s.value}</span>
            <span className="text-gray-500">{s.label}</span>
          </div>
        ))}
      </motion.div>

      {/* Category tabs */}
      {categories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
          className="w-full max-w-2xl"
        >
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 text-center">
            Explore by module
          </p>
          <div className="flex flex-wrap gap-2 justify-center mb-5">
            {categories.map((c, i) => (
              <button
                key={c.category}
                onClick={() => setActiveCategory(i)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium
                  transition-all duration-200 border
                  ${i === activeCategory
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40'
                    : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'}`}
              >
                <span className={i === activeCategory ? 'text-white' : 'text-gray-500'}>
                  {ICONS[c.icon] || null}
                </span>
                {c.category}
              </button>
            ))}
          </div>

          {/* Prompt cards */}
          {cat && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {cat.prompts.map((prompt, idx) => (
                <motion.button
                  key={prompt}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => onSelect(prompt)}
                  className="group text-left px-4 py-3.5 bg-gray-900 border border-gray-800
                    rounded-xl text-sm text-gray-300 hover:bg-gray-800 hover:border-blue-700
                    hover:text-white transition-all duration-150 flex items-start justify-between gap-3"
                >
                  <span>{prompt}</span>
                  <ArrowRight size={14}
                    className="flex-shrink-0 mt-0.5 text-gray-600 group-hover:text-blue-400 transition-colors" />
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Bottom hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-10 text-xs text-gray-600"
      >
        Connected to SAP S/4HANA · Read-only · All data is live
      </motion.p>
    </div>
  );
}
