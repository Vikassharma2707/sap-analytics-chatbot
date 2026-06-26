"""
Unit tests for the analytics pipeline components.
SAP OData calls are mocked so tests run without a live SAP system.
"""

import pytest
import pandas as pd
from unittest.mock import AsyncMock, patch

from app.services.analytics.engine import (
    aggregate, trend_analysis, abc_analysis, kpi_summary, ageing_buckets
)
from app.services.visualization.chart_builder import build_chart
from app.services.ai.intent_engine import AnalyticsIntent


SAMPLE_RECORDS = [
    {"Customer": "ACME Corp", "NetAmount": 150000.0, "Currency": "USD"},
    {"Customer": "Beta Ltd", "NetAmount": 89000.0, "Currency": "USD"},
    {"Customer": "Gamma Inc", "NetAmount": 210000.0, "Currency": "USD"},
    {"Customer": "Delta LLC", "NetAmount": 45000.0, "Currency": "USD"},
]

TREND_RECORDS = [
    {"PostingDate": "2024-01-15", "Amount": 10000.0},
    {"PostingDate": "2024-02-20", "Amount": 15000.0},
    {"PostingDate": "2024-03-10", "Amount": 12000.0},
]


def test_aggregate_basic():
    df = aggregate(SAMPLE_RECORDS, ["Customer"], ["NetAmount"])
    assert len(df) == 4
    assert "NetAmount" in df.columns


def test_aggregate_ranking():
    df = aggregate(SAMPLE_RECORDS, ["Customer"], ["NetAmount"], ranking=2)
    assert len(df) == 2
    assert df.iloc[0]["NetAmount"] >= df.iloc[1]["NetAmount"]


def test_trend_analysis():
    df = trend_analysis(TREND_RECORDS, "PostingDate", "Amount", freq="M")
    assert "period" in df.columns
    assert "value" in df.columns
    assert len(df) == 3


def test_kpi_summary():
    import pandas as pd
    df = pd.DataFrame(SAMPLE_RECORDS)
    kpis = kpi_summary(df, ["NetAmount"])
    assert "NetAmount" in kpis
    assert kpis["NetAmount"]["total"] == pytest.approx(494000.0)
    assert kpis["NetAmount"]["count"] == 4


def test_abc_analysis():
    import pandas as pd
    df = pd.DataFrame(SAMPLE_RECORDS)
    result = abc_analysis(df, "NetAmount", "Customer")
    assert "abc_class" in result.columns
    assert result.iloc[0]["NetAmount"] >= result.iloc[1]["NetAmount"]


def test_ageing_buckets():
    import pandas as pd
    from datetime import date, timedelta
    today = date.today()
    records = [
        {"InvoiceDate": (today - timedelta(days=10)).isoformat(), "Amount": 1000.0},
        {"InvoiceDate": (today - timedelta(days=45)).isoformat(), "Amount": 2000.0},
        {"InvoiceDate": (today - timedelta(days=200)).isoformat(), "Amount": 3000.0},
    ]
    df = pd.DataFrame(records)
    result = ageing_buckets(df, "InvoiceDate", "Amount")
    assert "bucket" in result.columns
    assert len(result) >= 2


def test_chart_builder():
    import pandas as pd
    intent = AnalyticsIntent(
        intent_id="top_customers",
        module="SD",
        business_object="Customer",
        measure="NetAmount",
        dimensions=["Customer"],
        confidence=0.9,
    )
    df = pd.DataFrame(SAMPLE_RECORDS)
    chart = build_chart(df, intent, "Customer", "NetAmount", title="Test Chart")
    assert "series" in chart
    assert chart["series"][0]["type"] in ("bar", "pie", "line")


@pytest.mark.asyncio
async def test_pipeline_mock():
    """End-to-end pipeline test with mocked SAP and LLM calls."""
    mock_intent = AnalyticsIntent(
        intent_id="top_customers",
        module="SD",
        business_object="Customer",
        measure="NetAmount",
        dimensions=["Customer"],
        ranking=5,
        confidence=0.95,
    )
    mock_insights = {
        "summary": "Top customers analysis complete.",
        "key_insights": ["ACME Corp leads with $210K"],
        "recommendations": ["Focus on retaining top 5 customers."],
        "alerts": [],
    }

    with patch("app.services.ai.intent_engine.parse_intent", new=AsyncMock(return_value=mock_intent)), \
         patch("app.services.sap.odata_client.SAPODataClient.paginate_all", new=AsyncMock(return_value=SAMPLE_RECORDS)), \
         patch("app.services.ai.insight_generator.generate_insights", new=AsyncMock(return_value=mock_insights)), \
         patch("app.services.ai.insight_generator.generate_followup_questions", new=AsyncMock(return_value=["Q1", "Q2"])):

        from app.services.ai.orchestrator import run_pipeline
        result = await run_pipeline("Show top customers by revenue")

    assert result["intent"] is not None
    assert result["analytics"] is not None
    assert result["insights"]["summary"] == "Top customers analysis complete."
    assert len(result["followup_questions"]) == 2
