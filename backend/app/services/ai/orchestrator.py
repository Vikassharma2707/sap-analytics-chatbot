"""
AI Orchestration Layer (LangGraph) — the main pipeline that:
  1. Parses intent
  2. Selects CDS views
  3. Plans OData queries
  4. Fetches SAP data
  5. Runs analytics
  6. Builds charts
  7. Generates insights
  8. Returns a ChatResponse
"""

from __future__ import annotations
import time
import asyncio
from typing import TypedDict, Optional, Any, Annotated
import structlog
import operator

from langgraph.graph import StateGraph, END

from app.services.ai.intent_engine import parse_intent, AnalyticsIntent
from app.services.ai.query_planner import build_odata_params, get_configs_for_intent
from app.services.ai.insight_generator import generate_insights, generate_followup_questions
from app.services.sap.odata_client import get_sap_client
from app.services.sap.cds_registry import CDSViewConfig
from app.services.analytics.engine import (
    aggregate, trend_analysis, yoy_comparison, ageing_buckets,
    kpi_summary, df_to_records, abc_analysis,
)
from app.services.visualization.chart_builder import build_chart

log = structlog.get_logger()


class PipelineState(TypedDict):
    user_message: str
    conversation_history: list[dict]
    drill_context: Optional[dict]
    intent: Optional[AnalyticsIntent]
    cds_configs: list[CDSViewConfig]
    query_params: list[dict]
    raw_records: list[list[dict]]
    analytics_result: Optional[dict]
    chart_data: Optional[dict]
    insights: Optional[dict]
    followup_questions: list[str]
    error: Optional[str]
    execution_steps: Annotated[list[str], operator.add]


# ── Node: Parse Intent ────────────────────────────────────────────────────────
async def node_parse_intent(state: PipelineState) -> PipelineState:
    try:
        intent = await parse_intent(
            state["user_message"],
            state.get("conversation_history"),
            state.get("drill_context"),
        )
        return {**state, "intent": intent, "execution_steps": ["intent_parsed"]}
    except Exception as exc:
        log.error("node_parse_intent_failed", error=str(exc))
        return {**state, "error": f"Intent parsing failed: {exc}", "execution_steps": ["intent_failed"]}


# ── Node: Select CDS Views ────────────────────────────────────────────────────
async def node_select_cds(state: PipelineState) -> PipelineState:
    if state.get("error") or not state.get("intent"):
        return state
    configs = get_configs_for_intent(state["intent"])
    if not configs:
        return {**state, "error": "No CDS view found for this intent.", "execution_steps": ["cds_not_found"]}
    params = [build_odata_params(state["intent"], cfg) for cfg in configs]
    return {**state, "cds_configs": configs, "query_params": params, "execution_steps": ["cds_selected"]}


# ── Node: Fetch SAP Data ──────────────────────────────────────────────────────
async def node_fetch_data(state: PipelineState) -> PipelineState:
    if state.get("error"):
        return state
    client = get_sap_client()
    all_records: list[list[dict]] = []
    try:
        tasks = [
            client.paginate_all(
                config=cfg,
                filters=params.get("filters"),
                select=params.get("select"),
                orderby=params.get("orderby"),
                apply=params.get("apply"),
            )
            for cfg, params in zip(state["cds_configs"], state["query_params"])
        ]
        results = await asyncio.gather(*tasks)
        all_records = list(results)
        log.info("sap_data_fetched", record_counts=[len(r) for r in all_records])
        return {**state, "raw_records": all_records, "execution_steps": ["data_fetched"]}
    except Exception as exc:
        log.error("node_fetch_data_failed", error=str(exc))
        # Return mock data when SAP is not available (dev/demo mode)
        mock = _generate_mock_data(state["intent"], state["cds_configs"])
        return {**state, "raw_records": mock, "execution_steps": ["mock_data_used"],
                "error": None}


# ── Node: Run Analytics ───────────────────────────────────────────────────────
async def node_run_analytics(state: PipelineState) -> PipelineState:
    if state.get("error") or not state.get("raw_records"):
        return state
    intent = state["intent"]
    records = state["raw_records"][0] if state["raw_records"] else []
    cfg = state["cds_configs"][0] if state["cds_configs"] else None

    if not records or not cfg:
        return {**state, "analytics_result": {"records": [], "record_count": 0}, "execution_steps": ["no_data"]}

    # Determine analysis type
    if intent.comparison == "yoy" and len(state["raw_records"]) >= 2:
        import pandas as pd
        df = yoy_comparison(
            state["raw_records"][0], state["raw_records"][1],
            intent.dimensions, cfg.measure_fields[0] if cfg.measure_fields else "Amount"
        )
        result_records = df_to_records(df)
    elif "ageing" in intent.intent_id and cfg.date_fields:
        import pandas as pd
        import pandas
        from app.services.analytics.engine import _to_dataframe
        df = _to_dataframe(records)
        aged = ageing_buckets(df, cfg.date_fields[0], cfg.measure_fields[0] if cfg.measure_fields else "Amount")
        result_records = df_to_records(aged)
    elif "trend" in intent.intent_id and cfg.date_fields:
        import pandas as pd
        from app.services.analytics.engine import _to_dataframe
        df = _to_dataframe(records)
        trend_df = trend_analysis(df, cfg.date_fields[0], cfg.measure_fields[0] if cfg.measure_fields else "Amount")
        result_records = df_to_records(trend_df)
    else:
        df = aggregate(
            records,
            dimensions=intent.dimensions,
            measures=cfg.measure_fields,
            ranking=intent.ranking,
            sort_ascending=intent.sort_direction == "asc",
        )
        result_records = df_to_records(df)

    kpis = kpi_summary(
        __import__('pandas').DataFrame(records),
        cfg.measure_fields,
    ) if cfg.measure_fields else {}

    analytics_result = {
        "records": result_records,
        "record_count": len(result_records),
        "total_raw_records": len(records),
        "kpis": kpis,
        "dimensions": intent.dimensions,
        "measures": cfg.measure_fields,
    }
    return {**state, "analytics_result": analytics_result, "execution_steps": ["analytics_done"]}


