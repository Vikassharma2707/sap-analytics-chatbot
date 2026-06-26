export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  result?: PipelineResult;
  isLoading?: boolean;
}

export interface PipelineResult {
  intent?: IntentData;
  analytics?: AnalyticsResult;
  chart?: EChartsOption;
  insights?: InsightData;
  followup_questions: string[];
  cds_views_used: string[];
  execution_steps: string[];
  execution_time_ms: number;
  error?: string;
}

export interface IntentData {
  intent_id: string;
  module: string;
  business_object: string;
  measure: string;
  dimensions: string[];
  ranking?: number;
  chart_type_hint?: string;
  confidence: number;
}

export interface AnalyticsResult {
  records: Record<string, unknown>[];
  record_count: number;
  total_raw_records: number;
  kpis: Record<string, KPIStats>;
  dimensions: string[];
  measures: string[];
}

export interface KPIStats {
  total: number;
  average: number;
  max: number;
  min: number;
  count: number;
}

export interface InsightData {
  summary: string;
  key_insights: string[];
  recommendations: string[];
  alerts?: string[];
  root_causes?: string[];
  [key: string]: unknown;
}

export interface EChartsOption {
  title?: { text: string; left?: string };
  tooltip?: unknown;
  xAxis?: unknown;
  yAxis?: unknown;
  series?: unknown[];
  legend?: unknown;
  grid?: unknown;
  [key: string]: unknown;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  messages: Message[];
}

export interface SuggestionCategory {
  category: string;
  icon: string;
  prompts: string[];
}

export type ExportFormat = 'excel' | 'pdf' | 'pptx';
