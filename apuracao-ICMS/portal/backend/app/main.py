"""Backend FastAPI do portal de apuracao de ICMS.

Executar: uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.routers import competencias, empresas, inputs, pendencias, portfolio

app = FastAPI(
    title="Portal de Apuracao de ICMS - API",
    description=(
        "Leitura dos relatorios do motor fiscal + camada operacional "
        "(status/gates/pendencias) + upload/processamento de inputs."
    ),
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(empresas.router)
app.include_router(competencias.router)
app.include_router(inputs.router)
app.include_router(pendencias.router)
app.include_router(portfolio.router)


@app.get("/api/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}
