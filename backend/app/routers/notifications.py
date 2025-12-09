import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..core.auth import get_current_subject
from ..core.config import get_settings


class NotificationPrefs(BaseModel):
    email: str | None = None
    sms: str | None = None
    webhook_url: str | None = None
    severity_threshold: str = "moderate"


router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/prefs", response_model=NotificationPrefs)
async def get_prefs(subject: str = Depends(get_current_subject)) -> NotificationPrefs:
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.notify_service_url}/notifications/prefs/{subject}"
        )
    if resp.status_code == 404:
        return NotificationPrefs()
    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    data = resp.json()
    return NotificationPrefs(**data)


@router.post("/prefs", response_model=NotificationPrefs)
async def upsert_prefs(
    payload: NotificationPrefs, subject: str = Depends(get_current_subject)
) -> NotificationPrefs:
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.notify_service_url}/notifications/prefs",
            params={"subject": subject},
            json=payload.dict(),
        )
    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return NotificationPrefs(**resp.json())
