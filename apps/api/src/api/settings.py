from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache
from os import getenv


@dataclass(slots=True)
class Settings:
    app_name: str = "Poly Myanmar GC API"
    app_version: str = "0.1.0"
    environment: str = "development"
    cors_origins: list[str] = field(default_factory=lambda: ["*"])
    default_actor_id: str = "11111111-1111-1111-1111-111111111111"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings(
        environment=getenv("ENVIRONMENT", "development"),
        default_actor_id=getenv("DEFAULT_ACTOR_ID", "11111111-1111-1111-1111-111111111111"),
    )
