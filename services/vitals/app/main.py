import random
from datetime import datetime, timezone
from typing import Dict, List

from fastapi import FastAPI, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, BaseSettings, Field


class Settings(BaseSettings):
    mongo_url: str = "mongodb://mongo:27017"
    mongo_db: str = "sentinelcare"


settings = Settings()
client = AsyncIOMotorClient(settings.mongo_url)
db = client[settings.mongo_db]
vitals_col = db["vitals"]


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


app = FastAPI(title="Vitals Service", version="0.1.0")


@app.on_event("startup")
async def init_db():
    await vitals_col.create_index([("patient_id", 1), ("recorded_at", -1)])


def _base_vitals_for_risk(risk: str) -> Dict[str, float]:
    if risk == "high":
        return {
            "heart_rate": random.randint(120, 140),
            "respiratory_rate": random.randint(24, 30),
            "systolic_bp": random.randint(90, 105),
            "diastolic_bp": random.randint(50, 65),
            "spo2": random.randint(88, 95),
            "temperature_c": round(random.uniform(38.0, 39.5), 1),
        }
    if risk == "moderate":
        return {
            "heart_rate": random.randint(95, 115),
            "respiratory_rate": random.randint(18, 24),
            "systolic_bp": random.randint(105, 120),
            "diastolic_bp": random.randint(65, 80),
            "spo2": random.randint(94, 98),
            "temperature_c": round(random.uniform(37.2, 38.2), 1),
        }
    return {
        "heart_rate": random.randint(70, 95),
        "respiratory_rate": random.randint(14, 18),
        "systolic_bp": random.randint(115, 130),
        "diastolic_bp": random.randint(70, 85),
        "spo2": random.randint(96, 100),
        "temperature_c": round(random.uniform(36.5, 37.2), 1),
    }


def _doc_to_vitals(doc: dict) -> VitalsPayload:
    if "_id" in doc:
        doc.pop("_id")
    return VitalsPayload(**doc)


@app.get("/vitals/{patient_id}", response_model=List[VitalsPayload])
async def list_vitals(patient_id: str) -> List[VitalsPayload]:
    cursor = vitals_col.find({"patient_id": patient_id}).sort("recorded_at", -1)
    return [_doc_to_vitals(doc) async for doc in cursor]


@app.get("/vitals/{patient_id}/latest", response_model=VitalsPayload)
async def latest_vitals(patient_id: str) -> VitalsPayload:
    doc = await vitals_col.find_one({"patient_id": patient_id}, sort=[("recorded_at", -1)])
    if not doc:
        raise HTTPException(status_code=404, detail="No vitals for patient")
    return _doc_to_vitals(doc)


@app.post("/vitals", response_model=VitalsPayload, status_code=status.HTTP_201_CREATED)
async def ingest_vitals(payload: VitalsPayload) -> VitalsPayload:
    await vitals_col.insert_one(payload.dict())
    return payload


@app.post("/vitals/generate", response_model=VitalsPayload)
async def generate_vitals(
    patient_id: str = Query(...),
    risk: str = Query("normal"),
    device_id: str | None = Query(None),
) -> VitalsPayload:
    base = _base_vitals_for_risk(risk)
    payload = VitalsPayload(patient_id=patient_id, device_id=device_id, **base)
    await vitals_col.insert_one(payload.dict())
    return payload


@app.get("/health")
async def health():
    return {"status": "ok"}
