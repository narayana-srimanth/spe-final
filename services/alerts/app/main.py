from datetime import datetime, timedelta, timezone
from typing import List
from uuid import uuid4

from fastapi import FastAPI, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, BaseSettings, Field


class Settings(BaseSettings):
    mongo_url: str = "mongodb://mongo:27017"
    mongo_db: str = "sentinelcare"


settings = Settings()
client = AsyncIOMotorClient(settings.mongo_url)
db = client[settings.mongo_db]
alerts_col = db["alerts"]


class Alert(BaseModel):
    alert_id: str = Field(default_factory=lambda: str(uuid4()))
    patient_id: str
    severity: str
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AlertAck(BaseModel):
    alert_id: str
    acknowledged_by: str
    acknowledged_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


app = FastAPI(title="Alerts Service", version="0.1.0")


@app.on_event("startup")
async def init_db():
    await alerts_col.create_index("alert_id", unique=True)
    if await alerts_col.estimated_document_count() == 0:
        seed = [
            Alert(
                alert_id=str(uuid4()),
                patient_id="p1",
                severity="high",
                message="High sepsis risk detected",
                created_at=datetime.now(timezone.utc) - timedelta(minutes=2),
            ),
            Alert(
                alert_id=str(uuid4()),
                patient_id="p2",
                severity="moderate",
                message="Elevated heart rate trending upward",
                created_at=datetime.now(timezone.utc) - timedelta(minutes=5),
            ),
        ]
        await alerts_col.insert_many([{**a.dict(), "_id": a.alert_id} for a in seed])


def _doc_to_alert(doc: dict) -> Alert:
    if "_id" in doc:
        doc.pop("_id")
    return Alert(**doc)


@app.get("/alerts", response_model=List[Alert])
async def list_alerts() -> List[Alert]:
    cursor = alerts_col.find({}).sort("created_at", -1)
    return [_doc_to_alert(doc) async for doc in cursor]


@app.post("/alerts", response_model=Alert, status_code=status.HTTP_201_CREATED)
async def create_alert(alert: Alert) -> Alert:
    await alerts_col.insert_one({**alert.dict(), "_id": alert.alert_id})
    return alert


@app.post("/alerts/ack", response_model=AlertAck, status_code=status.HTTP_202_ACCEPTED)
async def acknowledge_alert(ack: AlertAck) -> AlertAck:
    doc = await alerts_col.find_one({"alert_id": ack.alert_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Alert not found")
    return ack


@app.get("/health")
async def health():
    return {"status": "ok"}
