'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, ShoppingCart, Package, Factory } from 'lucide-react';
import type { SuggestionCategory } from '@/types';
import { chatApi } from '@/services/api';

const ICONS: Record<string, React.ReactNode> = {
  trending_up: <TrendingUp size={16} />,
  account_balance: <DollarSign size={16} />,
  shopping_cart: <ShoppingCart size={16} />,
  inventory_2: <Package size={16} />,
  factory: <Factory size={16} />,
};

interface Props {
  onSelect: (prompt: string) => void;
}

export function SuggestionPrompts({ onSelect }: Props) {
  const [categories, setCategories] = useState<SuggestionCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState(0);

  useEffect(() => {
    chatApi.getSuggestions().then((res) => setCategories(res.suggestions)).catch(() => {});
  }, []);

  if (!categories.length) return null;
  const cat = categories[activeCategory];

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4 max-w-2xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-white mb-1">SAP Analytics Assistant</h2>
        <p className="text-gray-400 text-sm">Ask questions about your SAP S/4HANA data in plain English</p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 justify-center">
        {categories.map((c, i) => (
          <button
            key={c.category}
            onClick={() => setActiveCategory(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors
              ${i === activeCategory
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-gray-200'}`}
          >
            {ICONS[c.icon] || null}
            {c.category}
          </button>
        ))}
      </div>

      {/* Prompts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
        {cat.prompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSelect(prompt)}
            className="text-left px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl
              text-sm text-gray-300 hover:bg-gray-700 hover:border-blue-600 hover:text-white
              transition-all duration-150"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
