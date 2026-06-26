"""
Analytics Engine — transforms raw SAP records into analytical datasets.
Performs aggregation, ranking, trend analysis, YoY/MoM comparisons,
ABC analysis, variance calculations, and moving averages using pandas.
"""

from __future__ import annotations
import pandas as pd
import numpy as np
from typing import Any, Optional
from datetime import date
import structlog

from app.services.ai.intent_engine import AnalyticsIntent

log = structlog.get_logger()


def _to_dataframe(records: list[dict]) -> pd.DataFrame:
    df = pd.DataFrame(records)
    if df.empty:
        return df
    # Strip OData metadata keys
    meta_cols = [c for c in df.columns if c.startswith("__")]
    df = df.drop(columns=meta_cols, errors="ignore")
    # Convert numeric strings
    for col in df.columns:
        try:
            df[col] = pd.to_numeric(df[col])
        except (ValueError, TypeError):
            pass
    return df


def aggregate(
    records: list[dict],
    dimensions: list[str],
    measures: list[str],
    agg_func: str = "sum",
    ranking: Optional[int] = None,
    sort_measure: Optional[str] = None,
    sort_ascending: bool = False,
) -> pd.DataFrame:
    df = _to_dataframe(records)
    if df.empty:
        return df

    # Keep only existing columns
    dims = [d for d in dimensions if d in df.columns]
    meas = [m for m in measures if m in df.columns]

    if not dims or not meas:
        return df

    agg_map = {m: agg_func for m in meas}
    result = df.groupby(dims, as_index=False).agg(agg_map)

    sort_col = sort_measure or meas[0]
    if sort_col in result.columns:
        result = result.sort_values(sort_col, ascending=sort_ascending)

    if ranking:
        result = result.head(ranking)

    return result


def trend_analysis(
    records: list[dict],
    date_col: str,
    measure_col: str,
    freq: str = "M",   # M=month, Q=quarter, W=week, Y=year
) -> pd.DataFrame:
    df = _to_dataframe(records)
    if df.empty or date_col not in df.columns or measure_col not in df.columns:
        return df

    df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
    df = df.dropna(subset=[date_col])
    df = df.set_index(date_col)
    result = df[[measure_col]].resample(freq).sum().reset_index()
    result.columns = ["period", "value"]

    if len(result) >= 2:
        result["growth_pct"] = result["value"].pct_change() * 100
        result["moving_avg_3"] = result["value"].rolling(3, min_periods=1).mean()

    return result


def yoy_comparison(
    records_cy: list[dict],
    records_py: list[dict],
    dimensions: list[str],
    measure_col: str,
) -> pd.DataFrame:
    cy = aggregate(records_cy, dimensions, [measure_col])
    py = aggregate(records_py, dimensions, [measure_col])

    if cy.empty:
        return cy

    merged = cy.merge(py, on=dimensions, how="left", suffixes=("_cy", "_py"))
    cy_col = f"{measure_col}_cy"
    py_col = f"{measure_col}_py"
    if cy_col in merged.columns and py_col in merged.columns:
        merged["variance"] = merged[cy_col] - merged[py_col].fillna(0)
        merged["variance_pct"] = np.where(
            merged[py_col].fillna(0) != 0,
            (merged["variance"] / merged[py_col].abs()) * 100,
            np.nan,
        )
    return merged


def abc_analysis(df: pd.DataFrame, value_col: str, key_col: str) -> pd.DataFrame:
    if df.empty or value_col not in df.columns:
        return df
    result = df.sort_values(value_col, ascending=False).copy()
    result["cumulative_pct"] = result[value_col].cumsum() / result[value_col].sum() * 100
    result["abc_class"] = pd.cut(
        result["cumulative_pct"], bins=[0, 80, 95, 100], labels=["A", "B", "C"]
    )
    return result


def pareto_analysis(df: pd.DataFrame, value_col: str, label_col: str, top_n: int = 10):
    if df.empty:
        return {}
    top = df.nlargest(top_n, value_col)
    total = df[value_col].sum()
    top_total = top[value_col].sum()
    return {
        "top_n": top_n,
        "top_n_share_pct": round(top_total / total * 100, 1) if total else 0,
        "labels": top[label_col].tolist(),
        "values": top[value_col].tolist(),
    }


def ageing_buckets(
    df: pd.DataFrame,
    date_col: str,
    value_col: str,
    reference_date: Optional[date] = None,
) -> pd.DataFrame:
    if df.empty or date_col not in df.columns:
        return df
    ref = pd.Timestamp(reference_date or date.today())
    df = df.copy()
    df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
    df["days_outstanding"] = (ref - df[date_col]).dt.days
    bins = [0, 30, 60, 90, 180, float("inf")]
    labels = ["0-30", "31-60", "61-90", "91-180", "180+"]
    df["ageing_bucket"] = pd.cut(df["days_outstanding"], bins=bins, labels=labels)
    summary = (
        df.groupby("ageing_bucket", observed=True)[value_col]
        .agg(["sum", "count"])
        .reset_index()
    )
    summary.columns = ["bucket", "total_amount", "count"]
    return summary


def kpi_summary(df: pd.DataFrame, measure_cols: list[str]) -> dict[str, Any]:
    kpis: dict[str, Any] = {}
    for col in measure_cols:
        if col in df.columns:
            series = df[col].dropna()
            kpis[col] = {
                "total": float(series.sum()),
                "average": float(series.mean()),
                "max": float(series.max()),
                "min": float(series.min()),
                "count": int(series.count()),
            }
    return kpis


def df_to_records(df: pd.DataFrame) -> list[dict]:
    return df.where(pd.notnull(df), None).to_dict(orient="records")
