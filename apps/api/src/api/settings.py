from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache
from os import getenv


def _parse_cors_origins(value: str | None, environment: str) -> list[str]:
    """Parse CORS origins from comma-separated string or default based on environment."""
    if value:
        return [origin.strip() for origin in value.split(",") if origin.strip()]
    # Default based on environment
    if environment == "production":
        return []  # Require explicit configuration in production
    return ["*"]  # Allow all in development


@dataclass(slots=True)
class Settings:
    app_name: str = "Poly Myanmar GC API"
    app_version: str = "0.1.0"
    environment: str = "production"
    cors_origins: list[str] = field(default_factory=list)
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""
    telegram_bot_token: str = ""
    telegram_review_chat_id: str = ""
    store_backend: str = "memory"

    def validate_required_credentials(self) -> None:
        if self.store_backend != "supabase":
            return
        required_credentials = {
            "SUPABASE_URL": self.supabase_url,
            "SUPABASE_ANON_KEY": self.supabase_anon_key,
            "SUPABASE_SERVICE_ROLE_KEY": self.supabase_service_role_key,
            "SUPABASE_JWT_SECRET": self.supabase_jwt_secret,
            "TELEGRAM_BOT_TOKEN": self.telegram_bot_token,
            "TELEGRAM_REVIEW_CHAT_ID": self.telegram_review_chat_id,
        }
        missing_credentials = [
            name for name, value in required_credentials.items() if not value or not value.strip()
        ]
        if missing_credentials:
            missing_joined = ", ".join(sorted(missing_credentials))
            raise RuntimeError(
                f"Missing required API environment credentials: {missing_joined}. "
                "Set them before starting the backend."
            )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    environment = getenv("ENVIRONMENT", "production")
    settings = Settings(
        environment=environment,
        cors_origins=_parse_cors_origins(getenv("CORS_ORIGINS"), environment),
        supabase_url=getenv("SUPABASE_URL", ""),
        supabase_anon_key=getenv("SUPABASE_ANON_KEY", ""),
        supabase_service_role_key=getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        supabase_jwt_secret=getenv("SUPABASE_JWT_SECRET", ""),
        telegram_bot_token=getenv("TELEGRAM_BOT_TOKEN", ""),
        telegram_review_chat_id=getenv("TELEGRAM_REVIEW_CHAT_ID", ""),
        store_backend=getenv("STORE_BACKEND", "memory"),
    )
    settings.validate_required_credentials()
    return settings
