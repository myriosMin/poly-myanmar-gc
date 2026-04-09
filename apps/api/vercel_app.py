from __future__ import annotations

import sys
from pathlib import Path

# Vercel executes this file as the function entrypoint.
# Add src/ to import the existing FastAPI app factory module.
SRC_DIR = Path(__file__).resolve().parent / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from api.main import app  # noqa: E402,F401
