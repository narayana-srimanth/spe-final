import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder

from ..core.audit import send_audit_event
from ..core.auth import get_current_role, get_current_subject
from ..core.config import get_settings
from ..models.domain import Alert, RiskScoreResult, SimulationResult, VitalsPayload

router = APIRouter(prefix="/simulate", tags=["simulate"])


def evaluate_abnormal_vitals(v: VitalsPayload) -> tuple[str | None, list[str]]:
    issues: list[str] = []
    severity: str | None = None

    if v.heart_rate < 50 or v.heart_rate > 110:
        issues.append(f"HR {v.heart_rate}")
    if v.respiratory_rate < 10 or v.respiratory_rate > 24:
        issues.append(f"RR {v.respiratory_rate}")
    if v.systolic_bp < 90 or v.systolic_bp > 160:
        issues.append(f"Systolic {v.systolic_bp}")
    if v.diastolic_bp < 50 or v.diastolic_bp > 100:
        issues.append(f"Diastolic {v.diastolic_bp}")
    if v.spo2 < 94:
        issues.append(f"SpO2 {v.spo2}%")
    if v.temperature_c < 35.5 or v.temperature_c > 38.5:
        issues.append(f"Temp {v.temperature_c}°C")

    if issues:
        # High if very low perfusion/oxygenation or multiple deviations
        high_conditions = (
            v.spo2 < 90
            or v.systolic_bp < 80
            or v.temperature_c > 39.5
            or len(issues) >= 3
        )
        severity = "high" if high_conditions else "moderate"

    return severity, issues


@router.post("/run", response_model=SimulationResult)
async def simulate_vitals_and_score(
    patient_id: str = Query(...),
    risk: str = Query("normal"),
    subject: str = Depends(get_current_subject),
    role: str = Depends(get_current_role),
) -> SimulationResult:
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        vitals_resp = await client.post(
            f"{settings.vitals_service_url}/vitals/generate",
            params={"patient_id": patient_id, "risk": risk, "device_id": subject},
        )
        if vitals_resp.status_code >= 400:
            raise HTTPException(
                status_code=vitals_resp.status_code, detail=vitals_resp.text
            )
        vitals = VitalsPayload(**vitals_resp.json())

        score_resp = await client.post(
            f"{settings.scoring_service_url}/score", json=jsonable_encoder(vitals)
        )
        if score_resp.status_code >= 400:
            raise HTTPException(
                status_code=score_resp.status_code, detail=score_resp.text
            )
        score = RiskScoreResult(**score_resp.json())

        alert_obj: Alert | None = None
        severity_from_model = "high" if score.risk_label == "high" else None
        severity_from_vitals, vitals_issues = evaluate_abnormal_vitals(vitals)

        chosen_severity = severity_from_model or severity_from_vitals
        reasons: list[str] = []
        if severity_from_model:
            reasons.append("Model risk flagged high")
        if vitals_issues:
            reasons.append("Abnormal vitals: " + ", ".join(vitals_issues))

        if chosen_severity and reasons:
            alert_payload = {
                "patient_id": patient_id,
                "severity": chosen_severity,
                "message": " | ".join(reasons),
            }
            alert_resp = await client.post(
                f"{settings.alerts_service_url}/alerts",
                json=alert_payload,
            )
            if alert_resp.status_code < 400:
                alert_obj = Alert(**alert_resp.json())

        result = SimulationResult(vitals=vitals, score=score, alert=alert_obj)

        await send_audit_event(
            action="simulate_run",
            subject=subject,
            actor_role=role,
            detail=f"patient={patient_id}; severity={chosen_severity or 'none'}",
        )

        return result
