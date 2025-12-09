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
patients_col = db["patients"]


class Patient(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    age: int
    location: str
    risk: str = Field(default="normal")
    is_monitoring: bool = Field(default=True, alias="isMonitoring")
    assigned_to: str | None = None
    notes: str | None = None

    class Config:
        allow_population_by_field_name = True


class PatientCreate(BaseModel):
    name: str
    age: int
    location: str
    risk: str = Field(default="normal")
    is_monitoring: bool = Field(default=True, alias="isMonitoring")
    assigned_to: str | None = None
    notes: str | None = None

    class Config:
        allow_population_by_field_name = True


class PatientMonitorUpdate(BaseModel):
    is_monitoring: bool = Field(alias="isMonitoring")

    class Config:
        allow_population_by_field_name = True


app = FastAPI(title="Patients Service", version="0.1.0")


@app.on_event("startup")
async def init_db():
    await patients_col.create_index("id", unique=True)
    if await patients_col.estimated_document_count() == 0:
        seed = [
            Patient(
                id="p1",
                name="Aditi Rao",
                age=42,
                location="ICU - Bed 3",
                risk="high",
                is_monitoring=True,
                assigned_to="dr.jane@sentinel.care",
            ),
            Patient(
                id="p2",
                name="John Carter",
                age=55,
                location="Ward - Bed 12",
                risk="moderate",
                is_monitoring=True,
                assigned_to="dr.jane@sentinel.care",
            ),
            Patient(
                id="p3",
                name="Sara Lee",
                age=37,
                location="ICU - Bed 5",
                risk="normal",
                is_monitoring=False,
            ),
        ]
        await patients_col.insert_many([{**p.dict(by_alias=False), "_id": p.id} for p in seed])


def _doc_to_patient(doc: dict) -> Patient:
    cleaned = {k: v for k, v in doc.items() if k != "_id"}
    return Patient(**cleaned)


@app.get("/patients", response_model=List[Patient])
async def list_patients() -> List[Patient]:
    cursor = patients_col.find({})
    return [_doc_to_patient(doc) async for doc in cursor]


@app.post("/patients", response_model=Patient, status_code=status.HTTP_201_CREATED)
async def create_patient(payload: PatientCreate) -> Patient:
    patient = Patient(**payload.dict())
    await patients_col.insert_one({**patient.dict(by_alias=False), "_id": patient.id})
    return patient


@app.get("/patients/{patient_id}", response_model=Patient)
async def get_patient(patient_id: str) -> Patient:
    doc = await patients_col.find_one({"id": patient_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")
    return _doc_to_patient(doc)


@app.patch("/patients/{patient_id}/monitor", response_model=Patient)
async def update_monitoring(patient_id: str, payload: PatientMonitorUpdate) -> Patient:
    res = await patients_col.update_one(
        {"id": patient_id}, {"$set": {"is_monitoring": payload.is_monitoring}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    doc = await patients_col.find_one({"id": patient_id})
    return _doc_to_patient(doc)
