import asyncio
import json
import os
from datetime import datetime

import httpx

API_BASE = os.getenv("API_BASE", "http://localhost:8000")
TOKEN = os.getenv("TOKEN", "demo-token")


async def send_vitals(client, payload):
    resp = await client.post(
        f"{API_BASE}/vitals",
        headers={"Authorization": f"Bearer {TOKEN}"},
        json=payload,
    )
    resp.raise_for_status()
    return await resp.json()


async def main():
    payloads = []
    base = {
        "patient_id": "demo-patient",
        "heart_rate": 118,
        "respiratory_rate": 24,
        "systolic_bp": 95,
        "diastolic_bp": 60,
        "spo2": 93,
        "temperature_c": 38.2,
    }
    for i in range(5):
        p = base.copy()
        p["recorded_at"] = datetime.utcnow().isoformat()
        p["device_id"] = f"demo-device-{i}"
        payloads.append(p)

    async with httpx.AsyncClient(timeout=5) as client:
        for p in payloads:
            resp = await send_vitals(client, p)
            print(json.dumps(resp))


if __name__ == "__main__":
    asyncio.run(main())
