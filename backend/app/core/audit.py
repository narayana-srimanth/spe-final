import httpx
from loguru import logger

from .config import get_settings


async def send_audit_event(
    action: str,
    subject: str | None = None,
    actor_role: str | None = None,
    detail: str = "",
):
    settings = get_settings()
    if not settings.audit_service_url:
        return
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{settings.audit_service_url}/audit",
                json={
                    "action": action,
                    "subject": subject,
                    "actor_role": actor_role,
                    "detail": detail,
                },
                timeout=5,
            )
    except Exception as exc:  # best-effort; don't break main flow
        logger.debug(f"Audit send failed: {exc}")
