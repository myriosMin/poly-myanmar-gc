from fastapi import FastAPI


app = FastAPI(title="Poly Myanmar GC API")


@app.get("/healthz")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
