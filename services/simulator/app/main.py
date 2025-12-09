import asyncio
import os
import random
from typing import Any, Dict, List

import httpx
from fastapi import FastAPI, BackgroundTasks


APP_PORT = int(os.getenv("PORT", "8110"))
PATIENTS_URL = os.getenv("PATIENTS_SERVICE_URL", "http://patients:8101")
VITALS_URL = os.getenv("VITALS_SERVICE_URL", "http://vitals:8102")
SCORING_URL = os.getenv("SCORING_SERVICE_URL", "http://scoring:8104")
ALERTS_URL = os.getenv("ALERTS_SERVICE_URL", "http://alerts:8103")
INTERVAL = int(os.getenv("SIM_INTERVAL_SECONDS", "30"))


app = FastAPI(title="Simulator Service", version="0.1.0")


async def fetch_patients(client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    resp = await client.get(f"{PATIENTS_URL}/patients")
    resp.raise_for_status()
    return resp.json()


async def generate_for_patient(client: httpx.AsyncClient, patient: Dict[str, Any]) -> None:
    risk = patient.get("risk", "normal")
    pid = patient["id"]
    vitals_resp = await client.post(
        f"{VITALS_URL}/vitals/generate",
        params={"patient_id": pid, "risk": risk, "device_id": "simulator"},
    )
    vitals_resp.raise_for_status()
    vitals = vitals_resp.json()

    score_resp = await client.post(f"{SCORING_URL}/score", json=vitals)
    score_resp.raise_for_status()
    score = score_resp.json()

    if score.get("risk_label") == "high":
        await client.post(
            f"{ALERTS_URL}/alerts",
            json={
                "patient_id": pid,
                "severity": "high",
                "message": "High risk detected from simulated vitals",
            },
        )


async def run_cycle() -> None:
    timeout = httpx.Timeout(10.0, connect=5.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        patients = await fetch_patients(client)
        for p in patients:
            try:
                await generate_for_patient(client, p)
            except Exception:
                continue


async def loop_runner() -> None:
    await asyncio.sleep(5)
    while True:
        await run_cycle()
        await asyncio.sleep(INTERVAL + random.randint(-5, 5))


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(loop_runner())


@app.post("/trigger")
async def trigger(background_tasks: BackgroundTasks):
    background_tasks.add_task(run_cycle)
    return {"status": "queued"}


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=APP_PORT, reload=False)
