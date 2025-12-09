from datetime import datetime, timezone
from typing import List, Optional
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
audit_col = db["audit_events"]


class AuditEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    action: str
    subject: Optional[str] = None
    actor_role: Optional[str] = None
    path: Optional[str] = None
    detail: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AuditCreate(BaseModel):
    action: str
    subject: Optional[str] = None
    actor_role: Optional[str] = None
    path: Optional[str] = None
    detail: Optional[str] = None


app = FastAPI(title="Audit Service", version="0.1.0")


@app.on_event("startup")
async def init_db():
    await audit_col.create_index("id", unique=True)
    await audit_col.create_index("created_at")


def _doc_to_event(doc: dict) -> AuditEvent:
    if "_id" in doc:
        doc.pop("_id")
    return AuditEvent(**doc)


@app.get("/audit", response_model=List[AuditEvent])
async def list_events(limit: int = 100) -> List[AuditEvent]:
    cursor = audit_col.find({}).sort("created_at", -1).limit(limit)
    return [_doc_to_event(doc) async for doc in cursor]


@app.post("/audit", response_model=AuditEvent, status_code=status.HTTP_201_CREATED)
async def create_event(payload: AuditCreate) -> AuditEvent:
    event = AuditEvent(**payload.dict())
    await audit_col.insert_one({**event.dict(), "_id": event.id})
    return event


@app.get("/health")
async def health():
    return {"status": "ok"}
