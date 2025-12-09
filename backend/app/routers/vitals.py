import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..core.auth import get_current_subject
from ..core.config import get_settings
from ..models.domain import VitalsPayload

router = APIRouter(prefix="/vitals", tags=["vitals"])


@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def ingest_vitals(
    vitals: VitalsPayload, subject: str = Depends(get_current_subject)
) -> dict:
    settings = get_settings()
    if not vitals.patient_id:
        raise HTTPException(status_code=422, detail="patient_id is required")
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.vitals_service_url}/vitals", json=vitals.dict()
        )
    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


@router.post("/generate", response_model=VitalsPayload)
async def generate_vitals(
    patient_id: str = Query(...),
    risk: str = Query("normal"),
    subject: str = Depends(get_current_subject),
) -> VitalsPayload:
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.vitals_service_url}/vitals/generate",
            params={"patient_id": patient_id, "risk": risk, "device_id": subject},
        )
    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return VitalsPayload(**resp.json())
