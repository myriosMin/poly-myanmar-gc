def main() -> None:
    print("Hello from worker!")
from .main import main

__all__ = ["main"]
