import time
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, BaseSettings, Field


class Settings(BaseSettings):
    auth_secret: str = Field("super-secret-demo-key", env="AUTH_SECRET")
    issuer: str = Field("sentinelcare-auth", env="AUTH_ISSUER")
    audience: str = Field("sentinelcare-clients", env="AUTH_AUDIENCE")
    token_exp_minutes: int = Field(60, env="AUTH_TOKEN_EXP_MIN")


settings = Settings()
# Use pbkdf2_sha256 to avoid bcrypt backend quirks in minimal containers.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


class User(BaseModel):
    username: str
    full_name: str
    role: str
    hashed_password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    role: str


seed_users: List[User] = [
    User(
        username="admin@sentinel.care",
        full_name="Admin User",
        role="admin",
        hashed_password=pwd_context.hash("admin123"),
    ),
    User(
        username="dr.jane@sentinel.care",
        full_name="Dr. Jane Miller",
        role="doctor",
        hashed_password=pwd_context.hash("doctor123"),
    ),
    User(
        username="nurse.sam@sentinel.care",
        full_name="Nurse Sam",
        role="nurse",
        hashed_password=pwd_context.hash("nurse123"),
    ),
    User(
        username="ops@sentinel.care",
        full_name="Ops Engineer",
        role="ops",
        hashed_password=pwd_context.hash("ops123"),
    ),
]

users_by_username = {u.username: u for u in seed_users}

app = FastAPI(title="Auth Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def authenticate_user(username: str, password: str) -> Optional[User]:
    user = users_by_username.get(username)
    if not user:
        return None
    if not pwd_context.verify(password, user.hashed_password):
        return None
    return user


def create_access_token(username: str, role: str) -> Token:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.token_exp_minutes)
    payload = {
        "sub": username,
        "role": role,
        "iss": settings.issuer,
        "aud": settings.audience,
        "iat": int(time.time()),
        "exp": expire,
    }
    encoded = jwt.encode(payload, settings.auth_secret, algorithm="HS256")
    return Token(access_token=encoded, expires_at=expire, role=role)


@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()) -> Token:
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return create_access_token(user.username, user.role)


class VerifyResponse(BaseModel):
    subject: str
    role: str
    expires_at: datetime


@app.get("/verify", response_model=VerifyResponse)
async def verify_token(token: str) -> VerifyResponse:
    try:
        payload = jwt.decode(
            token,
            settings.auth_secret,
            algorithms=["HS256"],
            issuer=settings.issuer,
            audience=settings.audience,
        )
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))
    return VerifyResponse(
        subject=payload.get("sub"), role=payload.get("role"), expires_at=datetime.fromtimestamp(payload["exp"])
    )
