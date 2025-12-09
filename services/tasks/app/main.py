from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, BaseSettings, Field


class Settings(BaseSettings):
    mongo_url: str = "mongodb://mongo:27017"
    mongo_db: str = "sentinelcare"


settings = Settings()
client = AsyncIOMotorClient(settings.mongo_url)
db = client[settings.mongo_db]
tasks_col = db["tasks"]


class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    patient_id: str
    title: str
    status: str = Field(default="open")
    priority: str = Field(default="medium")
    assigned_to: Optional[str] = None
    due_at: Optional[datetime] = None
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TaskCreate(BaseModel):
    patient_id: str
    title: str
    priority: str = "medium"
    assigned_to: Optional[str] = None
    due_at: Optional[datetime] = None
    created_by: Optional[str] = None


class TaskUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    due_at: Optional[datetime] = None


app = FastAPI(title="Tasks Service", version="0.1.0")


@app.on_event("startup")
async def init_db():
    await tasks_col.create_index("id", unique=True)
    if await tasks_col.estimated_document_count() == 0:
        seed = [
            Task(
                id="t1",
                patient_id="p1",
                title="Order lactate and blood cultures",
                status="open",
                priority="high",
                assigned_to="dr.jane@sentinel.care",
                due_at=datetime.now(timezone.utc) + timedelta(hours=2),
            ),
            Task(
                id="t2",
                patient_id="p2",
                title="Recheck vitals and SPO2 probe fit",
                status="in_progress",
                priority="medium",
                assigned_to="nurse.sam@sentinel.care",
                due_at=datetime.now(timezone.utc) + timedelta(hours=4),
            ),
        ]
        await tasks_col.insert_many([{**t.dict(), "_id": t.id} for t in seed])


def _doc_to_task(doc: dict) -> Task:
    if "_id" in doc:
        doc.pop("_id")
    return Task(**doc)


@app.get("/tasks", response_model=List[Task])
async def list_tasks(
    patient_id: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None),
) -> List[Task]:
    query: dict = {}
    if patient_id:
        query["patient_id"] = patient_id
    if status_filter:
        query["status"] = status_filter
    cursor = tasks_col.find(query).sort("created_at", -1)
    return [_doc_to_task(doc) async for doc in cursor]


@app.post("/tasks", response_model=Task, status_code=status.HTTP_201_CREATED)
async def create_task(payload: TaskCreate) -> Task:
    task = Task(**payload.dict())
    await tasks_col.insert_one({**task.dict(), "_id": task.id})
    return task


@app.patch("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, payload: TaskUpdate) -> Task:
    update_doc = {k: v for k, v in payload.dict().items() if v is not None}
    if not update_doc:
        raise HTTPException(status_code=400, detail="No updates provided")
    update_doc["updated_at"] = datetime.now(timezone.utc)
    res = await tasks_col.update_one({"id": task_id}, {"$set": update_doc})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    doc = await tasks_col.find_one({"id": task_id})
    return _doc_to_task(doc)


@app.get("/health")
async def health():
    return {"status": "ok"}