# ── Node: Build Chart ─────────────────────────────────────────────────────────
async def node_build_chart(state: PipelineState) -> PipelineState:
    if state.get("error") or not state.get("analytics_result"):
        return state
    intent = state["intent"]
    result = state["analytics_result"]
    records = result.get("records", [])
    dims = result.get("dimensions", [])
    measures = result.get("measures", [])

    if not records or not dims or not measures:
        return {**state, "chart_data": None, "execution_steps": ["no_chart"]}

    import pandas as pd
    df = pd.DataFrame(records)
    label_col = dims[0] if dims[0] in df.columns else df.columns[0]
    value_col = measures[0] if measures[0] in df.columns else df.columns[-1]

    chart = build_chart(df, intent, label_col, value_col)
    return {**state, "chart_data": chart, "execution_steps": ["chart_built"]}


# ── Node: Generate Insights ───────────────────────────────────────────────────
async def node_generate_insights(state: PipelineState) -> PipelineState:
    if state.get("error") or not state.get("analytics_result"):
        return state
    try:
        insights, followups = await asyncio.gather(
            generate_insights(
                state["intent"],
                state["analytics_result"],
                state["analytics_result"].get("kpis", {}),
                state["user_message"],
            ),
            generate_followup_questions(state["intent"], state["user_message"]),
        )
        return {**state, "insights": insights, "followup_questions": followups,
                "execution_steps": ["insights_generated"]}
    except Exception as exc:
        log.error("insight_generation_failed", error=str(exc))
        return {**state, "insights": {"summary": "Analysis complete.", "key_insights": [], "recommendations": []},
                "followup_questions": [], "execution_steps": ["insights_failed"]}


def _generate_mock_data(intent: Optional[AnalyticsIntent], configs: list[CDSViewConfig]) -> list[list[dict]]:
    """Return plausible mock records so the UI renders in demo mode."""
    import random
    if not intent or not configs:
        return [[]]
    cfg = configs[0]
    dim = intent.dimensions[0] if intent.dimensions else "Category"
    measure = cfg.measure_fields[0] if cfg.measure_fields else "Amount"
    mock_dims = [f"Item {chr(65 + i)}" for i in range(10)]
    records = [
        {dim: d, measure: round(random.uniform(10000, 500000), 2), "Currency": "USD"}
        for d in mock_dims
    ]
    return [records]


# ── Build the LangGraph ───────────────────────────────────────────────────────
def build_graph() -> StateGraph:
    graph = StateGraph(PipelineState)
    graph.add_node("parse_intent", node_parse_intent)
    graph.add_node("select_cds", node_select_cds)
    graph.add_node("fetch_data", node_fetch_data)
    graph.add_node("run_analytics", node_run_analytics)
    graph.add_node("build_chart", node_build_chart)
    graph.add_node("generate_insights", node_generate_insights)

    graph.set_entry_point("parse_intent")
    graph.add_edge("parse_intent", "select_cds")
    graph.add_edge("select_cds", "fetch_data")
    graph.add_edge("fetch_data", "run_analytics")
    graph.add_edge("run_analytics", "build_chart")
    graph.add_edge("build_chart", "generate_insights")
    graph.add_edge("generate_insights", END)

    return graph.compile()


_pipeline = None


def get_pipeline():
    global _pipeline
    if _pipeline is None:
        _pipeline = build_graph()
    return _pipeline


async def run_pipeline(
    user_message: str,
    conversation_history: list[dict] | None = None,
    drill_context: dict | None = None,
) -> dict[str, Any]:
    start = time.monotonic()
    pipeline = get_pipeline()

    initial_state: PipelineState = {
        "user_message": user_message,
        "conversation_history": conversation_history or [],
        "drill_context": drill_context,
        "intent": None,
        "cds_configs": [],
        "query_params": [],
        "raw_records": [],
        "analytics_result": None,
        "chart_data": None,
        "insights": None,
        "followup_questions": [],
        "error": None,
        "execution_steps": [],
    }

    final_state = await pipeline.ainvoke(initial_state)
    elapsed_ms = int((time.monotonic() - start) * 1000)

    return {
        "intent": final_state["intent"].model_dump() if final_state.get("intent") else None,
        "analytics": final_state.get("analytics_result"),
        "chart": final_state.get("chart_data"),
        "insights": final_state.get("insights"),
        "followup_questions": final_state.get("followup_questions", []),
        "cds_views_used": [c.cds_view for c in final_state.get("cds_configs", [])],
        "execution_steps": final_state.get("execution_steps", []),
        "execution_time_ms": elapsed_ms,
        "error": final_state.get("error"),
    }
