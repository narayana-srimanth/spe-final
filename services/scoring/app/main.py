from datetime import datetime, timezone
from pathlib import Path
from typing import Dict

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


class VitalsPayload(BaseModel):
    patient_id: str
    heart_rate: float
    respiratory_rate: float
    systolic_bp: float
    diastolic_bp: float
    spo2: float
    temperature_c: float
    device_id: str | None = None
    recorded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RiskScoreResult(BaseModel):
    patient_id: str
    risk_score: float
    risk_label: str
    model_version: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MockRiskModel:
    def __init__(self, artifact_path: Path):
        import json

        data = json.loads(artifact_path.read_text())
        self.version = data.get("version", "unknown")
        self.intercept = float(data.get("intercept", 0.0))
        self.weights = {k: float(v) for k, v in data.get("weights", {}).items()}
        self.threshold = float(data.get("threshold", 0.5))

    def score(self, features: Dict[str, float]) -> tuple[float, str]:
        import math

        z = self.intercept
        for name, weight in self.weights.items():
            z += weight * float(features.get(name, 0.0))
        prob = 1 / (1 + math.exp(-z))
        label = "high" if prob >= self.threshold else "normal"
        return prob, label


artifact = Path(__file__).resolve().parents[1] / "models" / "mock_artifacts" / "sepsis_mock_model.json"
if not artifact.exists():
    raise RuntimeError(f"Missing model artifact at {artifact}")
model = MockRiskModel(artifact)

app = FastAPI(title="Scoring Service", version="0.1.0")


@app.post("/score", response_model=RiskScoreResult)
async def score(vitals: VitalsPayload) -> RiskScoreResult:
    score, label = model.score(vitals.dict())
    return RiskScoreResult(
        patient_id=vitals.patient_id,
        risk_score=score,
        risk_label=label,
        model_version=model.version,
    )
