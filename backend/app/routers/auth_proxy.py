import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..core.config import get_settings


class LoginRequest(BaseModel):
    username: str
    password: str


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(req: LoginRequest):
    settings = get_settings()
    data = {"username": req.username, "password": req.password}
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{settings.auth_service_url}/token", data=data)
    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()
