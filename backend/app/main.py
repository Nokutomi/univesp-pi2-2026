from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS
from .database import Base, engine
from .routers import auth, dashboard, education, finance, goals

app = FastAPI(
    title="Educação Financeira – API",
    description="Protótipo do Projeto Integrador II (Univesp) para estímulo à educação financeira.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

for module in (auth, dashboard, finance, goals, education):
    app.include_router(module.router)


@app.get("/health", tags=["infra"])
def health():
    return {"status": "ok"}
