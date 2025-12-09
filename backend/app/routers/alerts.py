import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from ..core.auth import get_current_subject
from ..core.config import get_settings
from ..models.domain import Alert, AlertAck

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[Alert])
async def list_alerts(subject: str = Depends(get_current_subject)) -> list[Alert]:
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        alerts_resp = await client.get(f"{settings.alerts_service_url}/alerts")
        patients_resp = await client.get(f"{settings.patients_service_url}/patients")

    if alerts_resp.status_code >= 400:
        raise HTTPException(status_code=alerts_resp.status_code, detail=alerts_resp.text)

    patient_map: dict[str, str] = {}
    if patients_resp.status_code < 400:
        patient_map = {p["id"]: p["name"] for p in patients_resp.json()}

    alerts = []
    for item in alerts_resp.json():
        patient_name = patient_map.get(item.get("patient_id"))
        alerts.append(Alert(**{**item, "patient_name": patient_name}))

    return alerts


@router.post("/ack", status_code=status.HTTP_202_ACCEPTED, response_model=AlertAck)
async def acknowledge_alert(
    ack: AlertAck, subject: str = Depends(get_current_subject)
) -> AlertAck:
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{settings.alerts_service_url}/alerts/ack", json=ack.dict())
    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return AlertAck(**resp.json())
