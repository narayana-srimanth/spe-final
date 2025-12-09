from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, BaseSettings, Field


class Settings(BaseSettings):
    mongo_url: str = "mongodb://mongo:27017"
    mongo_db: str = "sentinelcare"


settings = Settings()
client = AsyncIOMotorClient(settings.mongo_url)
db = client[settings.mongo_db]
prefs_col = db["notification_prefs"]


class NotificationPrefs(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    subject: str
    email: Optional[str] = None
    sms: Optional[str] = None
    webhook_url: Optional[str] = None
    severity_threshold: str = "moderate"  # moderate/high
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class NotificationPrefsUpdate(BaseModel):
    email: Optional[str] = None
    sms: Optional[str] = None
    webhook_url: Optional[str] = None
    severity_threshold: Optional[str] = None


app = FastAPI(title="Notifications Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/notifications/prefs/{subject}", response_model=NotificationPrefs)
async def get_prefs(subject: str) -> NotificationPrefs:
    doc = await prefs_col.find_one({"subject": subject})
    if not doc:
        raise HTTPException(status_code=404, detail="Preferences not found")
    doc.pop("_id", None)
    return NotificationPrefs(**doc)


@app.post("/notifications/prefs", response_model=NotificationPrefs, status_code=status.HTTP_201_CREATED)
async def upsert_prefs(payload: NotificationPrefsUpdate, subject: str) -> NotificationPrefs:
    now = datetime.now(timezone.utc)
    existing = await prefs_col.find_one({"subject": subject})
    if existing:
        update_doc = {k: v for k, v in payload.dict().items() if v is not None}
        update_doc["updated_at"] = now
        await prefs_col.update_one({"subject": subject}, {"$set": update_doc})
        doc = await prefs_col.find_one({"subject": subject})
        doc.pop("_id", None)
        return NotificationPrefs(**doc)
    new = NotificationPrefs(subject=subject, **payload.dict())
    await prefs_col.insert_one({**new.dict(), "_id": new.id})
    return new


@app.get("/health")
async def health():
    return {"status": "ok"}
