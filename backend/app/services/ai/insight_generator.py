"""
Insight Generator — uses LLM to convert analytical results into executive-level
business narrative, KPI bullets, and actionable recommendations.
"""

from __future__ import annotations
import json
from typing import Any
import structlog

from langchain_core.messages import HumanMessage, SystemMessage

from app.services.ai.intent_engine import AnalyticsIntent, _get_llm

log = structlog.get_logger()

INSIGHT_SYSTEM_PROMPT = """You are an executive business analyst assistant for SAP S/4HANA.
Given structured analytical data, generate:
1. A concise executive summary (2-3 sentences)
2. 3-5 key bullet-point insights (start each with a metric or %)
3. 2-3 actionable recommendations
4. Root cause observations if performance is declining

Rules:
- Use business language, not technical SAP terminology
- Include specific numbers and percentages from the data
- Highlight anomalies, top performers, and concerns
- Keep the tone professional and data-driven
- Return JSON in this exact format:
{
  "summary": "...",
  "key_insights": ["...", "..."],
  "recommendations": ["...", "..."],
  "alerts": ["..."],  // only if there are concerns
  "root_causes": ["..."]  // only if performance is declining
}
"""


async def generate_insights(
    intent: AnalyticsIntent,
    analytics_results: dict[str, Any],
    kpis: dict[str, Any],
    user_question: str,
) -> dict[str, Any]:
    llm = _get_llm()

    data_summary = {
        "user_question": user_question,
        "intent": intent.intent_id,
        "module": intent.module,
        "measure": intent.measure,
        "kpis": kpis,
        "record_count": analytics_results.get("record_count", 0),
        "top_records": analytics_results.get("records", [])[:10],
    }

    messages = [
        SystemMessage(content=INSIGHT_SYSTEM_PROMPT),
        HumanMessage(
            content=f"Generate insights for this SAP analytics result:\n\n"
                    f"{json.dumps(data_summary, default=str, indent=2)}\n\n"
                    "Return ONLY valid JSON, no markdown."
        ),
    ]

    response = await llm.ainvoke(messages)
    raw = response.content.strip().lstrip("```json").lstrip("```").rstrip("```").strip()

    try:
        return json.loads(raw)
    except Exception as exc:
        log.error("insight_parse_failed", error=str(exc))
        return {
            "summary": f"Analysis of {intent.measure} by {intent.business_object} completed.",
            "key_insights": [f"Total records analyzed: {analytics_results.get('record_count', 0)}"],
            "recommendations": ["Review the data for actionable patterns."],
            "alerts": [],
        }


async def generate_followup_questions(
    intent: AnalyticsIntent,
    current_question: str,
) -> list[str]:
    llm = _get_llm()
    prompt = (
        f"Given that the user asked: '{current_question}'\n"
        f"Intent: {intent.intent_id}, Module: {intent.module}\n"
        "Suggest exactly 3 natural follow-up questions a business user might ask next. "
        "Return as a JSON array of strings only."
    )
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    raw = response.content.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
    try:
        questions = json.loads(raw)
        return questions[:3] if isinstance(questions, list) else []
    except Exception:
        return [
            f"Compare {intent.measure} with last year",
            f"Show {intent.measure} by region",
            f"What are the top 5 by {intent.measure}?",
        ]
