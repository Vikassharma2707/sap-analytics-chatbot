"""
AI Intent Engine — uses LLM to parse user natural language into a structured
AnalyticsIntent that drives CDS view selection and OData query planning.
"""

from __future__ import annotations
from typing import Optional, Any
from pydantic import BaseModel, Field
import json
import structlog

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from app.core.config import settings

log = structlog.get_logger()


class DateRange(BaseModel):
    type: str = Field(description="current_year|current_month|last_year|last_month|last_n_days|custom|ytd|qtd")
    from_date: Optional[str] = None   # ISO 8601
    to_date: Optional[str] = None
    n_days: Optional[int] = None


class AnalyticsIntent(BaseModel):
    intent_id: str = Field(description="Canonical intent from the known intent list")
    module: str = Field(description="SAP module: SD|FI|MM|PP|PM|HR")
    business_object: str = Field(description="Primary business object e.g. Customer, Vendor")
    measure: str = Field(description="What to measure e.g. Revenue, Quantity, Amount")
    dimensions: list[str] = Field(description="Group-by fields e.g. Customer, Material, Region")
    filters: dict[str, Any] = Field(default_factory=dict, description="Filter values e.g. {CompanyCode: '1000'}")
    date_range: Optional[DateRange] = None
    ranking: Optional[int] = Field(None, description="Top N ranking e.g. 10 for top 10")
    aggregation: str = Field(default="sum", description="sum|avg|count|max|min")
    sort_direction: str = Field(default="desc")
    chart_type_hint: Optional[str] = Field(None, description="bar|line|pie|donut|scatter|treemap|heatmap|gauge|waterfall")
    comparison: Optional[str] = Field(None, description="yoy|mom|qoq|budget_vs_actual")
    drill_context: Optional[dict] = Field(None, description="Context from previous turn for drill-down")
    follow_up_suggestions: list[str] = Field(default_factory=list)
    confidence: float = Field(default=0.9)


SYSTEM_PROMPT = """You are an SAP S/4HANA Analytics AI assistant that converts natural language business questions into structured analytics intents.

Available intent IDs:
sales_by_customer, sales_trend, yoy_sales, top_customers, top_products, sales_by_region, sales_order_pipeline,
open_vendor_invoices, vendor_ageing, accounts_receivable, cash_flow, revenue_by_company, cost_center_spend, gl_analytics,
po_pending_approval, spend_by_vendor, purchase_trend,
current_stock, inventory_ageing, stock_movements,
production_orders, yield_analysis, cost_variance

Available SAP modules: SD (Sales), FI (Finance), MM (Procurement/Inventory), PP (Production), HR

Rules:
- Always return valid JSON matching the AnalyticsIntent schema
- Infer date ranges from natural language (e.g. "this year" → current_year, "last quarter" → custom range)
- Infer ranking from phrases like "top 10", "top five", "highest", "best"
- Suggest 3 relevant follow-up questions based on the intent
- Set chart_type_hint based on the intent (time series→line, top N→bar, mix→pie)
- confidence should reflect how certain you are about the intent (0.0–1.0)
"""


def _get_llm():
    if settings.LLM_PROVIDER == "gemini":
        return ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0,
            convert_system_message_to_human=True,
        )
    elif settings.LLM_PROVIDER == "azure_openai":
        from langchain_openai import AzureChatOpenAI
        return AzureChatOpenAI(
            azure_deployment=settings.AZURE_OPENAI_DEPLOYMENT,
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version=settings.AZURE_OPENAI_API_VERSION,
        )
    return ChatOpenAI(
        model=settings.OPENAI_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0,
    )


async def parse_intent(
    user_message: str,
    conversation_history: list[dict] | None = None,
    drill_context: dict | None = None,
) -> AnalyticsIntent:
    """Parse user NL query into a structured AnalyticsIntent."""
    llm = _get_llm()

    context_block = ""
    if conversation_history:
        recent = conversation_history[-4:]
        context_block = "\n\nConversation context:\n" + "\n".join(
            f"{m['role'].upper()}: {m['content'][:300]}" for m in recent
        )
    if drill_context:
        context_block += f"\n\nDrill-down context: {json.dumps(drill_context)}"

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(
            content=f"Convert this to an AnalyticsIntent JSON:\n\n{user_message}{context_block}\n\n"
                    "Return ONLY valid JSON, no markdown fences."
        ),
    ]

    response = await llm.ainvoke(messages)
    raw = response.content.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        data = json.loads(raw)
        intent = AnalyticsIntent(**data)
        log.info("intent_parsed", intent_id=intent.intent_id, module=intent.module)
        return intent
    except Exception as exc:
        log.error("intent_parse_failed", error=str(exc), raw=raw[:500])
        # Return a safe default so the pipeline doesn't crash
        return AnalyticsIntent(
            intent_id="gl_analytics",
            module="FI",
            business_object="GL Account",
            measure="Amount",
            dimensions=["GLAccount"],
            confidence=0.3,
        )
