import httpx
from fastapi import APIRouter, Depends, HTTPException

from ..core.auth import get_current_subject
from ..core.config import get_settings
from ..models.domain import RiskScoreResult, VitalsPayload

router = APIRouter(prefix="/scoring", tags=["scoring"])


@router.post("/risk", response_model=RiskScoreResult)
async def score_vitals(
    vitals: VitalsPayload, subject: str = Depends(get_current_subject)
) -> RiskScoreResult:
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.scoring_service_url}/score", json=vitals.dict()
        )
    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return RiskScoreResult(**resp.json())
