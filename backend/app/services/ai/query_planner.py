"""
Query Planner — translates an AnalyticsIntent into concrete OData query parameters
(filters, $select, $orderby, $apply) for the SAP OData Client.
"""

from __future__ import annotations
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from typing import Optional, Any
import structlog

from app.services.ai.intent_engine import AnalyticsIntent, DateRange
from app.services.sap.cds_registry import CDSViewConfig, get_cds_for_intent

log = structlog.get_logger()


def _current_fiscal_year() -> int:
    today = date.today()
    # SAP fiscal year typically = calendar year; adjust if your client differs
    return today.year


def _build_date_filter(field: str, date_range: DateRange) -> list[str]:
    today = date.today()
    filters: list[str] = []

    if date_range.type == "current_year":
        year = _current_fiscal_year()
        filters = [
            f"{field} ge datetime'{year}-01-01T00:00:00'",
            f"{field} le datetime'{year}-12-31T23:59:59'",
        ]
    elif date_range.type == "last_year":
        year = _current_fiscal_year() - 1
        filters = [
            f"{field} ge datetime'{year}-01-01T00:00:00'",
            f"{field} le datetime'{year}-12-31T23:59:59'",
        ]
    elif date_range.type == "ytd":
        year = today.year
        filters = [
            f"{field} ge datetime'{year}-01-01T00:00:00'",
            f"{field} le datetime'{today.isoformat()}T23:59:59'",
        ]
    elif date_range.type == "current_month":
        first = today.replace(day=1)
        filters = [
            f"{field} ge datetime'{first.isoformat()}T00:00:00'",
            f"{field} le datetime'{today.isoformat()}T23:59:59'",
        ]
    elif date_range.type == "last_n_days" and date_range.n_days:
        from_date = today - relativedelta(days=date_range.n_days)
        filters = [
            f"{field} ge datetime'{from_date.isoformat()}T00:00:00'",
            f"{field} le datetime'{today.isoformat()}T23:59:59'",
        ]
    elif date_range.type == "custom" and date_range.from_date:
        filters = [f"{field} ge datetime'{date_range.from_date}T00:00:00'"]
        if date_range.to_date:
            filters.append(f"{field} le datetime'{date_range.to_date}T23:59:59'")

    return filters


def build_odata_params(
    intent: AnalyticsIntent,
    config: CDSViewConfig,
) -> dict[str, Any]:
    """Return a dict of OData query parameters derived from the intent."""
    filters: list[str] = []
    select_fields: list[str] = list(config.default_select)

    # ── Date filters ────────────────────────────────────────────
    if intent.date_range and config.date_fields:
        primary_date_field = config.date_fields[0]
        filters.extend(_build_date_filter(primary_date_field, intent.date_range))

    # ── Explicit user filters ────────────────────────────────────
    for field, value in intent.filters.items():
        if isinstance(value, list):
            or_parts = [f"{field} eq '{v}'" for v in value]
            filters.append("(" + " or ".join(or_parts) + ")")
        elif isinstance(value, bool):
            filters.append(f"{field} eq {str(value).lower()}")
        else:
            filters.append(f"{field} eq '{value}'")

    # ── Select dimensions + measures ────────────────────────────
    for dim in intent.dimensions:
        if dim in config.dimension_fields and dim not in select_fields:
            select_fields.append(dim)
    for measure in config.measure_fields:
        if measure not in select_fields:
            select_fields.append(measure)

    # ── $orderby ─────────────────────────────────────────────────
    orderby: Optional[str] = None
    if config.measure_fields:
        direction = "desc" if intent.sort_direction == "desc" else "asc"
        orderby = f"{config.measure_fields[0]} {direction}"

    # ── Top N ────────────────────────────────────────────────────
    top = 1000
    if intent.ranking:
        # Over-fetch by 10x to allow client-side aggregation before ranking
        top = intent.ranking * 10

    # ── OData $apply (server-side aggregation if supported) ──────
    apply: Optional[str] = None
    if intent.dimensions and config.measure_fields:
        group_dims = [d for d in intent.dimensions if d in config.dimension_fields]
        if group_dims:
            agg_clauses = ",".join(
                f"{m} with {intent.aggregation} as {m}"
                for m in config.measure_fields
            )
            apply = f"groupby(({','.join(group_dims)}),aggregate({agg_clauses}))"

    return {
        "filters": filters if filters else None,
        "select": select_fields,
        "orderby": orderby,
        "top": top,
        "apply": apply,
    }


def get_configs_for_intent(intent: AnalyticsIntent) -> list[CDSViewConfig]:
    configs = get_cds_for_intent(intent.intent_id)
    if not configs:
        log.warning("no_cds_for_intent", intent_id=intent.intent_id)
    return configs
