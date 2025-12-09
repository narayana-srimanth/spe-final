from datetime import datetime
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "sentinelcare-api"
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class Patient(BaseModel):
    id: str
    name: str
    age: int
    location: str
    risk: str
    is_monitoring: bool = Field(default=True, alias="isMonitoring")
    assigned_to: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        allow_population_by_field_name = True


class PatientCreate(BaseModel):
    name: str
    age: int
    location: str
    risk: str = "normal"
    is_monitoring: bool = Field(default=True, alias="isMonitoring")
    assigned_to: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        allow_population_by_field_name = True


class VitalsPayload(BaseModel):
    patient_id: str
    heart_rate: float
    respiratory_rate: float
    systolic_bp: float
    diastolic_bp: float
    spo2: float
    temperature_c: float
    device_id: Optional[str] = None
    recorded_at: datetime = Field(default_factory=datetime.utcnow)


class RiskScoreResult(BaseModel):
    patient_id: str
    risk_score: float
    risk_label: str
    model_version: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class Alert(BaseModel):
    alert_id: str = Field(default_factory=lambda: str(uuid4()))
    patient_id: str
    patient_name: Optional[str] = None
    severity: str
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AlertAck(BaseModel):
    alert_id: str
    acknowledged_by: str
    acknowledged_at: datetime = Field(default_factory=datetime.utcnow)


class SimulationResult(BaseModel):
    vitals: VitalsPayload
    score: RiskScoreResult
    alert: Optional[Alert] = None


class Task(BaseModel):
    id: str
    patient_id: str
    title: str
    status: str = "open"
    priority: str = "medium"
    assigned_to: Optional[str] = None
    due_at: Optional[datetime] = None
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class TaskCreate(BaseModel):
    patient_id: str
    title: str
    priority: str = "medium"
    assigned_to: Optional[str] = None
    due_at: Optional[datetime] = None


class TaskUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    due_at: Optional[datetime] = None
