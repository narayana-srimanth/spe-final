from functools import lru_cache
from pathlib import Path

from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    app_name: str = Field("SentinelCare API", description="Service name")
    version: str = Field("0.1.0", description="API version")
    environment: str = Field("dev", description="Runtime environment")
    model_path: Path = Field(
        Path("models/mock_artifacts/sepsis_mock_model.json"),
        description="Path to packaged mock model artifact",
    )
    log_level: str = Field("INFO", description="Logging level")
    patients_service_url: str = Field(
        "http://patients:8101", description="Patients service base URL"
    )
    vitals_service_url: str = Field(
        "http://vitals:8102", description="Vitals service base URL"
    )
    alerts_service_url: str = Field(
        "http://alerts:8103", description="Alerts service base URL"
    )
    scoring_service_url: str = Field(
        "http://scoring:8104", description="Scoring service base URL"
    )
    tasks_service_url: str = Field(
        "http://tasks:8105", description="Tasks service base URL"
    )
    audit_service_url: str = Field(
        "http://audit:8106", description="Audit service base URL"
    )
    notify_service_url: str = Field(
        "http://notifications:8107", description="Notification service base URL"
    )
    auth_issuer: str = Field("sentinelcare-auth", description="Auth issuer")
    auth_audience: str = Field("sentinelcare-clients", description="Auth audience")
    auth_secret: str = Field("super-secret-demo-key", description="HS256 signing secret")
    auth_service_url: str = Field("http://auth:8100", description="Auth service base URL")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

    def ensure_model_exists(self) -> None:
        if not self.model_path.exists():
            raise FileNotFoundError(
                f"Expected mock model artifact at {self.model_path}, but it was not found."
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()
