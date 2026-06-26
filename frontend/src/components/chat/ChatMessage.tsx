'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { Bot, User, Download, ChevronDown, ChevronUp, Lightbulb, TrendingUp, AlertTriangle } from 'lucide-react';
import type { Message, ExportFormat } from '@/types';
import { ChartRenderer } from '@/components/charts/ChartRenderer';
import { KPICards } from '@/components/dashboard/KPICards';
import { DataTable } from '@/components/dashboard/DataTable';
import { chatApi } from '@/services/api';
import toast from 'react-hot-toast';

interface Props {
  message: Message;
  onFollowUp: (question: string) => void;
}

export function ChatMessage({ message, onFollowUp }: Props) {
  const [showData, setShowData] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const isUser = message.role === 'user';
  const result = message.result;

  const handleExport = async (format: ExportFormat) => {
    if (!result?.analytics) return;
    setExporting(format);
    try {
      const title = result.intent?.business_object
        ? `${result.intent.measure} by ${result.intent.business_object}`
        : 'SAP Analytics';
      const blob = await chatApi.exportData(
        format,
        title,
        result.analytics.records,
        result.analytics.kpis,
        result.insights ?? {}
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics.${format === 'excel' ? 'xlsx' : format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 mb-6 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center
        ${isUser ? 'bg-blue-600' : 'bg-gradient-to-br from-violet-600 to-blue-600'}`}>
        {isUser ? <User size={18} className="text-white" /> : <Bot size={18} className="text-white" />}
      </div>

      <div className={`flex-1 max-w-4xl ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-3`}>
        {/* Bubble */}
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed
          ${isUser
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : 'bg-gray-800 text-gray-100 rounded-tl-sm border border-gray-700'}`}>
          {message.isLoading ? (
            <div className="flex gap-1 py-1">
              {[0, 1, 2].map((i) => (
                <motion.div key={i} className="w-2 h-2 bg-gray-400 rounded-full"
                  animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, delay: i * 0.15, duration: 0.6 }} />
              ))}
            </div>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          )}
        </div>

        {/* Analytics Results */}
        {result && !result.error && (
          <div className="w-full space-y-4">
            {/* Intent Badge */}
            {result.intent && (
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 bg-violet-900/40 border border-violet-700 rounded-full text-violet-300">
                  {result.intent.module} · {result.intent.intent_id.replace(/_/g, ' ')}
                </span>
                {result.cds_views_used.map((v) => (
                  <span key={v} className="px-2 py-1 bg-gray-800 border border-gray-600 rounded-full text-gray-400">
                    {v}
                  </span>
                ))}
                <span className="px-2 py-1 bg-gray-800 border border-gray-600 rounded-full text-gray-500">
                  {result.execution_time_ms}ms
                </span>
              </div>
            )}

            {/* KPI Cards */}
            {result.analytics?.kpis && Object.keys(result.analytics.kpis).length > 0 && (
              <KPICards kpis={result.analytics.kpis} />
            )}

            {/* Chart */}
            {result.chart && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <ChartRenderer option={result.chart} height={320} />
              </div>
            )}

            {/* Insights */}
            {result.insights && (() => {
              const ins = result.insights;
              const alerts: string[] = ins.alerts ?? [];
              return (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
                {ins.summary && (
                  <p className="text-sm text-gray-200 leading-relaxed">{ins.summary}</p>
                )}
                {ins.key_insights.length > 0 && (
                  <div className="space-y-1.5">
                    {ins.key_insights.map((insight, i) => (
                      <div key={i} className="flex gap-2 text-sm text-gray-300">
                        <TrendingUp size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                )}
                {alerts.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-gray-700">
                    {alerts.map((alert, i) => (
                      <div key={i} className="flex gap-2 text-sm text-amber-300">
                        <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                        <span>{alert}</span>
                      </div>
                    ))}
                  </div>
                )}
                {ins.recommendations.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-gray-700">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Recommendations</p>
                    {ins.recommendations.map((rec, i) => (
                      <div key={i} className="flex gap-2 text-sm text-blue-300">
                        <Lightbulb size={14} className="mt-0.5 flex-shrink-0" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              );
            })()}

            {/* Data Table Toggle */}
            {result.analytics?.records && result.analytics.records.length > 0 && (
              <div>
                <button
                  onClick={() => setShowData(!showData)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {showData ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {showData ? 'Hide' : 'Show'} data ({result.analytics.record_count} rows)
                </button>
                {showData && (
                  <div className="mt-2">
                    <DataTable records={result.analytics.records} maxRows={20} />
                  </div>
                )}
              </div>
            )}

            {/* Export Buttons */}
            {result.analytics?.records && (
              <div className="flex gap-2">
                {(['excel', 'pdf', 'pptx'] as ExportFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => handleExport(fmt)}
                    disabled={exporting !== null}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600
                      border border-gray-600 rounded-lg text-gray-300 hover:text-white transition-colors
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download size={12} />
                    {exporting === fmt ? 'Exporting…' : fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            {/* Follow-up Suggestions */}
            {(result.followup_questions?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-gray-500 self-center">Ask:</span>
                {result.followup_questions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => onFollowUp(q)}
                    className="px-3 py-1.5 text-xs bg-blue-900/30 border border-blue-700/50
                      rounded-full text-blue-300 hover:bg-blue-800/40 hover:text-blue-200 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error state */}
        {result?.error && (
          <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-xl px-4 py-3">
            {result.error}
          </div>
        )}

        <span className="text-xs text-gray-600">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </motion.div>
  );
}
