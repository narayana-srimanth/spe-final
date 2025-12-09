import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

from ..core.auth import get_current_subject
from ..core.config import get_settings

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=list[dict])
async def list_events(limit: int = Query(default=100), subject: str = Depends(get_current_subject)):
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{settings.audit_service_url}/audit", params={"limit": limit})
    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()
