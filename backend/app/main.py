from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import get_settings
from .routers import (
    alerts,
    audit,
    auth_proxy,
    health,
    notifications,
    patients,
    scoring,
    simulate,
    tasks,
    vitals,
)

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="SentinelCare edge-to-cloud risk scoring API (mock model)",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def ensure_model():
    settings.ensure_model_exists()


app.include_router(health.router)
app.include_router(auth_proxy.router)
app.include_router(audit.router)
app.include_router(patients.router)
app.include_router(vitals.router)
app.include_router(scoring.router)
app.include_router(alerts.router)
app.include_router(simulate.router)
app.include_router(tasks.router)
app.include_router(notifications.router)
