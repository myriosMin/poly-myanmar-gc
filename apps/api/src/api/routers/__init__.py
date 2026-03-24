from .admin import router as admin_router
from .collab import router as collab_router
from .events import router as events_router
from .health import router as health_router
from .me import router as me_router
from .profiles import router as profiles_router
from .resources import router as resources_router
from .telegram import router as telegram_router

__all__ = [
    "admin_router",
    "collab_router",
    "events_router",
    "health_router",
    "me_router",
    "profiles_router",
    "resources_router",
    "telegram_router",
]
