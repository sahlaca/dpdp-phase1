from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health, questionnaire, reports, sources
from app.config import settings

app = FastAPI(
    title="DPDP Compliance Guidance API",
    description="Phase 1: questionnaire intake, obligation scoring, and gap report generation.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(questionnaire.router, prefix="/api/v1", tags=["questionnaire"])
app.include_router(reports.router, prefix="/api/v1", tags=["reports"])
app.include_router(sources.router, prefix="/api/v1", tags=["sources"])
