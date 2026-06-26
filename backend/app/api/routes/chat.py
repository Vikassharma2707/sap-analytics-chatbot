from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional, Any
from uuid import UUID
import structlog

from app.services.ai.orchestrator import run_pipeline
from app.services.export.exporter import export_excel, export_pptx, export_pdf
from app.middleware.audit import log_audit_event
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

log = structlog.get_logger()
router = APIRouter(prefix="/chat", tags=["Chat"])


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: Optional[str] = None
    drill_context: Optional[dict] = None


class ExportRequest(BaseModel):
    format: str = Field(..., pattern="^(excel|pdf|pptx)$")
    title: str = "SAP Analytics Export"
    records: list[dict] = []
    kpis: dict[str, Any] = {}
    insights: dict[str, Any] = {}


@router.post("/message")
async def send_message(
    request: ChatRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Process a user chat message through the full AI pipeline."""
    try:
        # In production, load conversation_history from DB by conversation_id
        result = await run_pipeline(
            user_message=request.message,
            conversation_history=[],
            drill_context=request.drill_context,
        )

        background_tasks.add_task(
            log_audit_event,
            action="chat_message",
            details={
                "message_preview": request.message[:100],
                "intent": result.get("intent", {}).get("intent_id") if result.get("intent") else None,
                "cds_views": result.get("cds_views_used"),
            },
        )

        return {
            "success": True,
            "conversation_id": request.conversation_id or "new",
            "result": result,
        }
    except Exception as exc:
        log.error("chat_message_error", error=str(exc))
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/export")
async def export_data(request: ExportRequest):
    """Export analytics data to Excel, PDF, or PowerPoint."""
    try:
        if request.format == "excel":
            path = export_excel(request.records, request.kpis, request.title)
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            filename = "analytics.xlsx"
        elif request.format == "pptx":
            path = export_pptx(request.title, request.insights, request.kpis, request.records)
            media_type = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            filename = "analytics.pptx"
        elif request.format == "pdf":
            path = export_pdf(request.title, request.insights, request.kpis, request.records)
            media_type = "application/pdf"
            filename = "analytics.pdf"
        else:
            raise HTTPException(status_code=400, detail="Unsupported format")

        return FileResponse(path, media_type=media_type, filename=filename)
    except Exception as exc:
        log.error("export_error", error=str(exc))
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/suggestions")
async def get_suggestions():
    """Return suggested starter prompts for the chat UI."""
    return {
        "suggestions": [
            {"category": "Sales", "icon": "trending_up", "prompts": [
                "Show top 10 customers by revenue this year",
                "Compare sales this year vs last year",
                "Show monthly sales trend",
                "Which region generated highest sales?",
            ]},
            {"category": "Finance", "icon": "account_balance", "prompts": [
                "Show open vendor invoices",
                "Vendor ageing analysis",
                "Revenue by company code",
                "Cost center expenditure",
            ]},
            {"category": "Procurement", "icon": "shopping_cart", "prompts": [
                "Purchase orders pending approval",
                "Spend by vendor this quarter",
                "Show purchase trend",
            ]},
            {"category": "Inventory", "icon": "inventory_2", "prompts": [
                "Current stock levels",
                "Slow moving items",
                "Stock valuation by plant",
            ]},
            {"category": "Manufacturing", "icon": "factory", "prompts": [
                "Production orders this month",
                "Yield analysis by plant",
                "Cost variance analysis",
            ]},
        ]
    }
