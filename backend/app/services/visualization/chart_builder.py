"""
Chart Builder — determines the best chart type and generates ECharts-compatible
JSON option objects to be rendered in the React frontend.
"""

from __future__ import annotations
import pandas as pd
from typing import Any, Optional
import structlog

from app.services.ai.intent_engine import AnalyticsIntent

log = structlog.get_logger()

CHART_TYPE_RULES: dict[str, str] = {
    "sales_trend":      "line",
    "purchase_trend":   "line",
    "inventory_ageing": "bar",
    "vendor_ageing":    "bar",
    "top_customers":    "bar_horizontal",
    "top_products":     "bar_horizontal",
    "spend_by_vendor":  "bar_horizontal",
    "yoy_sales":        "grouped_bar",
    "sales_by_region":  "pie",
    "revenue_by_company": "pie",
    "cost_center_spend": "treemap",
    "production_orders": "gauge",
    "cash_flow":         "waterfall",
    "accounts_receivable": "bar",
    "current_stock":     "bar",
    "yield_analysis":    "line",
    "cost_variance":     "waterfall",
    "sales_by_customer": "bar_horizontal",
    "po_pending_approval": "bar",
    "stock_movements":   "line",
    "gl_analytics":      "bar",
    "open_vendor_invoices": "bar",
    "sales_order_pipeline": "funnel",
}

COLORS = ["#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de",
          "#3ba272", "#fc8452", "#9a60b4", "#ea7ccc"]


def _determine_chart_type(intent: AnalyticsIntent) -> str:
    if intent.chart_type_hint:
        return intent.chart_type_hint
    return CHART_TYPE_RULES.get(intent.intent_id, "bar")


def build_chart(
    df: pd.DataFrame,
    intent: AnalyticsIntent,
    label_col: str,
    value_col: str,
    secondary_value_col: Optional[str] = None,
    title: Optional[str] = None,
) -> dict[str, Any]:
    if df.empty:
        return {}

    chart_type = _determine_chart_type(intent)
    chart_title = title or f"{intent.measure} by {intent.business_object}"
    labels = df[label_col].astype(str).tolist()
    values = df[value_col].tolist()

    handlers = {
        "bar": _bar,
        "bar_horizontal": _bar_horizontal,
        "line": _line,
        "pie": _pie,
        "donut": _donut,
        "grouped_bar": _grouped_bar,
        "treemap": _treemap,
        "waterfall": _waterfall,
        "funnel": _funnel,
        "gauge": _gauge,
    }
    builder = handlers.get(chart_type, _bar)

    if chart_type in ("grouped_bar",) and secondary_value_col:
        return builder(labels, values, df[secondary_value_col].tolist(), chart_title, value_col, secondary_value_col)

    return builder(labels, values, chart_title, value_col)


def _bar(labels, values, title, value_label):
    return {
        "title": {"text": title, "left": "center"},
        "tooltip": {"trigger": "axis"},
        "xAxis": {"type": "category", "data": labels, "axisLabel": {"rotate": 30}},
        "yAxis": {"type": "value", "name": value_label},
        "series": [{"type": "bar", "data": values, "itemStyle": {"color": COLORS[0]},
                    "label": {"show": False}}],
        "grid": {"containLabel": True},
    }


def _bar_horizontal(labels, values, title, value_label):
    return {
        "title": {"text": title, "left": "center"},
        "tooltip": {"trigger": "axis", "axisPointer": {"type": "shadow"}},
        "xAxis": {"type": "value", "name": value_label},
        "yAxis": {"type": "category", "data": labels[::-1]},
        "series": [{"type": "bar", "data": values[::-1],
                    "itemStyle": {"color": COLORS[0]},
                    "label": {"show": True, "position": "right"}}],
        "grid": {"left": "20%", "containLabel": True},
    }


def _line(labels, values, title, value_label):
    return {
        "title": {"text": title, "left": "center"},
        "tooltip": {"trigger": "axis"},
        "xAxis": {"type": "category", "data": labels, "boundaryGap": False},
        "yAxis": {"type": "value", "name": value_label},
        "series": [{"type": "line", "data": values, "smooth": True, "areaStyle": {"opacity": 0.2},
                    "itemStyle": {"color": COLORS[0]}}],
        "grid": {"containLabel": True},
    }


def _pie(labels, values, title, value_label):
    data = [{"name": l, "value": v} for l, v in zip(labels, values)]
    return {
        "title": {"text": title, "left": "center"},
        "tooltip": {"trigger": "item", "formatter": "{b}: {c} ({d}%)"},
        "legend": {"orient": "vertical", "left": "left"},
        "series": [{"type": "pie", "radius": "60%",
                    "data": data, "emphasis": {"itemStyle": {"shadowBlur": 10}}}],
    }


def _donut(labels, values, title, value_label):
    data = [{"name": l, "value": v} for l, v in zip(labels, values)]
    return {
        "title": {"text": title, "left": "center", "subtext": "Distribution"},
        "tooltip": {"trigger": "item"},
        "legend": {"orient": "vertical", "left": "left"},
        "series": [{"type": "pie", "radius": ["40%", "70%"], "data": data,
                    "emphasis": {"itemStyle": {"shadowBlur": 10}}}],
    }


def _grouped_bar(labels, cy_values, py_values, title, cy_label, py_label):
    return {
        "title": {"text": title, "left": "center"},
        "tooltip": {"trigger": "axis"},
        "legend": {"data": [cy_label, py_label]},
        "xAxis": {"type": "category", "data": labels, "axisLabel": {"rotate": 30}},
        "yAxis": {"type": "value"},
        "series": [
            {"name": cy_label, "type": "bar", "data": cy_values, "itemStyle": {"color": COLORS[0]}},
            {"name": py_label, "type": "bar", "data": py_values, "itemStyle": {"color": COLORS[1]}},
        ],
        "grid": {"containLabel": True},
    }


def _treemap(labels, values, title, value_label):
    data = [{"name": l, "value": v} for l, v in zip(labels, values)]
    return {
        "title": {"text": title, "left": "center"},
        "tooltip": {"formatter": "{b}: {c}"},
        "series": [{"type": "treemap", "data": data,
                    "label": {"show": True, "formatter": "{b}\n{c}"}}],
    }


def _waterfall(labels, values, title, value_label):
    positive = [max(v, 0) for v in values]
    negative = [abs(min(v, 0)) for v in values]
    return {
        "title": {"text": title, "left": "center"},
        "tooltip": {"trigger": "axis"},
        "xAxis": {"type": "category", "data": labels},
        "yAxis": {"type": "value"},
        "series": [
            {"type": "bar", "stack": "total", "data": positive, "itemStyle": {"color": COLORS[2]}},
            {"type": "bar", "stack": "total", "data": negative,
             "itemStyle": {"color": COLORS[3]}},
        ],
    }


def _funnel(labels, values, title, value_label):
    data = [{"name": l, "value": v} for l, v in zip(labels, values)]
    return {
        "title": {"text": title, "left": "center"},
        "tooltip": {"trigger": "item"},
        "series": [{"type": "funnel", "data": sorted(data, key=lambda x: x["value"], reverse=True)}],
    }


def _gauge(labels, values, title, value_label):
    val = values[0] if values else 0
    return {
        "title": {"text": title, "left": "center"},
        "series": [{
            "type": "gauge",
            "detail": {"formatter": "{value}%"},
            "data": [{"value": round(val, 1), "name": labels[0] if labels else ""}],
        }],
    }
