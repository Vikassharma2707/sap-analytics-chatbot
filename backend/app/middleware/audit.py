import structlog
from typing import Any

log = structlog.get_logger()


async def log_audit_event(
    action: str,
    details: dict[str, Any] | None = None,
    user_id: str | None = None,
    ip_address: str | None = None,
):
    log.info(
        "audit_event",
        action=action,
        user_id=user_id,
        ip=ip_address,
        details=details,
    )
