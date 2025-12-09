import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from ..core.audit import send_audit_event
from ..core.auth import get_current_role, get_current_subject
from ..core.config import get_settings
from ..models.domain import Patient, PatientCreate

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("", response_model=list[Patient])
async def list_patients(
    subject: str = Depends(get_current_subject),
    role: str = Depends(get_current_role),
) -> list[Patient]:
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{settings.patients_service_url}/patients")
    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    patients = [Patient(**p) for p in resp.json()]
    if role == "doctor":
        patients = [p for p in patients if (p.assigned_to == subject or p.assigned_to is None)]
    return patients


@router.post("", response_model=Patient, status_code=status.HTTP_201_CREATED)
async def create_patient(
    payload: PatientCreate,
    subject: str = Depends(get_current_subject),
    role: str = Depends(get_current_role),
) -> Patient:
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.patients_service_url}/patients", json=payload.dict(by_alias=True)
        )
    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    created = Patient(**resp.json())
    await send_audit_event(
        action="patient_created",
        subject=subject,
        actor_role=role,
        detail=f"Created patient {created.id}",
    )
    return created


@router.patch("/{patient_id}/monitor", response_model=Patient)
async def update_patient_monitoring(
    patient_id: str, isMonitoring: bool, subject: str = Depends(get_current_subject)
) -> Patient:
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"{settings.patients_service_url}/patients/{patient_id}/monitor",
            json={"isMonitoring": isMonitoring},
        )
    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return Patient(**resp.json())
